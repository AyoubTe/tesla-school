import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';

/** Accessible modal built on the native <dialog> element (focus trap and Escape handling for free). */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    <dialog #dlg (cancel)="onCancel($event)" (click)="onBackdrop($event)" [style.--w.px]="width()">
      <div class="sheet">
        <header>
          <div>
            <h2>{{ title() }}</h2>
            @if (subtitle()) { <p>{{ subtitle() }}</p> }
          </div>
          <button type="button" class="btn ghost icon sm" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" />
          </button>
        </header>
        <div class="content"><ng-content /></div>
        <footer><ng-content select="[modal-actions]" /></footer>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(var(--w, 560px), calc(100vw - 24px)); max-height: calc(100dvh - 40px);
      padding: 0; border: 1px solid var(--line); border-radius: 18px;
      background: var(--surface); color: var(--text); box-shadow: var(--shadow-pop);
    }
    dialog::backdrop { background: rgb(8 19 34 / 55%); backdrop-filter: blur(2px); }
    dialog[open] { animation: rise .18s ease-out; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.99); } }
    .sheet { display: flex; flex-direction: column; max-height: calc(100dvh - 42px); }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 20px 22px 6px; }
    h2 { font-size: 1.25rem; font-stretch: 112%; }
    header p { color: var(--muted); font-size: .9rem; margin-top: 4px; }
    .content { padding: 14px 22px 8px; overflow-y: auto; }
    footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 20px; }
    footer:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly subtitle = input('');
  readonly width = input(560);
  readonly closed = output<void>();

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }

  onCancel(e: Event) {
    e.preventDefault();
    this.closed.emit();
  }

  onBackdrop(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.closed.emit();
  }
}
