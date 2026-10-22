import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BrowserQRCodeSvgWriter } from '@zxing/browser';

export interface QrDialogData {
  id: number;
  codigo_activo: string;
}

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[300px] max-w-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Código QR</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ data.codigo_activo }}</p>
        </div>
        <button type="button" (click)="cerrar()"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-col items-center gap-4">
        <div #qrContainer
          class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-center">
        </div>
        <p class="text-xs text-slate-500 text-center break-all px-2">{{ url }}</p>
        <button type="button" (click)="descargarPng()"
          class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Descargar PNG
        </button>
      </div>
    </div>
  `
})
export class QrDialogComponent implements AfterViewInit {
  readonly data = inject<QrDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<QrDialogComponent>);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('qrContainer');

  readonly url = `${window.location.origin}/activos/${this.data.id}`;
  private svgEl: SVGSVGElement | null = null;

  ngAfterViewInit(): void {
    const writer = new BrowserQRCodeSvgWriter();
    this.svgEl = writer.write(this.url, 240, 240);
    this.svgEl.setAttribute('class', 'w-60 h-60');
    this.container().nativeElement.appendChild(this.svgEl);
  }

  descargarPng(): void {
    if (!this.svgEl) return;
    const xml = new XMLSerializer().serializeToString(this.svgEl);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 480, 480);
      ctx.drawImage(img, 0, 0, 480, 480);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `QR-${this.data.codigo_activo}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  }

  cerrar(): void { this.dialogRef.close(); }
}
