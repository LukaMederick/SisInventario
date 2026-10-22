import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { CatalogPageComponent } from '../catalog-page';
import { ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CampoFormDef } from '@app/shared/components/crud-form/crud-form';

const COLUMNAS: ColumnaDef[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripción' }
];

const CAMPOS: CampoFormDef[] = [
  { nombre: 'nombre', label: 'Nombre', tipo: 'text', validators: [Validators.required], columnas: 2 },
  { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', columnas: 2 }
];

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CatalogPageComponent],
  template: `
    <app-catalog-page
      titulo="Categorías"
      tabla="categorias"
      [columnas]="columnas"
      [campos]="campos"
      orderCol="nombre"
    />
  `
})
export class CategoriasComponent {
  readonly columnas = COLUMNAS;
  readonly campos = CAMPOS;
}
