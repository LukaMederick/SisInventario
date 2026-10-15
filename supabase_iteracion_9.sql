-- =====================================================================
-- SisInventario — ITERACIÓN 9: Seguridad Avanzada, RLS, RPC y Triggers
-- Ejecuta este script en Supabase SQL Editor
-- =====================================================================

-- ═════════════════════════════════════════════════════════════════════
-- PARTE 1: FUNCIONES HELPER SQL
-- ═════════════════════════════════════════════════════════════════════

-- 1. Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT r.nombre
  FROM public.usuarios u
  LEFT JOIN public.roles r ON r.id = u.rol_id
  WHERE u.id = auth.uid()
$$;

-- 2. Helper: verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(public.rol_actual() = 'Administrador', false)
$$;

-- 3. Helper: obtener almacenes asignados al usuario actual
CREATE OR REPLACE FUNCTION public.mis_almacenes()
RETURNS int[]
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(almacen_id), ARRAY[]::int[])
  FROM public.usuario_almacen
  WHERE usuario_id = auth.uid()
$$;

-- 4. Helper: verificar si el usuario tiene acceso a un almacén específico
CREATE OR REPLACE FUNCTION public.tiene_acceso_almacen(p_almacen_id int)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.es_admin() OR p_almacen_id IS NULL OR p_almacen_id = ANY(public.mis_almacenes())
$$;

-- ═════════════════════════════════════════════════════════════════════
-- PARTE 2: POLÍTICAS RLS POR ROL Y ALMACÉN
-- ═════════════════════════════════════════════════════════════════════

-- Limpiar políticas anteriores
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'roles','usuarios','usuario_almacen','almacenes','categorias','marcas',
    'modelos','estados_equipo','proveedores','activos','items','stock',
    'movimientos','asignaciones','mantenimientos','adjuntos','auditoria'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "acceso_autenticado_%s" ON %I;', t, t);
  END LOOP;
END $$;

-- ═══ ROLES: todos leen, solo admin escribe ═══
CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_write" ON public.roles FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ═══ USUARIOS: todos leen, cada uno edita su perfil, admin todo ═══
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (public.es_admin() OR id = auth.uid());
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated
  USING (public.es_admin() OR id = auth.uid());
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated
  USING (public.es_admin());

-- ═══ USUARIO_ALMACEN: admin o el propio usuario ═══
CREATE POLICY "usuario_almacen_all" ON public.usuario_almacen FOR ALL TO authenticated
  USING (public.es_admin() OR usuario_id = auth.uid())
  WITH CHECK (public.es_admin() OR usuario_id = auth.uid());

-- ═══ ALMACENES: admin todo, encargado ve los suyos ═══
CREATE POLICY "almacenes_select" ON public.almacenes FOR SELECT TO authenticated
  USING (public.es_admin() OR id = ANY(public.mis_almacenes()));
CREATE POLICY "almacenes_write" ON public.almacenes FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- ═══ CATÁLOGOS: lectura para todos, admin escribe ═══
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['categorias','marcas','modelos','estados_equipo','proveedores']) LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "%s_write" ON public.%I FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());', t, t);
  END LOOP;
END $$;

-- ═══ ACTIVOS: admin/auditor todo, encargado/tecnico sus almacenes ═══
CREATE POLICY "activos_select" ON public.activos FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR public.rol_actual() = 'Auditor'
    OR public.tiene_acceso_almacen(almacen_id)
  );
CREATE POLICY "activos_write" ON public.activos FOR ALL TO authenticated
  USING (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  )
  WITH CHECK (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  );

-- ═══ ITEMS: todos leen, admin y encargado escriben ═══
CREATE POLICY "items_select" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_write" ON public.items FOR ALL TO authenticated
  USING (public.es_admin() OR public.rol_actual() = 'Encargado de almacén')
  WITH CHECK (public.es_admin() OR public.rol_actual() = 'Encargado de almacén');

-- ═══ STOCK: admin/auditor todo, encargado/tecnico sus almacenes ═══
CREATE POLICY "stock_select" ON public.stock FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR public.rol_actual() = 'Auditor'
    OR public.tiene_acceso_almacen(almacen_id)
  );
CREATE POLICY "stock_write" ON public.stock FOR ALL TO authenticated
  USING (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  )
  WITH CHECK (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  );

-- ═══ MOVIMIENTOS: lectura según almacenes, inserción abierta a autenticados (inmutable) ═══
CREATE POLICY "movimientos_select" ON public.movimientos FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR public.rol_actual() = 'Auditor'
    OR public.tiene_acceso_almacen(almacen_origen_id)
    OR public.tiene_acceso_almacen(almacen_destino_id)
  );
CREATE POLICY "movimientos_insert" ON public.movimientos FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══ ASIGNACIONES ═══
CREATE POLICY "asignaciones_select" ON public.asignaciones FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR public.rol_actual() = 'Auditor'
    OR public.tiene_acceso_almacen(almacen_id)
  );
CREATE POLICY "asignaciones_write" ON public.asignaciones FOR ALL TO authenticated
  USING (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  )
  WITH CHECK (
    public.es_admin()
    OR (public.rol_actual() IN ('Encargado de almacén','Técnico') AND public.tiene_acceso_almacen(almacen_id))
  );

-- ═══ MANTENIMIENTOS ═══
CREATE POLICY "mantenimientos_select" ON public.mantenimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "mantenimientos_write" ON public.mantenimientos FOR ALL TO authenticated
  USING (public.es_admin() OR public.rol_actual() IN ('Encargado de almacén','Técnico'))
  WITH CHECK (public.es_admin() OR public.rol_actual() IN ('Encargado de almacén','Técnico'));

-- ═══ ADJUNTOS ═══
CREATE POLICY "adjuntos_select" ON public.adjuntos FOR SELECT TO authenticated USING (true);
CREATE POLICY "adjuntos_insert" ON public.adjuntos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "adjuntos_delete" ON public.adjuntos FOR DELETE TO authenticated
  USING (public.es_admin() OR subido_por = auth.uid());

-- ═══ AUDITORIA: solo admin y auditor leen ═══
CREATE POLICY "auditoria_select" ON public.auditoria FOR SELECT TO authenticated
  USING (public.es_admin() OR public.rol_actual() = 'Auditor');

-- ═════════════════════════════════════════════════════════════════════
-- PARTE 3: TRIGGERS DE AUDITORÍA AUTOMÁTICA
-- ═════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auditar_cambio()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_registro_id text;
  v_accion text;
BEGIN
  v_accion := TG_OP;

  IF TG_OP = 'DELETE' THEN
    v_registro_id := OLD.id::text;
  ELSE
    v_registro_id := NEW.id::text;
  END IF;

  INSERT INTO public.auditoria (
    tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id
  ) VALUES (
    TG_TABLE_NAME,
    v_registro_id,
    v_accion,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger a tablas críticas
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['activos','stock','usuarios','almacenes','movimientos','asignaciones']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.auditar_cambio();', t, t);
  END LOOP;
END $$;

-- ═════════════════════════════════════════════════════════════════════
-- PARTE 4: FUNCIONES RPC TRANSACCIONALES
-- ═════════════════════════════════════════════════════════════════════

-- 1. RPC: Transferir activo entre almacenes
CREATE OR REPLACE FUNCTION public.transferir_activo(
  p_activo_id int,
  p_almacen_destino int,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_origen int;
BEGIN
  SELECT almacen_id INTO v_origen FROM public.activos WHERE id = p_activo_id;

  UPDATE public.activos
  SET almacen_id = p_almacen_destino, updated_at = now()
  WHERE id = p_activo_id;

  INSERT INTO public.movimientos (
    tipo, activo_id, almacen_origen_id, almacen_destino_id, motivo, created_by
  ) VALUES (
    'transferencia', p_activo_id, v_origen, p_almacen_destino, p_motivo, auth.uid()
  );
END;
$$;

-- 2. RPC: Asignar activo a usuario
CREATE OR REPLACE FUNCTION public.asignar_equipo(
  p_activo_id int,
  p_usuario_id uuid,
  p_notas text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_almacen int;
  v_estado_asignado int;
BEGIN
  SELECT almacen_id INTO v_almacen FROM public.activos WHERE id = p_activo_id;
  SELECT id INTO v_estado_asignado FROM public.estados_equipo WHERE nombre = 'Asignado' LIMIT 1;

  -- Cerrar asignaciones previas del mismo activo
  UPDATE public.asignaciones
  SET fecha_devolucion = now(), estado = 'devuelta'
  WHERE activo_id = p_activo_id AND estado = 'activa';

  -- Actualizar activo
  UPDATE public.activos
  SET estado_id = v_estado_asignado, asignado_a = p_usuario_id, updated_at = now()
  WHERE id = p_activo_id;

  -- Crear asignación
  INSERT INTO public.asignaciones (
    activo_id, asignado_a, almacen_id, estado, notas, created_by
  ) VALUES (
    p_activo_id, p_usuario_id, v_almacen, 'activa', p_notas, auth.uid()
  );

  -- Registrar movimiento
  INSERT INTO public.movimientos (
    tipo, activo_id, usuario_destino_id, motivo, created_by
  ) VALUES (
    'asignacion', p_activo_id, p_usuario_id, COALESCE(p_notas, 'Asignación a usuario'), auth.uid()
  );
END;
$$;

-- 3. RPC: Devolver equipo
CREATE OR REPLACE FUNCTION public.devolver_equipo(
  p_activo_id int,
  p_notas text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_estado_disponible int;
  v_usuario uuid;
BEGIN
  SELECT id INTO v_estado_disponible FROM public.estados_equipo WHERE nombre = 'Disponible' LIMIT 1;
  SELECT asignado_a INTO v_usuario FROM public.activos WHERE id = p_activo_id;

  UPDATE public.asignaciones
  SET fecha_devolucion = now(), estado = 'devuelta', notas = COALESCE(p_notas, notas)
  WHERE activo_id = p_activo_id AND estado = 'activa';

  UPDATE public.activos
  SET estado_id = v_estado_disponible, asignado_a = NULL, updated_at = now()
  WHERE id = p_activo_id;

  INSERT INTO public.movimientos (
    tipo, activo_id, usuario_destino_id, motivo, created_by
  ) VALUES (
    'devolucion', p_activo_id, v_usuario, COALESCE(p_notas, 'Devolución de activo'), auth.uid()
  );
END;
$$;

-- 4. RPC: Ajustar stock de insumos
CREATE OR REPLACE FUNCTION public.ajustar_stock(
  p_item_id int,
  p_almacen_id int,
  p_cantidad int,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_anterior int;
BEGIN
  SELECT cantidad INTO v_anterior FROM public.stock
  WHERE item_id = p_item_id AND almacen_id = p_almacen_id;

  IF NOT FOUND THEN
    INSERT INTO public.stock (item_id, almacen_id, cantidad, ultimo_conteo)
    VALUES (p_item_id, p_almacen_id, p_cantidad, now());
    v_anterior := 0;
  ELSE
    UPDATE public.stock
    SET cantidad = p_cantidad, ultimo_conteo = now(), updated_at = now()
    WHERE item_id = p_item_id AND almacen_id = p_almacen_id;
  END IF;

  INSERT INTO public.movimientos (
    tipo, item_id, cantidad, almacen_origen_id, motivo, created_by
  ) VALUES (
    'ajuste', p_item_id, ABS(p_cantidad - v_anterior),
    p_almacen_id, p_motivo, auth.uid()
  );
END;
$$;

-- 5. RPC: Registrar entrada de inventario
CREATE OR REPLACE FUNCTION public.registrar_entrada_inventario(
  p_item_id int,
  p_almacen_id int,
  p_cantidad int,
  p_documento text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stock (item_id, almacen_id, cantidad, ultimo_conteo)
  VALUES (p_item_id, p_almacen_id, p_cantidad, now())
  ON CONFLICT (item_id, almacen_id)
  DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad,
                ultimo_conteo = now(),
                updated_at = now();

  INSERT INTO public.movimientos (
    tipo, item_id, cantidad, almacen_destino_id, documento, motivo, created_by
  ) VALUES (
    'entrada', p_item_id, p_cantidad, p_almacen_id, p_documento,
    COALESCE(p_documento, 'Entrada de inventario'), auth.uid()
  );
END;
$$;

-- Permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.transferir_activo TO authenticated;
GRANT EXECUTE ON FUNCTION public.asignar_equipo TO authenticated;
GRANT EXECUTE ON FUNCTION public.devolver_equipo TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_inventario TO authenticated;

-- Notificar a PostgREST para recargar esquema
NOTIFY pgrst, 'reload schema';
