import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { UsuarioFormComponent } from './usuario-form';
import { AsignarAlmacenesDialogComponent } from './asignar-almacenes-dialog';

import { LoadingSkeletonComponent } from '@app/shared/components/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatChipsModule,
    LoadingSkeletonComponent
  ],
  templateUrl: './usuarios.html'
})
export class UsuariosComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly todos = signal<any[]>([]);
  readonly roles = signal<{ value: number; label: string }[]>([]);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);

  readonly filtroRol = signal<number | null>(null);
  readonly filtroAlmacen = signal<number | null>(null);
  readonly filtroEstado = signal<string>('todos');
  readonly filtroBusqueda = signal<string>('');

  readonly tieneFiltrosActivos = computed(() => {
    return this.filtroRol() !== null ||
      this.filtroAlmacen() !== null ||
      this.filtroEstado() !== 'todos' ||
      this.filtroBusqueda().trim() !== '';
  });

  limpiarFiltros(): void {
    this.filtroRol.set(null);
    this.filtroAlmacen.set(null);
    this.filtroEstado.set('todos');
    this.filtroBusqueda.set('');
  }

  readonly filtrados = computed(() => {
    let rows = this.todos();
    const rol = this.filtroRol();
    const alm = this.filtroAlmacen();
    const est = this.filtroEstado();
    const q = this.filtroBusqueda().trim().toLowerCase();

    if (rol !== null && rol !== undefined) {
      rows = rows.filter(u => Number(u.rol_id) === Number(rol));
    }
    if (alm !== null && alm !== undefined) {
      rows = rows.filter(u => {
        const ua = u.usuario_almacen ?? [];
        return ua.some((a: any) => Number(a.almacen_id) === Number(alm));
      });
    }
    if (est !== 'todos') {
      const activoVal = est === 'activos';
      rows = rows.filter(u => u.activo === activoVal);
    }
    if (q) {
      rows = rows.filter(u =>
        String(u.nombre_completo ?? '').toLowerCase().includes(q) ||
        String(u.email ?? '').toLowerCase().includes(q) ||
        String(u.telefono ?? '').toLowerCase().includes(q)
      );
    }
    return rows;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarCatalogos();
    await this.cargarUsuarios();
  }

  async cargarCatalogos(): Promise<void> {
    try {
      const [rRows, aRows] = await Promise.all([
        this.crud.listar<any>('roles', { orderBy: { column: 'id' } }),
        this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } })
      ]);
      this.roles.set(rRows.map(r => ({ value: r.id, label: r.nombre })));
      this.almacenes.set(aRows.map(a => ({ value: a.id, label: a.nombre })));
    } catch {
      // Ignorar
    }
  }

  async cargarUsuarios(): Promise<void> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('usuarios')
        .select(`
          *,
          roles(nombre),
          usuario_almacen(almacen_id, almacenes(nombre))
        `)
        .order('nombre_completo');

      if (error) throw error;
      this.todos.set(data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar usuarios', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  abrirForm(usuario?: any): void {
    this.dialog.open(UsuarioFormComponent, {
      width: '460px',
      data: { usuario }
    }).afterClosed().subscribe(ok => ok && this.cargarUsuarios());
  }

  abrirAsignarAlmacenes(u: any): void {
    const ua = u.usuario_almacen ?? [];
    const almacenesIds = ua.map((a: any) => a.almacen_id);
    this.dialog.open(AsignarAlmacenesDialogComponent, {
      width: '440px',
      data: {
        usuarioId: u.id,
        nombreUsuario: u.nombre_completo,
        almacenesIds
      }
    }).afterClosed().subscribe(ok => ok && this.cargarUsuarios());
  }

  async toggleActivo(u: any): Promise<void> {
    const nuevoEstado = !u.activo;
    try {
      await this.crud.actualizar('usuarios', u.id, { activo: nuevoEstado });
      this.snack.open(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`, 'OK', { duration: 2500 });
      await this.cargarUsuarios();
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cambiar estado', 'Cerrar', { duration: 4000 });
    }
  }
}
