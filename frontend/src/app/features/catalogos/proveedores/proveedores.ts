import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
import { CatalogPageComponent } from '../catalog-page';
import { ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CampoFormDef } from '@app/shared/components/crud-form/crud-form';

const COLUMNAS: ColumnaDef[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'ruc', label: 'RUC' },
  { key: 'contacto', label: 'Contacto' },
  { key: 'telefono', label: 'Teléfono' }
];

const CAMPOS: CampoFormDef[] = [
  { nombre: 'nombre', label: 'Razón Social', tipo: 'text', validators: [Validators.required], columnas: 2 },
  { nombre: 'ruc', label: 'RUC', tipo: 'text', placeholder: '20123456789', columnas: 1 },
  { nombre: 'contacto', label: 'Persona de Contacto', tipo: 'text', columnas: 1 },
  { nombre: 'telefono', label: 'Teléfono', tipo: 'text', columnas: 1 },
  { nombre: 'email', label: 'Correo Electrónico', tipo: 'email', columnas: 1 },
  { nombre: 'direccion', label: 'Dirección', tipo: 'textarea', columnas: 2 }
];

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CatalogPageComponent],
  template: `
    <app-catalog-page
      titulo="Proveedores"
      tabla="proveedores"
      [columnas]="columnas"
      [campos]="campos"
      orderCol="nombre"
    />
  `
})
export class ProveedoresComponent {
  readonly columnas = COLUMNAS;
  readonly campos = CAMPOS;
}
