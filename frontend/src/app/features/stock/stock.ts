import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { AjustarStockDialogComponent } from './ajustar-stock-dialog';
import { RegistrarEntradaDialogComponent } from './registrar-entrada-dialog';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatCheckboxModule, MatButtonModule
  ],
  templateUrl: './stock.html'
})
export class StockComponent implements OnInit {
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly almacenes = signal<{ value: number; label: string }[]>([]);
  readonly almacenSeleccionado = signal<number | null>(null);
  readonly stockList = signal<any[]>([]);
  readonly cargando = signal(false);

  readonly filtroBusqueda = signal<string>('');
  readonly soloStockBajo = signal<boolean>(false);

  readonly stockFiltrado = computed(() => {
    let list = this.stockList();
    if (this.soloStockBajo()) {
      list = list.filter(s => s.cantidad <= (s.items?.stock_minimo ?? 0));
    }
    const q = this.filtroBusqueda().trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        String(s.items?.sku ?? '').toLowerCase().includes(q) ||
        String(s.items?.nombre ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarAlmacenes();
  }

  async cargarAlmacenes(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('almacenes', {
        filters: { activo: true },
        orderBy: { column: 'nombre' }
      });
      const opts = rows.map(a => ({ value: a.id, label: a.nombre }));
      this.almacenes.set(opts);
      if (opts.length > 0) {
        this.almacenSeleccionado.set(opts[0].value);
        await this.cargarStock();
      }
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar almacenes', 'Cerrar', { duration: 4000 });
    }
  }

  async onAlmacenChange(id: number): Promise<void> {
    this.almacenSeleccionado.set(id);
    await this.cargarStock();
  }

  async cargarStock(): Promise<void> {
    const almId = this.almacenSeleccionado();
    if (!almId) {
      this.stockList.set([]);
      return;
    }
    this.cargando.set(true);
    try {
      const { data, error } = await this.supa.supabase
        .from('stock')
        .select('*, items(sku, nombre, unidad, stock_minimo), almacenes(nombre)')
        .eq('almacen_id', almId)
        .order('id', { ascending: true });

      if (error) throw error;
      this.stockList.set(data ?? []);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar stock', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  abrirAjustar(fila: any): void {
    this.dialog.open(AjustarStockDialogComponent, {
      width: '420px',
      data: {
        stockId: fila.id,
        itemId: fila.item_id,
        almacenId: fila.almacen_id,
        itemNombre: fila.items?.nombre ?? 'Ítem',
        itemSku: fila.items?.sku ?? '',
        unidad: fila.items?.unidad ?? 'uds',
        cantidadActual: fila.cantidad
      }
    }).afterClosed().subscribe(ok => ok && this.cargarStock());
  }

  abrirRegistrarEntrada(): void {
    this.dialog.open(RegistrarEntradaDialogComponent, {
      width: '440px',
      data: { almacenId: this.almacenSeleccionado() }
    }).afterClosed().subscribe(ok => ok && this.cargarStock());
  }
}
