import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
      <!-- Encabezado de skeleton -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <div class="h-4 w-40 bg-slate-200 rounded-full animate-pulse"></div>
        <div class="h-8 w-28 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>

      <!-- Cuadrícula de skeleton -->
      <div class="divide-y divide-slate-100 mt-2">
        @for (f of filasArray(); track f) {
          <div
            class="py-4 grid gap-4 items-center"
            [style.grid-template-columns]="'repeat(' + columnas() + ', minmax(0, 1fr))'"
          >
            @for (c of columnasArray(); track c) {
              <div
                class="h-3.5 bg-slate-100 rounded-full animate-pulse"
                [style.width]="c === 1 ? '85%' : (f % 2 === 0 ? '65%' : '45%')"
              ></div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class LoadingSkeletonComponent {
  readonly filas = input<number>(5);
  readonly columnas = input<number>(4);

  readonly filasArray = computed(() => Array.from({ length: this.filas() }, (_, i) => i + 1));
  readonly columnasArray = computed(() => Array.from({ length: this.columnas() }, (_, i) => i + 1));
}
