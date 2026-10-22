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
import { AuthService } from '@app/core/services/auth.service';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { estadoIdPorNombre } from '../activos/acciones/activo-acciones.util';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule
  ],
  templateUrl: './asignaciones.html'
})
export class AsignacionesComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly todos = signal<any[]>([]);
  readonly usuarios = signal<{ value: string; label: string }[]>([]);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);

  readonly filtroEstado = signal<string>('todas');
  readonly filtroUsuario = signal<string | null>(null);
  readonly filtroAlmacen = signal<number | null>(null);
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');

  readonly filtrados = computed(() => {
    let rows = this.todos();
    const estado = this.filtroEstado();
    const usuario = this.filtroUsuario();
    const alm = this.filtroAlmacen();
    const desde = this.filtroFechaDesde();
    const hasta = this.filtroFechaHasta();

    if (estado !== 'todas') {
      if (estado === 'activa') {
        rows = rows.filter(a => a.estado === 'activa');
      } else {
        rows = rows.filter(a => a.estado !== 'activa');
      }
    }
    if (usuario) {
      rows = rows.filter(a => a.asignado_a === usuario);
    }
    if (alm !== null && alm !== undefined) {
      rows = rows.filter(a => Number(a.almacen_id) === Number(alm));
    }
    if (desde) {
      rows = rows.filter(a => a.fecha_asignacion && a.fecha_asignacion.slice(0, 10) >= desde);
    }
    if (hasta) {
      rows = rows.filter(a => a.fecha_asignacion && a.fecha_asignacion.slice(0, 10) <= hasta);
    }
    return rows;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarCatalogos();
    await this.cargarAsignaciones();
  }

  async cargarCatalogos(): Promise<void> {
    try {
      const [userRows, almRows] = await Promise.all([
        this.crud.listar<any>('usuarios', { filters: { activo: true }, orderBy: { column: 'nombre_completo' } }),
        this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } })
      ]);
      this.usuarios.set(userRows.map(u => ({ value: u.id, label: u.nombre_completo })));
      this.almacenes.set(almRows.map(a => ({ value: a.id, label: a.nombre })));
    } catch {
      // Ignorar
    }
  }

  async cargarAsignaciones(): Promise<void> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('asignaciones')
        .select(`
          *,
          activos(codigo_activo, numero_serie),
          usuarios!asignado_a(nombre_completo),
          almacenes(nombre)
        `)
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;
      this.todos.set(data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar asignaciones', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  devolver(asig: any): void {
    const actCodigo = asig.activos?.codigo_activo ?? 'activo';
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: 'Devolución de Activo',
        mensaje: `¿Confirmar la devolución del activo "${actCodigo}" asignado a ${asig.usuarios?.nombre_completo || 'usuario'}?`,
        tipo: 'primary'
      }
    }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        // Intentar RPC transaccional devolver_equipo (Iteración 9)
        const { error } = await this.supa.supabase.rpc('devolver_equipo', {
          p_activo_id: asig.activo_id,
          p_notas: 'Devolución de activo'
        });

        if (error) {
          // Fallback manual en caso de que la RPC no esté disponible
          const userId = this.auth.currentUser()?.id ?? null;
          const estadoDisponibleId = await estadoIdPorNombre(this.crud, 'Disponible');

          try {
            await this.crud.actualizar('asignaciones', asig.id, {
              estado: 'devuelta',
              fecha_devolucion: new Date().toISOString()
            } as any, { sinUpdatedAt: true });
          } catch {
            await this.crud.actualizar('asignaciones', asig.id, {
              estado: 'finalizada',
              fecha_devolucion: new Date().toISOString()
            } as any, { sinUpdatedAt: true });
          }

          await this.crud.actualizar('activos', asig.activo_id, {
            estado_id: estadoDisponibleId,
            asignado_a: null
          });

          await this.crud.crear('movimientos', {
            tipo: 'devolucion',
            activo_id: asig.activo_id,
            usuario_destino_id: asig.asignado_a,
            motivo: 'Devolución de activo',
            created_by: userId
          });
        }

        this.snack.open('Activo devuelto y disponible', 'OK', { duration: 2500 });
        await this.cargarAsignaciones();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al registrar devolución', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
