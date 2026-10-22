import { SupabaseClient } from '@supabase/supabase-js';

export interface ReporteDataResult {
  titulo: string;
  nombreArchivo: string;
  columnas: string[];
  filasMatriz: (string | number)[][];
  filasObjetos: Record<string, any>[];
  resumen?: string;
}

export async function queryStockAlmacen(supa: SupabaseClient, almacenId: number | null): Promise<ReporteDataResult> {
  let q = supa.from('stock').select('*, items(sku, nombre, unidad, stock_minimo), almacenes(nombre)');
  if (almacenId) q = q.eq('almacen_id', almacenId);
  const { data } = await q;
  const rows = (data ?? []).map((s: any) => {
    const it = Array.isArray(s.items) ? s.items[0] : s.items;
    const alm = Array.isArray(s.almacenes) ? s.almacenes[0] : s.almacenes;
    const cant = Number(s.cantidad ?? 0);
    const res = Number(s.cantidad_reservada ?? 0);
    const disp = cant - res;
    const min = Number(it?.stock_minimo ?? 0);
    const alerta = cant <= min ? (cant === 0 ? 'Agotado' : 'Stock Bajo') : 'Normal';
    return {
      'Almacén': alm?.nombre ?? '—',
      'SKU': it?.sku ?? '—',
      'Ítem': it?.nombre ?? '—',
      'Unidad': it?.unidad ?? 'uds',
      'Cantidad': cant,
      'Reservada': res,
      'Disponible': disp,
      'Stock Mínimo': min,
      'Alerta': alerta
    };
  });
  const columnas = ['Almacén', 'SKU', 'Ítem', 'Unidad', 'Cantidad', 'Reservada', 'Disponible', 'Stock Mínimo', 'Alerta'];
  return {
    titulo: 'Reporte de Stock por Almacén',
    nombreArchivo: 'reporte_stock_almacen',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => columnas.map(c => (r as any)[c]))
  };
}

export async function queryEquiposEstado(supa: SupabaseClient, almacenId: number | null): Promise<ReporteDataResult> {
  let q = supa.from('activos').select('id, almacen_id, estados_equipo(nombre)').eq('activo', true);
  if (almacenId) q = q.eq('almacen_id', almacenId);
  const { data } = await q;
  const activos = data ?? [];
  const total = activos.length;
  const conteo = new Map<string, number>();
  for (const a of activos) {
    const est = (Array.isArray(a.estados_equipo) ? a.estados_equipo[0] : a.estados_equipo)?.nombre || 'Sin estado';
    conteo.set(est, (conteo.get(est) ?? 0) + 1);
  }
  const rows = Array.from(conteo.entries()).map(([est, cant]) => ({
    'Estado': est,
    'Cantidad': cant,
    'Porcentaje': total > 0 ? `${((cant / total) * 100).toFixed(1)}%` : '0%'
  }));
  const columnas = ['Estado', 'Cantidad', 'Porcentaje'];
  return {
    titulo: 'Reporte de Equipos por Estado',
    nombreArchivo: 'reporte_equipos_estado',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => [r.Estado, r.Cantidad, r.Porcentaje]),
    resumen: `Total de equipos analizados: ${total}`
  };
}

export async function queryEquiposAlmacen(supa: SupabaseClient): Promise<ReporteDataResult> {
  const { data } = await supa.from('activos').select('id, almacen_id, almacenes(nombre), estados_equipo(nombre)').eq('activo', true);
  const activos = data ?? [];
  const almMap = new Map<string, { total: number; asignados: number; disponibles: number; mant: number }>();
  for (const a of activos) {
    const alm = (Array.isArray(a.almacenes) ? a.almacenes[0] : a.almacenes)?.nombre || 'Sin almacén';
    const est = (Array.isArray(a.estados_equipo) ? a.estados_equipo[0] : a.estados_equipo)?.nombre || '';
    const curr = almMap.get(alm) ?? { total: 0, asignados: 0, disponibles: 0, mant: 0 };
    curr.total += 1;
    if (est === 'Asignado') curr.asignados += 1;
    else if (est === 'Disponible') curr.disponibles += 1;
    else if (est === 'Mantenimiento') curr.mant += 1;
    almMap.set(alm, curr);
  }
  const rows = Array.from(almMap.entries()).map(([alm, c]) => ({
    'Almacén': alm,
    'Total Equipos': c.total,
    'Disponibles': c.disponibles,
    'Asignados': c.asignados,
    'En Mantenimiento': c.mant
  }));
  const columnas = ['Almacén', 'Total Equipos', 'Disponibles', 'Asignados', 'En Mantenimiento'];
  return {
    titulo: 'Reporte de Equipos por Almacén',
    nombreArchivo: 'reporte_equipos_almacen',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => columnas.map(c => (r as any)[c]))
  };
}

export async function queryMovimientos(supa: SupabaseClient, tipo: string, desde: string, hasta: string): Promise<ReporteDataResult> {
  let q = supa.from('movimientos').select(`
    *, activos(codigo_activo), items(sku, nombre),
    almacen_origen:almacenes!almacen_origen_id(nombre),
    almacen_destino:almacenes!almacen_destino_id(nombre)
  `).order('fecha', { ascending: false });
  if (tipo !== 'todos') q = q.eq('tipo', tipo);
  if (desde) q = q.gte('fecha', `${desde}T00:00:00Z`);
  if (hasta) q = q.lte('fecha', `${hasta}T23:59:59Z`);
  const { data } = await q;
  const rows = (data ?? []).map((m: any) => {
    const desc = m.activos ? `Activo: ${m.activos.codigo_activo}` : (m.items ? `${m.items.sku} - ${m.items.nombre}` : '—');
    return {
      'Fecha': m.fecha ? m.fecha.slice(0, 10) : '—',
      'Tipo': (m.tipo || '').toUpperCase(),
      'Descripción': desc,
      'Cant.': m.cantidad,
      'Origen': m.almacen_origen?.nombre || '—',
      'Destino': m.almacen_destino?.nombre || '—',
      'Motivo': m.motivo || '—'
    };
  });
  const columnas = ['Fecha', 'Tipo', 'Descripción', 'Cant.', 'Origen', 'Destino', 'Motivo'];
  return {
    titulo: 'Reporte de Movimientos de Inventario',
    nombreArchivo: 'reporte_movimientos',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => columnas.map(c => (r as any)[c]))
  };
}

export async function queryMantenimientos(supa: SupabaseClient, provId: number | null, desde: string, hasta: string): Promise<ReporteDataResult> {
  let q = supa.from('mantenimientos').select('*, activos(codigo_activo), proveedores(nombre)').order('fecha_inicio', { ascending: false });
  if (provId) q = q.eq('proveedor_id', provId);
  if (desde) q = q.gte('fecha_inicio', desde);
  if (hasta) q = q.lte('fecha_inicio', hasta);
  const { data } = await q;
  let sumaCosto = 0;
  const rows = (data ?? []).map((m: any) => {
    const costo = Number(m.costo ?? 0);
    sumaCosto += costo;
    return {
      'Activo': m.activos?.codigo_activo || '—',
      'Tipo': (m.tipo || '').toUpperCase(),
      'Proveedor': m.proveedores?.nombre || '—',
      'Costo (S/)': costo.toFixed(2),
      'Fecha Inicio': m.fecha_inicio || '—',
      'Fecha Fin': m.fecha_fin || '—',
      'Estado': (m.estado || '').toUpperCase()
    };
  });
  const columnas = ['Activo', 'Tipo', 'Proveedor', 'Costo (S/)', 'Fecha Inicio', 'Fecha Fin', 'Estado'];
  return {
    titulo: 'Reporte de Mantenimientos Realizados',
    nombreArchivo: 'reporte_mantenimientos',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => columnas.map(c => (r as any)[c])),
    resumen: `Costo Total Acumulado: S/ ${sumaCosto.toFixed(2)}`
  };
}

export async function queryAsignaciones(supa: SupabaseClient, usuarioId: string | null, almacenId: number | null): Promise<ReporteDataResult> {
  let q = supa.from('asignaciones').select('*, activos(codigo_activo, numero_serie), usuarios!asignado_a(nombre_completo), almacenes(nombre)').order('fecha_asignacion', { ascending: false });
  if (usuarioId) q = q.eq('asignado_a', usuarioId);
  if (almacenId) q = q.eq('almacen_id', almacenId);
  const { data } = await q;
  const rows = (data ?? []).map((a: any) => ({
    'Código Activo': a.activos?.codigo_activo || '—',
    'N° Serie': a.activos?.numero_serie || '—',
    'Usuario Asignado': a.usuarios?.nombre_completo || '—',
    'Almacén': a.almacenes?.nombre || '—',
    'Fecha Asignación': a.fecha_asignacion ? a.fecha_asignacion.slice(0, 10) : '—',
    'Estado': (a.estado || '').toUpperCase()
  }));
  const columnas = ['Código Activo', 'N° Serie', 'Usuario Asignado', 'Almacén', 'Fecha Asignación', 'Estado'];
  return {
    titulo: 'Reporte de Equipos Asignados',
    nombreArchivo: 'reporte_equipos_asignados',
    columnas,
    filasObjetos: rows,
    filasMatriz: rows.map(r => columnas.map(c => (r as any)[c]))
  };
}
