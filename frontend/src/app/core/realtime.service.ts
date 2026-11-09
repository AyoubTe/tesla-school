import { Injectable, computed, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AppNotification } from './models';
import { UiService } from './ui.service';

export type LinkState = 'offline' | 'connecting' | 'live';

/**
 * Live notifications over STOMP/WebSocket.
 * - /user/queue/notifications : personal notifications (persisted server-side)
 * - /topic/announcements      : school-wide broadcasts
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private client: Client | null = null;

  readonly state = signal<LinkState>('offline');
  readonly recent = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  /** Increments on every live arrival; the bell watches it to play its spark once. */
  readonly pulse = signal(0);
  readonly hasUnread = computed(() => this.unread() > 0);

  connect() {
    const token = this.auth.token();
    if (!token || this.client) return;
    this.refresh();

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    this.client = new Client({
      brokerURL: `${scheme}://${location.host}/ws`,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      beforeConnect: async () => { this.state.set('connecting'); },
      onConnect: () => {
        this.state.set('live');
        this.client?.subscribe('/user/queue/notifications', msg => this.onNotification(msg));
        this.client?.subscribe('/topic/announcements', msg => this.onBroadcast(msg));
      },
      onWebSocketClose: () => this.state.set(this.client?.active ? 'connecting' : 'offline'),
      onStompError: () => this.state.set('offline'),
    });
    this.client.activate();
  }

  disconnect() {
    void this.client?.deactivate();
    this.client = null;
    this.state.set('offline');
    this.recent.set([]);
    this.unread.set(0);
  }

  refresh() {
    this.api.notifications(0, 8).subscribe({ next: page => this.recent.set(page.content), error: () => {} });
    this.api.unreadCount().subscribe({ next: r => this.unread.set(r.count), error: () => {} });
  }

  markRead(n: AppNotification) {
    if (n.read) return;
    this.recent.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
    this.unread.update(c => Math.max(0, c - 1));
    this.api.markRead(n.id).subscribe({ error: () => this.refresh() });
  }

  markAllRead() {
    this.recent.update(list => list.map(x => ({ ...x, read: true })));
    this.unread.set(0);
    this.api.markAllRead().subscribe({ error: () => this.refresh() });
  }

  private onNotification(msg: IMessage) {
    const n = JSON.parse(msg.body) as AppNotification;
    this.recent.update(list => [n, ...list.filter(x => x.id !== n.id)].slice(0, 8));
    this.unread.update(c => c + 1);
    this.pulse.update(p => p + 1);
    this.ui.toast('live', n.title, n.message ?? undefined, n.link);
  }

  private onBroadcast(msg: IMessage) {
    // Personal copies of announcements also arrive on the user queue; the broadcast only refreshes lists.
    const b = JSON.parse(msg.body) as { title: string };
    window.dispatchEvent(new CustomEvent('tesla:announcement', { detail: b }));
  }
}
