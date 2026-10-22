export type RolNombre = 'Administrador' | 'Encargado de almacén' | 'Técnico' | 'Auditor';

export interface Rol {
  id: number;
  nombre: RolNombre;
  descripcion?: string | null;
  created_at?: string;
}

export interface Usuario {
  id: string; // auth.users UUID
  email: string;
  nombre_completo: string;
  telefono?: string | null;
  rol_id: number;
  activo: boolean;
  rol?: Rol | null;
  created_at?: string;
  updated_at?: string;
}

export interface Almacen {
  id: number;
  codigo: string;
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  responsable_id?: string | null;
  telefono?: string | null;
  activo: boolean;
  responsable?: Usuario | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsuarioAlmacen {
  id: number;
  usuario_id: string;
  almacen_id: number;
  almacen?: Almacen | null;
  created_at?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string | null;
  categoria_padre_id?: number | null;
  categoria_padre?: Categoria | null;
  created_at?: string;
}

export interface Marca {
  id: number;
  nombre: string;
  created_at?: string;
}

export interface Modelo {
  id: number;
  marca_id: number;
  categoria_id: number;
  nombre: string;
  especificaciones?: Record<string, any> | null;
  imagen_url?: string | null;
  activo: boolean;
  marca?: Marca | null;
  categoria?: Categoria | null;
  created_at?: string;
  updated_at?: string;
}

export interface EstadoEquipo {
  id: number;
  nombre: 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Baja' | 'Perdido' | string;
  descripcion?: string | null;
  color: string;
  created_at?: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  ruc?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  created_at?: string;
}

export interface Activo {
  id: number;
  codigo_activo: string;
  numero_serie: string;
  modelo_id: number;
  almacen_id: number;
  estado_id: number;
  proveedor_id?: number | null;
  fecha_compra?: string | null;
  precio?: number | null;
  garantia_hasta?: string | null;
  condicion: 'nuevo' | 'usado' | 'reacondicionado' | string;
  ubicacion_detalle?: string | null;
  asignado_a?: string | null;
  notas?: string | null;
  activo: boolean;
  created_by?: string | null;
  modelo?: Modelo | null;
  almacen?: Almacen | null;
  estado?: EstadoEquipo | null;
  proveedor?: Proveedor | null;
  asignado_usuario?: Usuario | null;
  created_at?: string;
  updated_at?: string;
}

export interface Item {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  categoria_id: number;
  marca_id?: number | null;
  unidad: string;
  stock_minimo: number;
  activo: boolean;
  categoria?: Categoria | null;
  marca?: Marca | null;
  created_at?: string;
  updated_at?: string;
}

export interface Stock {
  id: number;
  item_id: number;
  almacen_id: number;
  cantidad: number;
  cantidad_reservada: number;
  ultimo_conteo?: string | null;
  item?: Item | null;
  almacen?: Almacen | null;
  updated_at?: string;
}

export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'transferencia'
  | 'ajuste'
  | 'asignacion'
  | 'devolucion'
  | 'baja';

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  activo_id?: number | null;
  item_id?: number | null;
  cantidad?: number | null;
  almacen_origen_id?: number | null;
  almacen_destino_id?: number | null;
  usuario_destino_id?: string | null;
  motivo?: string | null;
  documento?: string | null;
  fecha: string;
  created_by?: string | null;
  activo?: Activo | null;
  item?: Item | null;
  almacen_origen?: Almacen | null;
  almacen_destino?: Almacen | null;
  usuario_destino?: Usuario | null;
  created_at?: string;
}

export interface Asignacion {
  id: number;
  activo_id: number;
  asignado_a: string;
  almacen_id: number;
  fecha_asignacion: string;
  fecha_devolucion?: string | null;
  estado: 'activa' | 'finalizada';
  notas?: string | null;
  created_by?: string | null;
  activo?: Activo | null;
  usuario?: Usuario | null;
  almacen?: Almacen | null;
  created_at?: string;
}

export interface Mantenimiento {
  id: number;
  activo_id: number;
  tipo: 'preventivo' | 'correctivo';
  descripcion: string;
  proveedor_id?: number | null;
  costo?: number | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
  created_by?: string | null;
  activo?: Activo | null;
  proveedor?: Proveedor | null;
  created_at?: string;
  updated_at?: string;
}

export interface Adjunto {
  id: number;
  entidad: string;
  entidad_id: number;
  archivo_url: string;
  nombre_archivo: string;
  tipo_mime: string;
  subido_por?: string | null;
  created_at?: string;
}

export interface Auditoria {
  id: number;
  tabla: string;
  registro_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  datos_anteriores?: Record<string, any> | null;
  datos_nuevos?: Record<string, any> | null;
  usuario_id?: string | null;
  usuario?: Usuario | null;
  created_at: string;
}
