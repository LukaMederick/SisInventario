import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { MantenimientoDialogComponent } from '../activos/acciones/mantenimiento-dialog';
import { estadoIdPorNombre } from '../activos/acciones/activo-acciones.util';

@Component({
  selector: 'app-mantenimientos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, DecimalPipe, MatDialogModule,
    MatSnackBarModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule
  ],
  templateUrl: './mantenimientos.html'
})
export class MantenimientosComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly todos = signal<any[]>([]);
  readonly proveedores = signal<{ value: number; label: string }[]>([]);

  readonly filtroEstado = signal<string>('todos');
  readonly filtroTipo = signal<string>('todos');
  readonly filtroProveedor = signal<number | null>(null);
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');

  readonly filtrados = computed(() => {
    let rows = this.todos();
    const estado = this.filtroEstado();
    const tipo = this.filtroTipo();
    const proveedor = this.filtroProveedor();
    const desde = this.filtroFechaDesde();
    const hasta = this.filtroFechaHasta();

    if (estado !== 'todos') {
      rows = rows.filter(m => m.estado === estado);
    }
    if (tipo !== 'todos') {
      rows = rows.filter(m => m.tipo === tipo);
    }
    if (proveedor !== null && proveedor !== undefined) {
      rows = rows.filter(m => Number(m.proveedor_id) === Number(proveedor));
    }
    if (desde) {
      rows = rows.filter(m => m.fecha_inicio && m.fecha_inicio >= desde);
    }
    if (hasta) {
      rows = rows.filter(m => m.fecha_inicio && m.fecha_inicio <= hasta);
    }
    return rows;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarProveedores();
    await this.cargarMantenimientos();
  }

  async cargarProveedores(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('proveedores', { orderBy: { column: 'nombre' } });
      this.proveedores.set(rows.map(p => ({ value: p.id, label: p.nombre })));
    } catch {
      // Ignorar
    }
  }

  async cargarMantenimientos(): Promise<void> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('mantenimientos')
        .select(`
          *,
          activos(codigo_activo, numero_serie),
          proveedores(nombre)
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      this.todos.set(data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar mantenimientos', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  abrirNuevo(): void {
    this.dialog.open(MantenimientoDialogComponent, {
      width: '560px',
      data: {}
    }).afterClosed().subscribe(ok => ok && this.cargarMantenimientos());
  }

  marcarFinalizado(mant: any): void {
    const actCodigo = mant.activos?.codigo_activo ?? 'activo';
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: 'Finalizar Mantenimiento',
        mensaje: `¿Marcar como finalizado el mantenimiento del activo "${actCodigo}" y devolverlo a estado Disponible?`,
        tipo: 'primary'
      }
    }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      const userId = this.auth.currentUser()?.id ?? null;
      try {
        const estadoDisponibleId = await estadoIdPorNombre(this.crud, 'Disponible');

        // Actualizar mantenimiento
        try {
          await this.crud.actualizar('mantenimientos', mant.id, {
            estado: 'finalizado',
            fecha_fin: new Date().toISOString().slice(0, 10)
          });
        } catch {
          await this.crud.actualizar('mantenimientos', mant.id, {
            estado: 'completado',
            fecha_fin: new Date().toISOString().slice(0, 10)
          });
        }

        // Actualizar activo
        if (mant.activo_id) {
          await this.crud.actualizar('activos', mant.activo_id, {
            estado_id: estadoDisponibleId
          });

          // Registrar movimiento
          await this.crud.crear('movimientos', {
            tipo: 'ajuste',
            activo_id: mant.activo_id,
            motivo: 'Mantenimiento finalizado',
            created_by: userId
          });
        }

        this.snack.open('Mantenimiento finalizado', 'OK', { duration: 2500 });
        await this.cargarMantenimientos();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al finalizar mantenimiento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  esFinalizado(estado: string): boolean {
    return estado === 'finalizado' || estado === 'completado' || estado === 'cancelado';
  }
}
