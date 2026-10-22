import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '@app/core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  roles?: string[];
  children?: { label: string; route: string; icon: string }[];
}

import { BreadcrumbsComponent } from '@app/shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    BreadcrumbsComponent
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private router = inject(Router);

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly catalogOpen = signal<boolean>(false);
  readonly mobileMenuOpen = signal<boolean>(false);

  readonly user = computed(() => this.auth.currentUser());
  readonly userRole = computed(() => this.auth.userRole() ?? 'Usuario');
  readonly userInitials = computed(() => {
    const name = this.user()?.nombre_completo ?? 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleCatalog(): void {
    this.catalogOpen.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }
}
