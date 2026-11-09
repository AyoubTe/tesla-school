import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

/** Global toast stack and confirmation dialog, mounted once in the root component. */
@Component({
  selector: 'app-overlays',
  imports: [IconComponent, ModalComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of ui.toasts(); track t.id) {
        <div class="toast" [class]="t.kind" role="status">
          <span class="mark">
            <app-icon [name]="t.kind === 'error' ? 'alert' : t.kind === 'live' ? 'zap' : 'check'" [size]="16" />
          </span>
          <div class="body">
            <strong>{{ t.title }}</strong>
            @if (t.message) { <span>{{ t.message }}</span> }
            @if (t.link) { <button type="button" class="link" (click)="open(t.link, t.id)">Open</button> }
          </div>
          <button type="button" class="btn ghost icon sm" (click)="ui.dismiss(t.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </div>

    @if (ui.confirmation(); as c) {
      <app-modal [open]="true" [title]="c.title" [width]="440" (closed)="c.resolve(false)">
        <p class="muted">{{ c.message }}</p>
        <div modal-actions>
          <button type="button" class="btn" (click)="c.resolve(false)">Cancel</button>
          <button type="button" class="btn" [class.primary]="!c.danger" [class.danger]="c.danger"
                  (click)="c.resolve(true)">{{ c.confirmLabel }}</button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .toasts { position: fixed; right: 18px; bottom: 18px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;
              width: min(380px, calc(100vw - 36px)); }
    .toast { display: flex; gap: 12px; align-items: flex-start; padding: 13px 10px 13px 14px; border-radius: 14px;
             background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow-pop);
             animation: in .22s ease-out; }
    @keyframes in { from { opacity: 0; transform: translateY(10px); } }
    .mark { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none;
            background: var(--ok-soft); color: var(--ok); }
    .error .mark { background: var(--danger-soft); color: var(--danger); }
    .info .mark { background: var(--arc-soft); color: var(--arc); }
    .live { border-color: color-mix(in srgb, var(--spark) 45%, var(--line)); }
    .live .mark { background: var(--spark-soft); color: var(--spark); }
    .body { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: .9rem; min-width: 0; }
    .body span { color: var(--muted); }
    .link { align-self: flex-start; margin-top: 4px; padding: 0; border: 0; background: none; color: var(--arc);
            font-weight: 600; cursor: pointer; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysComponent {
  readonly ui = inject(UiService);
  private readonly router = inject(Router);

  open(link: string, id: number) {
    this.ui.dismiss(id);
    void this.router.navigateByUrl(link);
  }
}
