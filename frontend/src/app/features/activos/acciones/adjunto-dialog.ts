import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

export interface AdjuntoDialogData {
  activoId: number;
}

@Component({
  selector: 'app-adjunto-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Subir adjunto</h2>
      <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-slate-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <span class="text-sm text-slate-600">{{ archivo()?.name || 'Imagen o PDF' }}</span>
        <span class="text-xs text-slate-400">Máx. 10 MB</span>
        <input type="file" class="hidden" accept="image/*,application/pdf" (change)="onFile($event)" />
      </label>
      <div class="flex justify-end gap-2 mt-5">
        <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
        <button type="button" mat-flat-button color="primary"
          [disabled]="!archivo() || subiendo()" (click)="subir()">
          {{ subiendo() ? 'Subiendo…' : 'Subir' }}
        </button>
      </div>
    </div>
  `
})
export class AdjuntoDialogComponent {
  readonly data = inject<AdjuntoDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AdjuntoDialogComponent>);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private supa = inject(SupabaseService);

  readonly archivo = signal<File | null>(null);
  readonly subiendo = signal(false);

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      this.snack.open('El archivo supera 10 MB', 'Cerrar', { duration: 3000 });
      return;
    }
    this.archivo.set(file);
  }

  async subir(): Promise<void> {
    const file = this.archivo();
    if (!file) return;
    this.subiendo.set(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `activos/${this.data.activoId}/${Date.now()}-${safe}`;
      const { error } = await this.supa.supabase.storage.from('adjuntos').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined
      });
      if (error) throw error;
      const { data: pub } = this.supa.supabase.storage.from('adjuntos').getPublicUrl(path);
      await this.crud.crear('adjuntos', {
        entidad: 'activo',
        entidad_id: this.data.activoId,
        archivo_url: pub.publicUrl,
        nombre_archivo: file.name,
        tipo_mime: file.type || 'application/octet-stream',
        subido_por: this.auth.currentUser()?.id ?? null
      });
      this.snack.open('Archivo subido', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al subir (¿existe el bucket adjuntos?)', 'Cerrar', { duration: 5000 });
    } finally {
      this.subiendo.set(false);
    }
  }
}
