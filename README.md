# SisInventario

Sistema integral de gestión y control de inventario de equipos informáticos, periféricos e insumos tecnológicos por almacén.

## Stack Tecnológico
- **Frontend**: Angular 21 (arquitectura standalone, signals reactivas, control de flujo `@if` / `@for`)
- **Estilos & UI**: Tailwind CSS 3 + Angular Material 21 + Chart.js / ng2-charts
- **Backend / Database**: Supabase (PostgreSQL 15+, Supabase Auth, Storage para adjuntos, Row Level Security granular y Triggers automáticos de auditoría)
- **Reportes & Exportación**: jsPDF + jspdf-autotable (PDF con tablas y logos) y xlsx (hojas de cálculo Excel)
- **Hardware & QR**: @zxing/browser con escáner de cámara integrado e impresión de etiquetas QR

---

## Requisitos Previos e Instalación
1. Clonar el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd SisInventario/frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```

---

## Variables de Entorno
Configurar `src/environments/environment.ts` (desarrollo) y `src/environments/environment.prod.ts` (producción):
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://flkv********phuwmirl.supabase.co',
  supabaseAnonKey: 'TU_SUPABASE_ANON_KEY'
};
```

---

## Comandos Principales
- `npm start` o `ng serve` → Servidor de desarrollo en `http://localhost:4200`
- `npm run build` o `ng build --configuration production` → Compilación optimizada para producción
- `npm test` → Pruebas unitarias con Vitest

---

## Base de Datos (Supabase)
Ejecutar en el **SQL Editor de Supabase** en el siguiente orden secuencial:
1. `supabase_schema.sql` → Tablas, relaciones, catálogos base, RLS inicial y datos de prueba.
2. `supabase_iteracion_9.sql` → Funciones helper (`rol_actual`, `es_admin`), políticas RLS avanzadas por rol y almacén, trigger de auditoría automática (`auditar_cambio`), y procedimientos RPC atómicos (`transferir_activo`, `asignar_equipo`, `devolver_equipo`, `ajustar_stock`, `registrar_entrada_inventario`).

---

## Estructura del Proyecto
- `src/app/core/`:
  - `guards/`: Control de rutas autenticadas y verificación de roles (`auth.guard`, `role.guard`).
  - `interceptors/`: Manejo global de errores HTTP y red (`error.interceptor`).
  - `models/`: Interfaces TypeScript de las entidades del dominio.
  - `services/`: `AuthService`, `SupabaseService`, `CrudService`.
  - `utils/`: Utilidades para exportación (`export.util.ts`) y notificaciones (`toast.util.ts`).
- `src/app/shared/`:
  - `components/`: Componentes reutilizables (`crud-table`, `crud-form`, `confirm-dialog`, `loading-skeleton`, `breadcrumbs`).
  - `layout/`: Estructura principal con barra lateral responsiva, barra superior y menú de usuario (`shell`).
- `src/app/features/`:
  - `dashboard/`: KPIs en tiempo real, gráficos de barras y donas de distribución.
  - `almacenes/`: Gestión de almacenes y ubicaciones físicas.
  - `catalogos/`: Categorías, marcas, modelos, estados de equipo y proveedores.
  - `activos/`: Lista de equipos, filtros avanzados, detalle multi-tab, escáner QR, y acciones transaccionales.
  - `items/` & `stock/`: Gestión de insumos y consumibles, ajustes y entradas de inventario.
  - `movimientos/`, `asignaciones/`, `mantenimientos/`: Vistas operativas y devoluciones.
  - `usuarios/`: Control de accesos y asignación de almacenes.
  - `auditoria/`: Registro histórico inmutable con comparación visual de diffs (antes vs después).
  - `reportes/`: Generación de reportes ejecutivos con exportación a PDF y Excel.

---

## Roles y Niveles de Acceso
1. **Administrador**: Control total del sistema, configuración de almacenes, catálogos y gestión de usuarios.
2. **Encargado de almacén**: Operación y control de stock, activos y movimientos exclusivamente de sus almacenes asignados.
3. **Técnico**: Asignación, devolución y registro de mantenimientos en los almacenes autorizados.
4. **Auditor**: Acceso de solo lectura a todos los registros, movimientos y bitácora completa de auditoría.

---

## Despliegue en Producción

### Opción A: Vercel
1. Conectar el repositorio en [vercel.com](https://vercel.com).
2. Framework: **Angular**
3. Root Directory: `frontend` (o `.` si se utiliza el `vercel.json` raíz).
4. Build Command: `npm run build -- --configuration production`
5. Output Directory: `dist/frontend/browser`
6. Las reglas de rewrite a `/index.html` ya se encuentran provistas en `vercel.json`.

### Opción B: Netlify
1. Conectar el repositorio en [netlify.com](https://netlify.com).
2. El archivo `netlify.toml` preconfigurado detectará automáticamente el comando de build y la ruta de publicación `dist/frontend/browser`.
