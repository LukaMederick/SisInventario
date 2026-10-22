import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  ruta?: string;
}

const NOMBRES_RUTAS: Record<string, string> = {
  dashboard: 'Dashboard',
  almacenes: 'Almacenes',
  categorias: 'Categorías',
  marcas: 'Marcas',
  modelos: 'Modelos',
  estados: 'Estados de Equipo',
  proveedores: 'Proveedores',
  activos: 'Activos',
  items: 'Insumos',
  stock: 'Stock',
  movimientos: 'Movimientos',
  asignaciones: 'Asignaciones',
  mantenimientos: 'Mantenimientos',
  usuarios: 'Usuarios',
  auditoria: 'Auditoría',
  reportes: 'Reportes'
};

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav aria-label="Breadcrumb" class="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
      <a
        routerLink="/dashboard"
        class="inline-flex items-center gap-1 hover:text-indigo-600 transition font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
          <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clip-rule="evenodd" />
        </svg>
        <span>Inicio</span>
      </a>

      @for (item of migas(); track $index; let last = $last) {
        <span class="text-slate-300">/</span>

        @if (!last && item.ruta) {
          <a
            [routerLink]="item.ruta"
            class="hover:text-indigo-600 transition font-medium capitalize"
          >
            {{ item.label }}
          </a>
        } @else {
          <span class="font-semibold text-slate-800 capitalize">{{ item.label }}</span>
        }
      }
    </nav>
  `
})
export class BreadcrumbsComponent {
  private router = inject(Router);

  readonly items = input<BreadcrumbItem[]>([]);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    )
  );

  readonly migas = computed<BreadcrumbItem[]>(() => {
    const custom = this.items();
    if (custom && custom.length > 0) {
      return custom;
    }

    const url = this.currentUrl() || '';
    const segments = url.split('?')[0].split('/').filter(Boolean);

    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return [];
    }

    const result: BreadcrumbItem[] = [];
    let acc = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      acc += `/${seg}`;
      const nombre = NOMBRES_RUTAS[seg] || seg;
      result.push({
        label: nombre,
        ruta: i === segments.length - 1 ? undefined : acc
      });
    }

    return result;
  });
}
