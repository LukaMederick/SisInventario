import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { exportarExcel, exportarPDF } from '@app/core/utils/export.util';
import { ReportePreviewDialogComponent } from './reporte-preview-dialog';
import {
  ReporteDataResult,
  queryStockAlmacen,
  queryEquiposEstado,
  queryEquiposAlmacen,
  queryMovimientos,
  queryMantenimientos,
  queryAsignaciones
} from './reportes.queries';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatDialogModule, MatSnackBarModule
  ],
  templateUrl: './reportes.html'
})
export class ReportesComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly almacenes = signal<{ value: number; label: string }[]>([]);
  readonly usuarios = signal<{ value: string; label: string }[]>([]);
  readonly proveedores = signal<{ value: number; label: string }[]>([]);

  // Filtros de reportes
  r1AlmacenId: number | null = null;
  r2AlmacenId: number | null = null;
  r4Desde = '';
  r4Hasta = '';
  r4Tipo = 'todos';
  r5Desde = '';
  r5Hasta = '';
  r5ProveedorId: number | null = null;
  r6UsuarioId: string | null = null;
  r6AlmacenId: number | null = null;

  async ngOnInit(): Promise<void> {
    const [aRows, uRows, pRows] = await Promise.all([
      this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } }),
      this.crud.listar<any>('usuarios', { filters: { activo: true }, orderBy: { column: 'nombre_completo' } }),
      this.crud.listar<any>('proveedores', { orderBy: { column: 'nombre' } })
    ]);
    const alms = aRows.map(a => ({ value: a.id, label: a.nombre }));
    this.almacenes.set(alms);
    this.usuarios.set(uRows.map(u => ({ value: u.id, label: u.nombre_completo })));
    this.proveedores.set(pRows.map(p => ({ value: p.id, label: p.nombre })));
    if (alms.length > 0) this.r1AlmacenId = alms[0].value;
  }

  async generarReporte(id: number): Promise<ReporteDataResult> {
    const s = this.supa.supabase;
    switch (id) {
      case 1: return queryStockAlmacen(s, this.r1AlmacenId);
      case 2: return queryEquiposEstado(s, this.r2AlmacenId);
      case 3: return queryEquiposAlmacen(s);
      case 4: return queryMovimientos(s, this.r4Tipo, this.r4Desde, this.r4Hasta);
      case 5: return queryMantenimientos(s, this.r5ProveedorId, this.r5Desde, this.r5Hasta);
      case 6: return queryAsignaciones(s, this.r6UsuarioId, this.r6AlmacenId);
      default: throw new Error('Reporte no válido');
    }
  }

  async ver(repId: number): Promise<void> {
    try {
      const res = await this.generarReporte(repId);
      this.dialog.open(ReportePreviewDialogComponent, {
        width: '840px',
        maxWidth: '95vw',
        data: {
          titulo: res.titulo,
          columnas: res.columnas,
          filas: res.filasMatriz,
          resumen: res.resumen
        }
      });
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al generar reporte', 'Cerrar', { duration: 3500 });
    }
  }

  async descargarExcel(repId: number): Promise<void> {
    try {
      const res = await this.generarReporte(repId);
      exportarExcel(res.filasObjetos, res.nombreArchivo, 'Reporte');
      this.snack.open('Excel descargado correctamente', 'OK', { duration: 2500 });
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al exportar Excel', 'Cerrar', { duration: 3500 });
    }
  }

  async descargarPDF(repId: number): Promise<void> {
    try {
      const res = await this.generarReporte(repId);
      exportarPDF(res.columnas, res.filasMatriz, res.titulo, res.nombreArchivo);
      this.snack.open('PDF descargado correctamente', 'OK', { duration: 2500 });
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al exportar PDF', 'Cerrar', { duration: 3500 });
    }
  }
}
