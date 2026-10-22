import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { CatalogPageComponent } from '../catalog-page';
import { ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CampoFormDef } from '@app/shared/components/crud-form/crud-form';

const COLUMNAS: ColumnaDef[] = [
  { key: 'nombre', label: 'Nombre' }
];

const CAMPOS: CampoFormDef[] = [
  { nombre: 'nombre', label: 'Nombre de la Marca', tipo: 'text', validators: [Validators.required], columnas: 2 }
];

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CatalogPageComponent],
  template: `
    <app-catalog-page
      titulo="Marcas"
      tabla="marcas"
      [columnas]="columnas"
      [campos]="campos"
      orderCol="nombre"
    />
  `
})
export class MarcasComponent {
  readonly columnas = COLUMNAS;
  readonly campos = CAMPOS;
}
