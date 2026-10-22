import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface CrudOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CrudService {
  private supa = inject(SupabaseService);

  async listar<T>(tabla: string, opciones: CrudOptions = {}): Promise<T[]> {
    let query = this.supa.supabase
      .from(tabla)
      .select(opciones.select ?? '*');

    if (opciones.filters) {
      for (const [key, value] of Object.entries(opciones.filters)) {
        if (value === undefined || value === null || value === '') continue;
        query = query.eq(key, value);
      }
    }

    if (opciones.orderBy) {
      query = query.order(opciones.orderBy.column, {
        ascending: opciones.orderBy.ascending ?? true
      });
    }

    if (opciones.limit) {
      query = query.limit(opciones.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as T[]) ?? [];
  }

  async obtener<T>(tabla: string, id: number | string, select = '*'): Promise<T | null> {
    const { data, error } = await this.supa.supabase
      .from(tabla)
      .select(select)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as T | null;
  }

  async crear<T>(tabla: string, datos: Partial<T>): Promise<T> {
    const { data, error } = await this.supa.supabase
      .from(tabla)
      .insert(datos as any)
      .select()
      .single();
    if (error) throw error;
    return data as T;
  }

  async actualizar<T>(
    tabla: string,
    id: number | string,
    datos: Partial<T>,
    opciones?: { sinUpdatedAt?: boolean }
  ): Promise<T> {
    const payload = opciones?.sinUpdatedAt
      ? { ...(datos as any) }
      : { ...(datos as any), updated_at: new Date().toISOString() };
    const { data, error } = await this.supa.supabase
      .from(tabla)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as T;
  }

  async eliminar(tabla: string, id: number | string): Promise<void> {
    const { error } = await this.supa.supabase
      .from(tabla)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async buscar<T>(tabla: string, columna: string, valor: string, select = '*'): Promise<T[]> {
    const { data, error } = await this.supa.supabase
      .from(tabla)
      .select(select)
      .ilike(columna, `%${valor}%`);
    if (error) throw error;
    return (data as T[]) ?? [];
  }
}
