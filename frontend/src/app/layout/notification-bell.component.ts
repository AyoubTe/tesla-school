import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppNotification } from '../core/models';
import { RealtimeService } from '../core/realtime.service';
import { IconComponent } from '../shared/icon.component';

export const NOTIFICATION_ICONS: Record<string, string> = {
  GRADE: 'trend', ATTENDANCE: 'clipboard', ANNOUNCEMENT: 'megaphone', ACCOUNT: 'key', SCHEDULE: 'calendar',
  SYSTEM: 'sparkles',
};

@Component({
  selector: 'app-notification-bell',
  imports: [IconComponent, RouterLink, DatePipe],
  template: `
    <div class="wrap">
      <button type="button" class="btn ghost icon bell" [class.spark]="sparking()" (click)="toggle()"
              [attr.aria-label]="rt.unread() ? rt.unread() + ' unread notifications' : 'Notifications'"
              [attr.aria-expanded]="open()">
        <app-icon [name]="rt.hasUnread() ? 'bell-ring' : 'bell'" />
        @if (rt.unread() > 0) { <span class="count">{{ rt.unread() > 99 ? '99+' : rt.unread() }}</span> }
      </button>

      @if (open()) {
        <div class="panel pop" role="dialog" aria-label="Notifications">
          <div class="head">
            <strong>Notifications</strong>
            @if (rt.unread() > 0) {
              <button type="button" class="btn ghost sm" (click)="rt.markAllRead()">
                <app-icon name="check-all" [size]="15" /> Mark all read
              </button>
            }
          </div>
          <div class="items">
            @for (n of rt.recent(); track n.id) {
              <button type="button" class="item" [class.unread]="!n.read" (click)="openItem(n)">
                <span class="ic"><app-icon [name]="icon(n.type)" [size]="16" /></span>
                <span class="txt">
                  <strong>{{ n.title }}</strong>
                  @if (n.message) { <span>{{ n.message }}</span> }
                  <time>{{ n.createdAt | date: 'MMM d, HH:mm' }}</time>
                </span>
              </button>
            } @empty {
              <div class="none">
                <app-icon name="bell" [size]="22" />
                <p>No notifications yet. Grades, attendance and announcements will show up here as they happen.</p>
              </div>
            }
          </div>
          <a routerLink="/notifications" class="all" (click)="open.set(false)">See all notifications</a>
        </div>
      }
    </div>
  `,
  styles: `
    .wrap { position: relative; }
    .bell { position: relative; }
    .count {
      position: absolute; top: 3px; right: 2px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
      background: var(--spark); color: #2b1800; font-size: .7rem; font-weight: 800; display: grid; place-items: center;
      border: 2px solid var(--paper);
    }
    .bell.spark app-icon { animation: ring .7s ease-in-out; color: var(--spark); }
    .bell.spark::after {
      content: ''; position: absolute; inset: 2px; border-radius: 50%; border: 2px solid var(--spark);
      animation: burst .8s ease-out forwards;
    }
    @keyframes ring { 20% { transform: rotate(14deg); } 40% { transform: rotate(-12deg); } 60% { transform: rotate(8deg); } 80% { transform: rotate(-4deg); } }
    @keyframes burst { from { opacity: .9; transform: scale(.7); } to { opacity: 0; transform: scale(1.6); } }

    .pop { position: absolute; right: -56px; top: calc(100% + 8px); width: min(380px, calc(100vw - 24px)); z-index: 30;
           box-shadow: var(--shadow-pop); overflow: hidden; animation: pop .14s ease-out; }
    @keyframes pop { from { opacity: 0; transform: translateY(-4px); } }
    .head { display: flex; justify-content: space-between; align-items: center; padding: 12px 12px 10px 16px;
            border-bottom: 1px solid var(--line); }
    .items { max-height: 380px; overflow-y: auto; }
    .item { display: flex; gap: 12px; width: 100%; padding: 12px 16px; border: 0; border-bottom: 1px solid var(--line);
            background: none; text-align: left; cursor: pointer; }
    .item:hover { background: var(--surface-2); }
    .item.unread { background: color-mix(in srgb, var(--arc-soft) 60%, transparent); }
    .ic { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none;
          background: var(--surface-3); color: var(--muted); }
    .unread .ic { background: var(--arc-soft); color: var(--arc); }
    .txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: .88rem; }
    .txt span { color: var(--muted); }
    time { font-size: .76rem; color: var(--muted); }
    .none { padding: 28px 22px; text-align: center; color: var(--muted); font-size: .88rem;
            display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .all { display: block; padding: 12px; text-align: center; font-weight: 600; font-size: .88rem; }
    @media (max-width: 520px) { .pop { right: -100px; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocClick($event)' },
})
export class NotificationBellComponent {
  readonly rt = inject(RealtimeService);
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly sparking = signal(false);

  constructor() {
    // Play the spark once per live arrival.
    let first = true;
    effect(() => {
      this.rt.pulse();
      if (first) { first = false; return; }
      this.sparking.set(false);
      requestAnimationFrame(() => this.sparking.set(true));
      setTimeout(() => this.sparking.set(false), 900);
    });
  }

  icon(type: string) { return NOTIFICATION_ICONS[type] ?? 'bell'; }

  toggle() {
    this.open.update(v => !v);
    if (this.open()) this.rt.refresh();
  }

  openItem(n: AppNotification) {
    this.rt.markRead(n);
    this.open.set(false);
    if (n.link) void this.router.navigateByUrl(n.link);
  }

  onDocClick(e: MouseEvent) {
    if (this.open() && !(e.target as HTMLElement).closest('app-notification-bell')) this.open.set(false);
  }
}
