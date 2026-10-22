import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { RolNombre, Usuario, UsuarioAlmacen } from '@app/core/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supa = inject(SupabaseService);
  private router = inject(Router);

  readonly currentUser = signal<Usuario | null>(null);
  readonly session = signal<Session | null>(null);
  readonly loading = signal<boolean>(true);
  readonly assignedWarehouses = signal<number[]>([]);

  readonly userRole = computed<RolNombre | null>(() => {
    return this.currentUser()?.rol?.nombre ?? null;
  });

  readonly isAdmin = computed(() => this.userRole() === 'Administrador');
  readonly isEncargado = computed(() => this.userRole() === 'Encargado de almacén');
  readonly isTecnico = computed(() => this.userRole() === 'Técnico');
  readonly isAuditor = computed(() => this.userRole() === 'Auditor');

  constructor() {
    this.initSession();
  }

  private async initSession(): Promise<void> {
    try {
      const { data } = await this.supa.supabase.auth.getSession();
      this.session.set(data.session);

      if (data.session?.user) {
        await this.loadUserProfile(data.session.user);
      }
    } finally {
      this.loading.set(false);
    }

    this.supa.supabase.auth.onAuthStateChange(async (_event, session) => {
      this.session.set(session);
      if (session?.user) {
        await this.loadUserProfile(session.user);
      } else {
        this.currentUser.set(null);
        this.assignedWarehouses.set([]);
      }
    });
  }

  async loadUserProfile(user: User): Promise<Usuario | null> {
    try {
      const { data, error } = await this.supa.supabase
        .from('usuarios')
        .select('*, rol:roles(*)')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        // Perfil fallback si todavía no está vinculado en la tabla usuarios
        const fallback: Usuario = {
          id: user.id,
          email: user.email ?? '',
          nombre_completo: user.user_metadata?.['full_name'] ?? user.email?.split('@')[0] ?? 'Usuario',
          rol_id: 1,
          activo: true,
          rol: { id: 1, nombre: 'Administrador' }
        };
        this.currentUser.set(fallback);
        return fallback;
      }

      this.currentUser.set(data as Usuario);
      await this.loadAssignedWarehouses(user.id);
      return data as Usuario;
    } catch {
      return null;
    }
  }

  private async loadAssignedWarehouses(userId: string): Promise<void> {
    const { data } = await this.supa.supabase
      .from('usuario_almacen')
      .select('almacen_id')
      .eq('usuario_id', userId);

    if (data) {
      this.assignedWarehouses.set(data.map((item: { almacen_id: number }) => item.almacen_id));
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supa.supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await this.loadUserProfile(data.user);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Error inesperado al iniciar sesión' };
    } finally {
      this.loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.loading.set(true);
    try {
      await this.supa.supabase.auth.signOut();
      this.session.set(null);
      this.currentUser.set(null);
      this.assignedWarehouses.set([]);
      await this.router.navigate(['/auth/login']);
    } finally {
      this.loading.set(false);
    }
  }

  hasRole(allowedRoles: RolNombre[]): boolean {
    const current = this.userRole();
    if (!current) return false;
    return allowedRoles.includes(current);
  }

  canAccessWarehouse(warehouseId: number): boolean {
    if (this.isAdmin()) return true;
    return this.assignedWarehouses().includes(warehouseId);
  }
}
