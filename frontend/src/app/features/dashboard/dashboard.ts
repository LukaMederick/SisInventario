import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { SupabaseService } from '@app/core/services/supabase.service';

export interface DashboardKPIs {
  total: number;
  asignados: number;
  mantenimiento: number;
  stockBajo: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule,
    MatTableModule, BaseChartDirective
  ],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  private supa = inject(SupabaseService);

  readonly cargando = signal(true);
  readonly kpis = signal<DashboardKPIs>({ total: 0, asignados: 0, mantenimiento: 0, stockBajo: 0 });
  readonly movimientosRecientes = signal<any[]>([]);

  readonly barChartData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [{ data: [], label: 'Equipos', backgroundColor: '#6366f1', borderRadius: 8 }]
  });

  readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false } }
    }
  };

  readonly doughnutChartData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  });

  readonly doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } }
    }
  };

  async ngOnInit(): Promise<void> {
    await this.cargarDashboard();
  }

  async cargarDashboard(): Promise<void> {
    this.cargando.set(true);
    try {
      const [activosRes, stockRes, movimientosRes] = await Promise.all([
        this.supa.supabase
          .from('activos')
          .select('id, activo, estado_id, almacen_id, almacenes(nombre), estados_equipo(nombre, color)')
          .eq('activo', true),
        this.supa.supabase
          .from('stock')
          .select('cantidad, items(stock_minimo)'),
        this.supa.supabase
          .from('movimientos')
          .select(`
            *,
            activos(codigo_activo),
            items(sku, nombre),
            almacen_origen:almacenes!almacen_origen_id(nombre),
            almacen_destino:almacenes!almacen_destino_id(nombre)
          `)
          .order('fecha', { ascending: false })
          .limit(10)
      ]);

      const activos: any[] = (activosRes.data as any[]) ?? [];
      const stock: any[] = (stockRes.data as any[]) ?? [];
      const movimientos: any[] = (movimientosRes.data as any[]) ?? [];

      // Helper para extraer objeto simple de join
      const getEstado = (a: any) => Array.isArray(a.estados_equipo) ? a.estados_equipo[0] : a.estados_equipo;
      const getAlmacen = (a: any) => Array.isArray(a.almacenes) ? a.almacenes[0] : a.almacenes;
      const getItem = (s: any) => Array.isArray(s.items) ? s.items[0] : s.items;

      // 1. KPIs
      const total = activos.length;
      const asignados = activos.filter(a => getEstado(a)?.nombre === 'Asignado').length;
      const mantenimiento = activos.filter(a => getEstado(a)?.nombre === 'Mantenimiento').length;
      const stockBajo = stock.filter(s => s.cantidad <= (getItem(s)?.stock_minimo ?? 0)).length;

      this.kpis.set({ total, asignados, mantenimiento, stockBajo });

      // 2. Gráfico 1: Equipos por almacén
      const almacenesMap = new Map<string, number>();
      for (const a of activos) {
        const alm = getAlmacen(a)?.nombre || 'Sin almacén';
        almacenesMap.set(alm, (almacenesMap.get(alm) ?? 0) + 1);
      }
      const almLabels = Array.from(almacenesMap.keys());
      const almValues = Array.from(almacenesMap.values());
      this.barChartData.set({
        labels: almLabels,
        datasets: [{
          data: almValues,
          label: 'Cantidad de activos',
          backgroundColor: '#6366f1',
          borderRadius: 8
        }]
      });

      // 3. Gráfico 2: Equipos por estado
      const estadosMap = new Map<string, { count: number; color: string }>();
      for (const a of activos) {
        const estObj = getEstado(a);
        const nom = estObj?.nombre || 'Sin estado';
        const col = estObj?.color || '#94a3b8';
        const curr = estadosMap.get(nom) ?? { count: 0, color: col };
        curr.count += 1;
        estadosMap.set(nom, curr);
      }
      const estLabels: string[] = [];
      const estValues: number[] = [];
      const estColors: string[] = [];
      for (const [nom, item] of estadosMap.entries()) {
        estLabels.push(`${nom} (${item.count})`);
        estValues.push(item.count);
        estColors.push(item.color);
      }
      this.doughnutChartData.set({
        labels: estLabels,
        datasets: [{
          data: estValues,
          backgroundColor: estColors.length ? estColors : ['#6366f1', '#3b82f6', '#f59e0b', '#ef4444']
        }]
      });

      // 4. Actividad reciente
      this.movimientosRecientes.set(movimientos);
    } finally {
      this.cargando.set(false);
    }
  }

  tiempoRelativo(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    const diffMs = Date.now() - new Date(fechaStr).getTime();
    const diffSeg = Math.floor(diffMs / 1000);
    if (diffSeg < 60) return 'Hace un momento';
    const diffMin = Math.floor(diffSeg / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 30) return `Hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
    return new Date(fechaStr).toLocaleDateString();
  }

  tipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'entrada': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'salida': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'transferencia': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ajuste': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'asignacion': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'devolucion': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'baja': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }
}
