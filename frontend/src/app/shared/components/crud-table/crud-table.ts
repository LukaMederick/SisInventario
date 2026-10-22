import {
  Component, input, output, signal, computed,
  OnChanges, SimpleChanges, viewChild, AfterViewInit
} from '@angular/core';
import { NgClass } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ColumnaDef {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'boolean' | 'date' | 'currency' | 'color';
  badgeClass?: (val: any) => string;
  /** Cuando type='color', clave alternativa con el hex (si `key` muestra el texto). */
  colorKey?: string;
}

@Component({
  selector: 'app-crud-table',
  standalone: true,
  imports: [
    NgClass,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  templateUrl: './crud-table.html',
  styleUrl: './crud-table.scss'
})
export class CrudTableComponent<T extends { id: number | string }> implements AfterViewInit, OnChanges {
  readonly titulo = input<string>('Registros');
  readonly columnas = input.required<ColumnaDef[]>();
  readonly filas = input<T[]>([]);
  readonly cargando = input<boolean>(false);
  readonly mostrarCrear = input<boolean>(true);
  readonly mostrarDetalle = input<boolean>(false);
  readonly mostrarQr = input<boolean>(false);

  readonly nuevo = output<void>();
  readonly editar = output<T>();
  readonly eliminar = output<T>();
  readonly verDetalle = output<T>();
  readonly verQr = output<T>();

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  readonly busqueda = signal<string>('');

  readonly dataSource = new MatTableDataSource<T>([]);

  readonly columnKeys = computed<string[]>(() => [
    ...this.columnas().map(c => c.key),
    'acciones'
  ]);

  readonly filasEsqueleto = [1, 2, 3, 4, 5];

  ngAfterViewInit(): void {
    const pg = this.paginator();
    const s = this.sort();
    if (pg) this.dataSource.paginator = pg;
    if (s) this.dataSource.sort = s;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filas']) {
      this.dataSource.data = this.filas();
    }
  }

  filtrar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.busqueda.set(valor);
    this.dataSource.filter = valor.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  getValor(fila: T, key: string): any {
    return (fila as any)[key];
  }

  onNuevo(): void { this.nuevo.emit(); }
  onEditar(fila: T): void { this.editar.emit(fila); }
  onEliminar(fila: T): void { this.eliminar.emit(fila); }
  onVerDetalle(fila: T): void { this.verDetalle.emit(fila); }
  onVerQr(fila: T): void { this.verQr.emit(fila); }
}
