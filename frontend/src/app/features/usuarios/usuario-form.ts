import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { CrudService } from '@app/core/services/crud.service';
import { SupabaseService } from '@app/core/services/supabase.service';

export interface UsuarioFormData {
  usuario?: any;
}

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule
  ],
  template: `
    <div class="p-6 w-full min-w-[340px] max-w-md">
      <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <h2 class="text-base font-semibold text-slate-900">
          {{ data?.usuario ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </h2>
        <button type="button" (click)="ref.close(false)" class="text-slate-400 hover:text-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-1">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre Completo</mat-label>
          <input matInput formControlName="nombre_completo" placeholder="Ej: Juan Pérez Mendoza" />
          @if (form.controls.nombre_completo.touched && form.controls.nombre_completo.invalid) {
            <mat-error>Nombre obligatorio</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="juan.perez@empresa.com" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <mat-error>Email válido obligatorio</mat-error>
          }
        </mat-form-field>

        @if (!data?.usuario) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Contraseña de acceso</mat-label>
            <input matInput type="text" formControlName="password" placeholder="Mínimo 6 caracteres" />
            <mat-hint>Por defecto: 12345678</mat-hint>
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <mat-error>Mínimo 6 caracteres</mat-error>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" placeholder="Ej: 987654321" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Rol de Usuario</mat-label>
          <mat-select formControlName="rol_id">
            @for (r of roles(); track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
          @if (form.controls.rol_id.touched && form.controls.rol_id.invalid) {
            <mat-error>Selecciona un rol</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Almacenes Asignados</mat-label>
          <mat-select formControlName="almacenes_ids" multiple>
            @for (a of almacenes(); track a.value) {
              <mat-option [value]="a.value">{{ a.label }}</mat-option>
            }
          </mat-select>
          <mat-hint>Opcional: Si se deja vacío, aplica acceso total según su rol</mat-hint>
        </mat-form-field>

        <div class="py-2">
          <mat-checkbox formControlName="activo" color="primary">
            <span class="text-xs font-medium text-slate-700">Usuario activo en el sistema</span>
          </mat-checkbox>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
          <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class UsuarioFormComponent implements OnInit {
  readonly data = inject<UsuarioFormData>(MAT_DIALOG_DATA, { optional: true });
  readonly ref = inject(MatDialogRef<UsuarioFormComponent>);
  private crud = inject(CrudService);
  private supa = inject(SupabaseService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly roles = signal<{ value: number; label: string }[]>([]);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre_completo: [this.data?.usuario?.nombre_completo ?? '', Validators.required],
    email: [this.data?.usuario?.email ?? '', [Validators.required, Validators.email]],
    password: ['123456', this.data?.usuario ? [] : [Validators.required, Validators.minLength(6)]],
    telefono: [this.data?.usuario?.telefono ?? ''],
    rol_id: [this.data?.usuario?.rol_id ?? (1 as number), Validators.required],
    almacenes_ids: [this.obtenerAlmacenesIniciales()],
    activo: [this.data?.usuario?.activo ?? true]
  });

  private obtenerAlmacenesIniciales(): number[] {
    const list = this.data?.usuario?.usuario_almacen ?? [];
    return list.map((ua: any) => ua.almacen_id);
  }

  async ngOnInit(): Promise<void> {
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

  async guardar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const v = this.form.getRawValue();

    try {
      let targetUserId = this.data?.usuario?.id;

      if (this.data?.usuario) {
        // Actualizar usuario existente
        await this.crud.actualizar('usuarios', targetUserId, {
          email: v.email.trim(),
          nombre_completo: v.nombre_completo.trim(),
          telefono: v.telefono?.trim() || null,
          rol_id: v.rol_id,
          activo: v.activo
        });
      } else {
        // 1. Intentar crear vía función SQL RPC (evita envíos de correo y sin límite de peticiones)
        const { data: rpcId, error: rpcError } = await this.supa.supabase.rpc('crear_usuario_sistema', {
          p_email: v.email.trim(),
          p_password: v.password.trim(),
          p_nombre: v.nombre_completo.trim(),
          p_telefono: v.telefono?.trim() || null,
          p_rol_id: v.rol_id,
          p_activo: v.activo
        });

        if (!rpcError && rpcId) {
          targetUserId = rpcId;
        } else {
          // 2. Fallback a Supabase Auth signUp
          const tempAuth = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storageKey: 'sisinv_temp_auth'
            }
          });

          const { data: authData, error: authError } = await tempAuth.auth.signUp({
            email: v.email.trim(),
            password: v.password.trim(),
            options: {
              data: {
                nombre_completo: v.nombre_completo.trim()
              }
            }
          });

          if (authError) {
            if (authError.message?.toLowerCase().includes('rate limit') || (authError as any).code === 'over_email_send_rate_limit') {
              throw new Error('Supabase bloqueó el envío de correo (rate limit). En Supabase: Authentication > Providers > Email, desactiva "Confirm email" o ejecuta la función SQL.');
            }
            throw new Error(`Error en autenticación: ${authError.message}`);
          }

          targetUserId = authData.user?.id;
          if (!targetUserId) {
            throw new Error('No se pudo generar el usuario. Verifica si el email ya existe.');
          }

          // Insertar en la tabla pública de usuarios vinculando el id generado
          await this.crud.crear('usuarios', {
            id: targetUserId,
            email: v.email.trim(),
            nombre_completo: v.nombre_completo.trim(),
            telefono: v.telefono?.trim() || null,
            rol_id: v.rol_id,
            activo: v.activo
          });
        }
      }

      // Sincronizar almacenes asignados en usuario_almacen
      const almacenesSeleccionados = v.almacenes_ids ?? [];
      await this.supa.supabase
        .from('usuario_almacen')
        .delete()
        .eq('usuario_id', targetUserId);

      if (almacenesSeleccionados.length > 0) {
        const rowsToInsert = almacenesSeleccionados.map((aid: number) => ({
          usuario_id: targetUserId,
          almacen_id: aid
        }));
        await this.supa.supabase.from('usuario_almacen').insert(rowsToInsert);
      }

      this.snack.open(
        this.data?.usuario ? 'Usuario actualizado con éxito' : 'Usuario creado exitosamente',
        'OK',
        { duration: 3000 }
      );
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al procesar usuario', 'Cerrar', { duration: 4500 });
    } finally {
      this.guardando.set(false);
    }
  }
}
