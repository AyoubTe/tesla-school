import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Page } from '../core/models';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-pager',
  imports: [IconComponent],
  template: `
    @if (page(); as p) {
      @if (p.totalPages > 1) {
        <div class="pager">
          <span class="muted small">
            {{ p.page * p.size + 1 }}–{{ p.page * p.size + p.content.length }} of {{ p.totalElements }}
          </span>
          <div class="row">
            <button type="button" class="btn sm icon" [disabled]="p.page === 0" (click)="change.emit(p.page - 1)" aria-label="Previous page">
              <app-icon name="chevron-left" [size]="16" />
            </button>
            <span class="small num">Page {{ p.page + 1 }} of {{ p.totalPages }}</span>
            <button type="button" class="btn sm icon" [disabled]="p.page + 1 >= p.totalPages" (click)="change.emit(p.page + 1)" aria-label="Next page">
              <app-icon name="chevron-right" [size]="16" />
            </button>
          </div>
        </div>
      }
    }
  `,
  styles: `.pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px;
           border-top: 1px solid var(--line); }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly page = input<Page<unknown> | null>(null);
  readonly change = output<number>();
}
