import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('@app/features/auth/login/login').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@app/shared/layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@app/features/dashboard/dashboard').then((m) => m.DashboardComponent)
      },
      {
        path: 'almacenes',
        loadComponent: () =>
          import('@app/features/almacenes/almacenes').then((m) => m.AlmacenesComponent)
      },
      {
        path: 'catalogos',
        children: [
          { path: '', redirectTo: 'categorias', pathMatch: 'full' },
          {
            path: 'categorias',
            loadComponent: () =>
              import('@app/features/catalogos/categorias/categorias').then(m => m.CategoriasComponent)
          },
          {
            path: 'marcas',
            loadComponent: () =>
              import('@app/features/catalogos/marcas/marcas').then(m => m.MarcasComponent)
          },
          {
            path: 'modelos',
            loadComponent: () =>
              import('@app/features/catalogos/modelos/modelos').then(m => m.ModelosComponent)
          },
          {
            path: 'estados',
            loadComponent: () =>
              import('@app/features/catalogos/estados/estados').then(m => m.EstadosComponent)
          },
          {
            path: 'proveedores',
            loadComponent: () =>
              import('@app/features/catalogos/proveedores/proveedores').then(m => m.ProveedoresComponent)
          }
        ]
      },
      {
        path: 'activos',
        loadComponent: () =>
          import('@app/features/activos/activos').then((m) => m.ActivosComponent)
      },
      {
        path: 'activos/:id',
        loadComponent: () =>
          import('@app/features/activos/activo-detalle').then((m) => m.ActivoDetalleComponent)
      },
      {
        path: 'items',
        loadComponent: () =>
          import('@app/features/items/items').then((m) => m.ItemsComponent)
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('@app/features/stock/stock').then((m) => m.StockComponent)
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('@app/features/movimientos/movimientos').then((m) => m.MovimientosComponent)
      },
      {
        path: 'asignaciones',
        loadComponent: () =>
          import('@app/features/asignaciones/asignaciones').then((m) => m.AsignacionesComponent)
      },
      {
        path: 'mantenimientos',
        loadComponent: () =>
          import('@app/features/mantenimientos/mantenimientos').then((m) => m.MantenimientosComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('@app/features/usuarios/usuarios').then((m) => m.UsuariosComponent)
      },
      {
        path: 'auditoria',
        loadComponent: () =>
          import('@app/features/auditoria/auditoria').then((m) => m.AuditoriaComponent)
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('@app/features/reportes/reportes').then((m) => m.ReportesComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
