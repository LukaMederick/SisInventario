import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { RegistrarMovimientoDialogComponent } from './registrar-movimiento-dialog';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule
  ],
  templateUrl: './movimientos.html'
})
export class MovimientosComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly todos = signal<any[]>([]);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);

  readonly filtroTipo = signal<string>('todos');
  readonly filtroAlmacen = signal<number | null>(null);
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');
  readonly filtroBusqueda = signal<string>('');

  readonly filtrados = computed(() => {
    let rows = this.todos();
    const tipo = this.filtroTipo();
    const alm = this.filtroAlmacen();
    const desde = this.filtroFechaDesde();
    const hasta = this.filtroFechaHasta();
    const q = this.filtroBusqueda().trim().toLowerCase();

    if (tipo !== 'todos') {
      rows = rows.filter(m => m.tipo === tipo);
    }
    if (alm !== null && alm !== undefined) {
      rows = rows.filter(m => Number(m.almacen_origen_id) === Number(alm) || Number(m.almacen_destino_id) === Number(alm));
    }
    if (desde) {
      rows = rows.filter(m => m.fecha && m.fecha.slice(0, 10) >= desde);
    }
    if (hasta) {
      rows = rows.filter(m => m.fecha && m.fecha.slice(0, 10) <= hasta);
    }
    if (q) {
      rows = rows.filter(m =>
        String(m.activos?.codigo_activo ?? '').toLowerCase().includes(q) ||
        String(m.items?.sku ?? '').toLowerCase().includes(q) ||
        String(m.items?.nombre ?? '').toLowerCase().includes(q) ||
        String(m.motivo ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarAlmacenes();
    await this.cargarMovimientos();
  }

  async cargarAlmacenes(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } });
      this.almacenes.set(rows.map(a => ({ value: a.id, label: a.nombre })));
    } catch {
      // Ignorar
    }
  }

  async cargarMovimientos(): Promise<void> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('movimientos')
        .select(`
          *,
          activos(codigo_activo),
          items(sku, nombre),
          almacen_origen:almacenes!almacen_origen_id(nombre),
          almacen_destino:almacenes!almacen_destino_id(nombre),
          usuario_destino:usuarios!usuario_destino_id(nombre_completo),
          creador:usuarios!created_by(nombre_completo)
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;
      this.todos.set(data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar movimientos', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  tipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'entrada': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'salida': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'transferencia': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ajuste': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'asignacion': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'devolucion': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'baja': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  abrirRegistrar(): void {
    this.dialog.open(RegistrarMovimientoDialogComponent, {
      width: '520px'
    }).afterClosed().subscribe(ok => ok && this.cargarMovimientos());
  }
}
