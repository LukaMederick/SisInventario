import { Component, inject } from '@angular/core';
import { Validators } from '@angular/forms';
import { CatalogPageComponent } from '../catalog-page';
import { CrudService } from '@app/core/services/crud.service';
import { ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CampoFormDef } from '@app/shared/components/crud-form/crud-form';

const COLUMNAS: ColumnaDef[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: '_marca', label: 'Marca' },
  { key: '_categoria', label: 'Categoría' },
  { key: 'activo', label: 'Estado', type: 'boolean' }
];

@Component({
  selector: 'app-modelos',
  standalone: true,
  imports: [CatalogPageComponent],
  template: `
    <app-catalog-page
      titulo="Modelos de Equipo"
      tabla="modelos"
      [columnas]="columnas"
      [campos]="camposBase"
      selectQuery="*, marcas(nombre), categorias(nombre)"
      orderCol="nombre"
      [valoresDefault]="valoresDefault"
      [mapFila]="mapFila"
      [valoresEdit]="valoresEdit"
      [prepararCampos]="prepararCampos"
    />
  `
})
export class ModelosComponent {
  private crud = inject(CrudService);

  readonly columnas = COLUMNAS;
  readonly valoresDefault = { activo: true };
  readonly camposBase: CampoFormDef[] = [];

  readonly mapFila = (m: any) => ({
    ...m,
    _marca: m.marcas?.nombre ?? '—',
    _categoria: m.categorias?.nombre ?? '—'
  });

  readonly valoresEdit = (f: any) => ({
    nombre: f.nombre,
    marca_id: f.marca_id,
    categoria_id: f.categoria_id,
    activo: f.activo
  });

  readonly prepararCampos = async (): Promise<CampoFormDef[]> => {
    const [marcas, cats] = await Promise.all([
      this.crud.listar<any>('marcas', { orderBy: { column: 'nombre' } }),
      this.crud.listar<any>('categorias', { orderBy: { column: 'nombre' } })
    ]);
    return [
      { nombre: 'nombre', label: 'Nombre del Modelo', tipo: 'text', validators: [Validators.required], columnas: 2 },
      { nombre: 'marca_id', label: 'Marca', tipo: 'select', validators: [Validators.required], columnas: 1,
        opciones: marcas.map(m => ({ value: m.id, label: m.nombre })) },
      { nombre: 'categoria_id', label: 'Categoría', tipo: 'select', validators: [Validators.required], columnas: 1,
        opciones: cats.map(c => ({ value: c.id, label: c.nombre })) },
      { nombre: 'activo', label: 'Modelo activo', tipo: 'boolean', columnas: 2 }
    ];
  };
}
