import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();

    try {
      const result = await this.auth.signIn(email!, password!);
      if (result.success) {
        await this.router.navigate(['/dashboard']);
      } else {
        let msg = result.error ?? 'Error al iniciar sesión';
        if (msg === 'Invalid login credentials') {
          msg = 'Credenciales inválidas. Comprueba tu correo y contraseña.';
        } else if (msg === 'Email not confirmed') {
          msg = 'El correo no está confirmado en Supabase Auth. Ejecuta el comando SQL en Supabase para habilitar el acceso.';
        }
        this.errorMessage.set(msg);
      }
    } catch {
      this.errorMessage.set('Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      this.loading.set(false);
    }
  }
}
