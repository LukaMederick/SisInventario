import { CrudService } from '@app/core/services/crud.service';

export async function estadoIdPorNombre(crud: CrudService, nombre: string): Promise<number> {
  const rows = await crud.listar<{ id: number; nombre: string }>('estados_equipo', {
    filters: { nombre }
  });
  if (!rows.length) throw new Error(`Estado "${nombre}" no encontrado. Créalo en Catálogos.`);
  return rows[0].id;
}

export function toOpt<T extends { id: any; nombre?: string; nombre_completo?: string }>(
  rows: T[],
  labelKey: 'nombre' | 'nombre_completo' = 'nombre'
): { value: any; label: string }[] {
  return rows.map(r => ({
    value: r.id,
    label: String((r as any)[labelKey] ?? r.id)
  }));
}
