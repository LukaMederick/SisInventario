import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { CatalogPageComponent } from '../catalog-page';
import { ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CampoFormDef } from '@app/shared/components/crud-form/crud-form';

const COLUMNAS: ColumnaDef[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'color', label: 'Color', type: 'color' }
];

const CAMPOS: CampoFormDef[] = [
  { nombre: 'nombre', label: 'Nombre del Estado', tipo: 'text', validators: [Validators.required], columnas: 1 },
  { nombre: 'color', label: 'Color (hex)', tipo: 'text', placeholder: '#3b82f6', columnas: 1 },
  { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', columnas: 2 }
];

@Component({
  selector: 'app-estados',
  standalone: true,
  imports: [CatalogPageComponent],
  template: `
    <app-catalog-page
      titulo="Estados de Equipo"
      tabla="estados_equipo"
      [columnas]="columnas"
      [campos]="campos"
      orderCol="nombre"
      [valoresDefault]="valoresDefault"
    />
  `
})
export class EstadosComponent {
  readonly columnas = COLUMNAS;
  readonly campos = CAMPOS;
  readonly valoresDefault = { color: '#3b82f6' };
}
