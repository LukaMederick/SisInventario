import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SupabaseService } from '@app/core/services/supabase.service';
import { AsignarDialogComponent } from './acciones/asignar-dialog';
import { TransferirDialogComponent } from './acciones/transferir-dialog';
import { BajaDialogComponent } from './acciones/baja-dialog';
import { MantenimientoDialogComponent } from './acciones/mantenimiento-dialog';
import { AdjuntoDialogComponent } from './acciones/adjunto-dialog';
import { QrDialogComponent } from './qr-dialog';

import { LoadingSkeletonComponent } from '@app/shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-activo-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, TitleCasePipe, DatePipe,
    MatTabsModule, MatCardModule, MatButtonModule, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, LoadingSkeletonComponent
  ],
  templateUrl: './activo-detalle.html'
})
export class ActivoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supa = inject(SupabaseService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly activoId = signal<number>(0);
  readonly cargando = signal(true);
  readonly activo = signal<any>(null);
  readonly movimientos = signal<any[]>([]);
  readonly asignaciones = signal<any[]>([]);
  readonly mantenimientos = signal<any[]>([]);
  readonly adjuntos = signal<any[]>([]);
  readonly filtroTipoMov = signal<string>('todos');

  readonly movimientosFiltrados = computed(() => {
    const tipo = this.filtroTipoMov();
    const todos = this.movimientos();
    return tipo === 'todos' ? todos : todos.filter(m => m.tipo === tipo);
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      this.snack.open('ID de activo inválido', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/activos']);
      return;
    }
    this.activoId.set(id);
    await this.cargarTodo();
  }

  async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    const id = this.activoId();
    try {
      const [resAct, resMov, resAsig, resMant, resAdj] = await Promise.all([
        this.supa.supabase.from('activos').select(`
          *,
          modelos(nombre, marcas(nombre), categorias(nombre)),
          almacenes(nombre),
          estados_equipo(nombre, color),
          proveedores(nombre),
          usuario_asignado:usuarios!asignado_a(nombre_completo)
        `).eq('id', id).single(),
        this.supa.supabase.from('movimientos').select(`
          *,
          almacen_origen:almacenes!almacen_origen_id(nombre),
          almacen_destino:almacenes!almacen_destino_id(nombre),
          usuario_destino:usuarios!usuario_destino_id(nombre_completo)
        `).eq('activo_id', id).order('fecha', { ascending: false }),
        this.supa.supabase.from('asignaciones').select(`
          *,
          usuario:usuarios!asignado_a(nombre_completo),
          almacen:almacenes!almacen_id(nombre)
        `).eq('activo_id', id).order('fecha_asignacion', { ascending: false }),
        this.supa.supabase.from('mantenimientos').select(`
          *,
          proveedor:proveedores!proveedor_id(nombre)
        `).eq('activo_id', id).order('fecha_inicio', { ascending: false }),
        this.supa.supabase.from('adjuntos').select(`
          *,
          subido:usuarios!subido_por(nombre_completo)
        `).eq('entidad', 'activo').eq('entidad_id', id).order('created_at', { ascending: false })
      ]);

      if (resAct.error) throw resAct.error;
      this.activo.set(resAct.data);
      this.movimientos.set(resMov.data ?? []);
      this.asignaciones.set(resAsig.data ?? []);
      this.mantenimientos.set(resMant.data ?? []);
      this.adjuntos.set(resAdj.data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar activo', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  abrirAsignar(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(AsignarDialogComponent, {
      width: '420px',
      data: { activoId: act.id, almacenId: act.almacen_id }
    }).afterClosed().subscribe(ok => ok && this.cargarTodo());
  }

  abrirTransferir(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(TransferirDialogComponent, {
      width: '420px',
      data: { activoId: act.id, almacenOrigenId: act.almacen_id }
    }).afterClosed().subscribe(ok => ok && this.cargarTodo());
  }

  abrirMantenimiento(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(MantenimientoDialogComponent, {
      width: '560px',
      data: { activoId: act.id }
    }).afterClosed().subscribe(ok => ok && this.cargarTodo());
  }

  abrirBaja(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(BajaDialogComponent, {
      width: '420px',
      data: { activoId: act.id, codigo: act.codigo_activo }
    }).afterClosed().subscribe(ok => ok && this.cargarTodo());
  }

  abrirQr(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(QrDialogComponent, {
      width: '380px',
      data: { id: act.id, codigo_activo: act.codigo_activo }
    });
  }

  abrirAdjunto(): void {
    const act = this.activo();
    if (!act) return;
    this.dialog.open(AdjuntoDialogComponent, {
      width: '420px',
      data: { activoId: act.id }
    }).afterClosed().subscribe(ok => ok && this.cargarTodo());
  }

  volver(): void {
    this.router.navigate(['/activos']);
  }
}
