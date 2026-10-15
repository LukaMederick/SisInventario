-- =====================================================================
-- SisInventario — PASO 1: Solo crear tablas, seeds y RLS
-- Ejecuta esto primero. Luego crea el usuario desde Authentication > Users
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpieza previa
DROP TABLE IF EXISTS public.auditoria CASCADE;
DROP TABLE IF EXISTS public.adjuntos CASCADE;
DROP TABLE IF EXISTS public.mantenimientos CASCADE;
DROP TABLE IF EXISTS public.asignaciones CASCADE;
DROP TABLE IF EXISTS public.movimientos CASCADE;
DROP TABLE IF EXISTS public.stock CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.activos CASCADE;
DROP TABLE IF EXISTS public.proveedores CASCADE;
DROP TABLE IF EXISTS public.estados_equipo CASCADE;
DROP TABLE IF EXISTS public.modelos CASCADE;
DROP TABLE IF EXISTS public.marcas CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.usuario_almacen CASCADE;
DROP TABLE IF EXISTS public.almacenes CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- 1. roles
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. usuarios
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    rol_id INT NOT NULL REFERENCES public.roles(id) DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. almacenes
CREATE TABLE public.almacenes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    direccion TEXT,
    ciudad VARCHAR(100),
    responsable_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. usuario_almacen
CREATE TABLE public.usuario_almacen (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    almacen_id INT NOT NULL REFERENCES public.almacenes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_usuario_almacen UNIQUE(usuario_id, almacen_id)
);

-- 5. categorias
CREATE TABLE public.categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria_padre_id INT REFERENCES public.categorias(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. marcas
CREATE TABLE public.marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. modelos
CREATE TABLE public.modelos (
    id SERIAL PRIMARY KEY,
    marca_id INT NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    especificaciones JSONB DEFAULT '{}'::jsonb,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. estados_equipo
CREATE TABLE public.estados_equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. proveedores
CREATE TABLE public.proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(20) UNIQUE,
    contacto VARCHAR(150),
    telefono VARCHAR(50),
    email VARCHAR(150),
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. activos
CREATE TABLE public.activos (
    id SERIAL PRIMARY KEY,
    codigo_activo VARCHAR(100) NOT NULL UNIQUE,
    numero_serie VARCHAR(100) NOT NULL UNIQUE,
    modelo_id INT NOT NULL REFERENCES public.modelos(id),
    almacen_id INT NOT NULL REFERENCES public.almacenes(id),
    estado_id INT NOT NULL REFERENCES public.estados_equipo(id),
    proveedor_id INT REFERENCES public.proveedores(id) ON DELETE SET NULL,
    fecha_compra DATE,
    precio NUMERIC(12, 2) DEFAULT 0.00,
    garantia_hasta DATE,
    condicion VARCHAR(50) DEFAULT 'nuevo',
    ubicacion_detalle TEXT,
    asignado_a UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. items
CREATE TABLE public.items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INT NOT NULL REFERENCES public.categorias(id),
    marca_id INT REFERENCES public.marcas(id) ON DELETE SET NULL,
    unidad VARCHAR(20) DEFAULT 'unidad',
    stock_minimo INT DEFAULT 5 CHECK (stock_minimo >= 0),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. stock
CREATE TABLE public.stock (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    almacen_id INT NOT NULL REFERENCES public.almacenes(id) ON DELETE CASCADE,
    cantidad INT DEFAULT 0 CHECK (cantidad >= 0),
    cantidad_reservada INT DEFAULT 0 CHECK (cantidad_reservada >= 0),
    ultimo_conteo TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_item_almacen UNIQUE(item_id, almacen_id)
);

-- 13. movimientos
CREATE TABLE public.movimientos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('entrada','salida','transferencia','ajuste','asignacion','devolucion','baja')),
    activo_id INT REFERENCES public.activos(id) ON DELETE SET NULL,
    item_id INT REFERENCES public.items(id) ON DELETE SET NULL,
    cantidad INT DEFAULT 1 CHECK (cantidad >= 0),
    almacen_origen_id INT REFERENCES public.almacenes(id) ON DELETE SET NULL,
    almacen_destino_id INT REFERENCES public.almacenes(id) ON DELETE SET NULL,
    usuario_destino_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    motivo TEXT,
    documento VARCHAR(100),
    fecha TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. asignaciones
CREATE TABLE public.asignaciones (
    id SERIAL PRIMARY KEY,
    activo_id INT NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    asignado_a UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    almacen_id INT NOT NULL REFERENCES public.almacenes(id),
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_devolucion TIMESTAMPTZ,
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa','devuelta','finalizada')),
    notas TEXT,
    created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. mantenimientos
CREATE TABLE public.mantenimientos (
    id SERIAL PRIMARY KEY,
    activo_id INT NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('preventivo','correctivo')),
    descripcion TEXT NOT NULL,
    proveedor_id INT REFERENCES public.proveedores(id) ON DELETE SET NULL,
    costo NUMERIC(10, 2) DEFAULT 0.00,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completado','finalizado','cancelado')),
    created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. adjuntos
CREATE TABLE public.adjuntos (
    id SERIAL PRIMARY KEY,
    entidad VARCHAR(50) NOT NULL,
    entidad_id INT NOT NULL,
    archivo_url TEXT NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100),
    subido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. auditoria
CREATE TABLE public.auditoria (
    id BIGSERIAL PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id VARCHAR(100) NOT NULL,
    accion VARCHAR(20) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeds
INSERT INTO public.roles (id, nombre, descripcion) VALUES
  (1, 'Administrador', 'Acceso total a todos los módulos y almacenes'),
  (2, 'Encargado de almacén', 'Acceso y gestión exclusiva en almacenes asignados'),
  (3, 'Técnico', 'Gestión de asignaciones y mantenimientos'),
  (4, 'Auditor', 'Solo lectura y generación de reportes');

SELECT setval('roles_id_seq', 4);

INSERT INTO public.estados_equipo (id, nombre, descripcion, color) VALUES
  (1, 'Disponible', 'Equipo listo para asignarse', '#10b981'),
  (2, 'Asignado', 'Equipo en uso por un usuario', '#3b82f6'),
  (3, 'Mantenimiento', 'Equipo en reparación', '#f59e0b'),
  (4, 'Baja', 'Equipo dado de baja', '#ef4444'),
  (5, 'Perdido', 'Equipo extraviado', '#64748b');

SELECT setval('estados_equipo_id_seq', 5);

-- RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_all" ON public.usuarios FOR ALL TO authenticated USING (true);
CREATE POLICY "almacenes_all" ON public.almacenes FOR ALL TO authenticated USING (true);
CREATE POLICY "usuario_almacen_all" ON public.usuario_almacen FOR ALL TO authenticated USING (true);
CREATE POLICY "categorias_all" ON public.categorias FOR ALL TO authenticated USING (true);
CREATE POLICY "marcas_all" ON public.marcas FOR ALL TO authenticated USING (true);
CREATE POLICY "modelos_all" ON public.modelos FOR ALL TO authenticated USING (true);
CREATE POLICY "estados_equipo_all" ON public.estados_equipo FOR ALL TO authenticated USING (true);
CREATE POLICY "proveedores_all" ON public.proveedores FOR ALL TO authenticated USING (true);
CREATE POLICY "activos_all" ON public.activos FOR ALL TO authenticated USING (true);
CREATE POLICY "items_all" ON public.items FOR ALL TO authenticated USING (true);
CREATE POLICY "stock_all" ON public.stock FOR ALL TO authenticated USING (true);
CREATE POLICY "movimientos_all" ON public.movimientos FOR ALL TO authenticated USING (true);
CREATE POLICY "asignaciones_all" ON public.asignaciones FOR ALL TO authenticated USING (true);
CREATE POLICY "mantenimientos_all" ON public.mantenimientos FOR ALL TO authenticated USING (true);
CREATE POLICY "adjuntos_all" ON public.adjuntos FOR ALL TO authenticated USING (true);
CREATE POLICY "auditoria_all" ON public.auditoria FOR ALL TO authenticated USING (true);

-- =====================================================================
-- STORAGE: Bucket 'adjuntos' y políticas de acceso
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('adjuntos', 'adjuntos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Adjuntos lectura publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'adjuntos');

CREATE POLICY "Adjuntos subida autenticada"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'adjuntos');

CREATE POLICY "Adjuntos actualizacion autenticada"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'adjuntos');

CREATE POLICY "Adjuntos eliminacion autenticada"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'adjuntos');

NOTIFY pgrst, 'reload schema';
