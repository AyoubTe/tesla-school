import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'error' | 'info' | 'live';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  link?: string | null;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

/** Toasts, confirmation dialogs and the colour theme — small app-wide UI state. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);
  readonly confirmation = signal<ConfirmRequest | null>(null);
  readonly theme = signal<'light' | 'dark'>(this.initialTheme());

  toast(kind: ToastKind, title: string, message?: string, link?: string | null, ttl = 4500) {
    const id = ++this.seq;
    this.toasts.update(list => [...list.slice(-3), { id, kind, title, message, link }]);
    setTimeout(() => this.dismiss(id), ttl);
  }
  ok(title: string, message?: string) { this.toast('ok', title, message); }
  error(title: string, message?: string) { this.toast('error', title, message, null, 6500); }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  confirm(title: string, message: string, confirmLabel: string, danger = true): Promise<boolean> {
    return new Promise(resolve => {
      this.confirmation.set({
        title, message, confirmLabel, danger,
        resolve: ok => { this.confirmation.set(null); resolve(ok); },
      });
    });
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.dataset['theme'] = next;
    try { localStorage.setItem('tesla.theme', next); } catch { /* ignore */ }
  }

  private initialTheme(): 'light' | 'dark' {
    const set = document.documentElement.dataset['theme'];
    if (set === 'light' || set === 'dark') return set;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
