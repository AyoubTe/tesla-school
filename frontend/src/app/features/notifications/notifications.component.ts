import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AppNotification, Page } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { NOTIFICATION_ICONS } from '../../layout/notification-bell.component';
import { IconComponent } from '../../shared/icon.component';
import { PagerComponent } from '../../shared/pager.component';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, IconComponent, PagerComponent],
  template: `
    <div class="page-head">
      <div><h1>Notifications</h1><p>Everything sent to you, newest first. New ones arrive live while you're signed in.</p></div>
      @if (rt.unread() > 0) {
        <button type="button" class="btn" (click)="markAll()"><app-icon name="check-all" [size]="17" /> Mark all as read</button>
      }
    </div>
    <section class="panel">
      @for (n of page()?.content ?? []; track n.id) {
        <button type="button" class="item" [class.unread]="!n.read" (click)="open(n)">
          <span class="ic"><app-icon [name]="icon(n.type)" [size]="17" /></span>
          <span class="txt"><strong>{{ n.title }}</strong>@if (n.message) {<span>{{ n.message }}</span>}</span>
          <time>{{ n.createdAt | date: 'd MMM, HH:mm' }}</time>
        </button>
      } @empty {
        <div class="empty"><app-icon name="bell" [size]="30" /><h3>You're all caught up</h3><p>Nothing has been sent to you yet.</p></div>
      }
      <app-pager [page]="page()" (change)="load($event)" />
    </section>
  `,
  styles: `
    .item { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 22px; border: 0; background: none;
            border-bottom: 1px solid var(--line); text-align: left; cursor: pointer; }
    .item:hover { background: var(--surface-2); }
    .item.unread { background: color-mix(in srgb, var(--arc-soft) 55%, transparent); }
    .item.unread strong::after { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%;
            background: var(--arc); margin-left: 8px; vertical-align: middle; }
    .ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; flex: none;
          background: var(--surface-3); color: var(--muted); }
    .unread .ic { background: var(--arc-soft); color: var(--arc); }
    .txt { flex: 1; display: flex; flex-direction: column; min-width: 0; font-size: .92rem; }
    .txt span { color: var(--muted); }
    time { font-size: .8rem; color: var(--muted); white-space: nowrap; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly rt = inject(RealtimeService);
  readonly page = signal<Page<AppNotification> | null>(null);

  constructor() {
    // Reload page one when a live notification arrives.
    effect(() => { this.rt.pulse(); untracked(() => this.load(this.page()?.page ?? 0)); });
  }

  load(p: number) { this.api.notifications(p, 20).subscribe(page => this.page.set(page)); }

  icon(t: string) { return NOTIFICATION_ICONS[t] ?? 'bell'; }

  open(n: AppNotification) {
    if (!n.read) {
      this.rt.markRead(n);
      this.page.update(p => p ? { ...p, content: p.content.map(x => x.id === n.id ? { ...x, read: true } : x) } : p);
    }
    if (n.link) void this.router.navigateByUrl(n.link);
  }

  markAll() {
    this.rt.markAllRead();
    this.page.update(p => p ? { ...p, content: p.content.map(x => ({ ...x, read: true })) } : p);
  }
}
