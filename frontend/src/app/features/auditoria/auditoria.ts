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
import { DiffDialogComponent } from './diff-dialog';

import { LoadingSkeletonComponent } from '@app/shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule,
    LoadingSkeletonComponent
  ],
  templateUrl: './auditoria.html'
})
export class AuditoriaComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly registros = signal<any[]>([]);
  readonly usuarios = signal<{ value: string; label: string }[]>([]);

  readonly filtroTabla = signal<string>('todas');
  readonly filtroAccion = signal<string>('todas');
  readonly filtroUsuario = signal<string | null>(null);
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');

  readonly filtrados = computed(() => {
    let rows = this.registros();
    const tabla = this.filtroTabla();
    const accion = this.filtroAccion();
    const usuario = this.filtroUsuario();
    const desde = this.filtroFechaDesde();
    const hasta = this.filtroFechaHasta();

    if (tabla !== 'todas') {
      rows = rows.filter(r => r.tabla === tabla);
    }
    if (accion !== 'todas') {
      rows = rows.filter(r => r.accion === accion);
    }
    if (usuario) {
      rows = rows.filter(r => r.usuario_id === usuario);
    }
    if (desde) {
      rows = rows.filter(r => r.created_at && r.created_at.slice(0, 10) >= desde);
    }
    if (hasta) {
      rows = rows.filter(r => r.created_at && r.created_at.slice(0, 10) <= hasta);
    }
    return rows;
  });

  hayFiltrosActivos(): boolean {
    return this.filtroTabla() !== 'todas' ||
           this.filtroAccion() !== 'todas' ||
           this.filtroUsuario() !== null ||
           !!this.filtroFechaDesde() ||
           !!this.filtroFechaHasta();
  }

  limpiarFiltros(): void {
    this.filtroTabla.set('todas');
    this.filtroAccion.set('todas');
    this.filtroUsuario.set(null);
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
  }

  async ngOnInit(): Promise<void> {
    await this.cargarUsuarios();
    await this.cargarAuditoria();
  }

  async cargarUsuarios(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('usuarios', { orderBy: { column: 'nombre_completo' } });
      this.usuarios.set(rows.map(u => ({ value: u.id, label: u.nombre_completo })));
    } catch {
      // Ignorar
    }
  }

  async cargarAuditoria(): Promise<void> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('auditoria')
        .select(`
          *,
          usuarios(nombre_completo, email)
        `)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        // Fallback en caso de que la relación foreign key con usuarios no esté activa en PostgREST
        const { data: simpleData, error: simpleErr } = await this.supa.supabase
          .from('auditoria')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300);

        if (simpleErr) throw simpleErr;
        this.registros.set(simpleData ?? []);
      } else {
        this.registros.set(data ?? []);
      }
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar auditoría', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  verDiff(row: any): void {
    this.dialog.open(DiffDialogComponent, {
      width: '640px',
      data: {
        tabla: row.tabla,
        accion: row.accion,
        registroId: row.registro_id,
        datosAnteriores: row.datos_anteriores,
        datosNuevos: row.datos_nuevos
      }
    });
  }

  badgeClass(accion: string): string {
    switch (accion) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }
}
