import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Role } from '../core/models';
import { RealtimeService } from '../core/realtime.service';
import { UiService } from '../core/ui.service';
import { AvatarComponent, LogoComponent } from '../shared/brand';
import { IconComponent } from '../shared/icon.component';
import { NotificationBellComponent } from './notification-bell.component';

interface NavItem { label: string; path: string; icon: string; roles?: Role[]; exact?: boolean; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  { label: 'School', items: [
    { label: 'Dashboard', path: '/', icon: 'home', exact: true },
    { label: 'Timetable', path: '/timetable', icon: 'calendar' },
    { label: 'Announcements', path: '/announcements', icon: 'megaphone' },
  ] },
  { label: 'Learning', items: [
    { label: 'Courses', path: '/courses', icon: 'book' },
    { label: 'Grades', path: '/grades', icon: 'trend' },
    { label: 'Attendance', path: '/attendance', icon: 'clipboard' },
  ] },
  { label: 'People', items: [
    { label: 'Students', path: '/students', icon: 'cap', roles: ['ADMIN', 'TEACHER'] },
    { label: 'Teachers', path: '/teachers', icon: 'users' },
    { label: 'Classes', path: '/classes', icon: 'school' },
  ] },
  { label: 'Administration', items: [
    { label: 'Accounts', path: '/accounts', icon: 'shield', roles: ['ADMIN'] },
  ] },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, AvatarComponent,
    NotificationBellComponent],
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="side" aria-label="Main navigation">
        <a routerLink="/" class="brand">
          <app-logo [size]="34" />
          <span class="display">Tesla School</span>
        </a>

        <nav>
          @for (group of nav(); track group.label) {
            <div class="group">
              <span class="group-label">{{ group.label }}</span>
              @for (item of group.items; track item.path) {
                <a [routerLink]="item.path" routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: !!item.exact }" class="nav-link">
                  <app-icon [name]="item.icon" [size]="18" />
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>

        <div class="link-state" [class]="rt.state()" [attr.title]="linkLabel()">
          <svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
            @if (rt.state() === 'live') {
              <path class="wave" d="M0 12 Q12.5 0 25 12 T50 12 T75 12 T100 12 T125 12 T150 12 T175 12 T200 12" />
            } @else {
              <path class="flat" d="M0 12 H200" />
            }
          </svg>
          <span>{{ linkLabel() }}</span>
        </div>
      </aside>

      <button type="button" class="scrim" aria-label="Close menu" (click)="navOpen.set(false)"></button>

      <div class="main">
        <header class="top">
          <button type="button" class="btn ghost icon menu-btn" (click)="navOpen.set(true)" aria-label="Open menu">
            <app-icon name="menu" />
          </button>
          <div class="who">
            <span class="greeting">{{ greeting() }}, {{ auth.user()?.firstName }}</span>
            <span class="muted small">{{ roleLine() }}</span>
          </div>
          <div class="actions">
            <button type="button" class="btn ghost icon" (click)="ui.toggleTheme()"
                    [attr.aria-label]="ui.theme() === 'dark' ? 'Use light theme' : 'Use dark theme'">
              <app-icon [name]="ui.theme() === 'dark' ? 'sun' : 'moon'" />
            </button>
            <app-notification-bell />
            <div class="user-menu">
              <button type="button" class="user-btn" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()">
                <app-avatar [name]="auth.user()?.fullName ?? ''" [size]="34" />
              </button>
              @if (menuOpen()) {
                <div class="menu panel" role="menu">
                  <div class="menu-head">
                    <strong>{{ auth.user()?.fullName }}</strong>
                    <span class="muted small">{{ auth.user()?.email }}</span>
                  </div>
                  <a routerLink="/profile" class="menu-item" role="menuitem" (click)="menuOpen.set(false)">
                    <app-icon name="user" [size]="16" /> Profile and password
                  </a>
                  <button type="button" class="menu-item" role="menuitem" (click)="signOut()">
                    <app-icon name="logout" [size]="16" /> Sign out
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        @if (auth.user()?.mustChangePassword) {
          <div class="banner">
            <app-icon name="key" [size]="16" />
            <span>You're using a temporary password. Choose your own to keep your account secure.</span>
            <a routerLink="/profile">Change password</a>
          </div>
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'menuOpen.set(false); navOpen.set(false)' },
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly rt = inject(RealtimeService);
  private readonly router = inject(Router);

  readonly navOpen = signal(false);
  readonly menuOpen = signal(false);

  readonly nav = computed(() => {
    const role = this.auth.role();
    return NAV
      .map(g => ({ ...g, items: g.items.filter(i => !i.roles || (role && i.roles.includes(role))) }))
      .filter(g => g.items.length > 0);
  });

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  readonly roleLine = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    if (u.role === 'STUDENT') return u.className ? `Student, ${u.className}` : 'Student';
    return u.role === 'ADMIN' ? 'Administration' : 'Teacher';
  });

  readonly linkLabel = computed(() => ({
    live: 'Live updates on', connecting: 'Reconnecting…', offline: 'Live updates off',
  })[this.rt.state()]);

  constructor() {
    this.rt.connect();
    inject(DestroyRef).onDestroy(() => this.rt.disconnect());
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.navOpen.set(false);
      this.menuOpen.set(false);
    });
    // Close the user menu on any outside click.
    effect(onCleanup => {
      if (!this.menuOpen()) return;
      const close = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.user-menu')) this.menuOpen.set(false);
      };
      setTimeout(() => document.addEventListener('click', close));
      onCleanup(() => document.removeEventListener('click', close));
    });
  }

  signOut() {
    this.rt.disconnect();
    this.auth.logout();
  }
}
