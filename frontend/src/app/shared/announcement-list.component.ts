import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Announcement } from '../core/models';
import { AvatarComponent } from './brand';
import { IconComponent } from './icon.component';

const AUDIENCE: Record<string, string> = { ALL: 'Everyone', STUDENTS: 'Students', TEACHERS: 'Staff', CLASS: 'Class' };

@Component({
  selector: 'app-announcement-list',
  imports: [DatePipe, AvatarComponent, IconComponent],
  template: `
    @for (a of items(); track a.id) {
      <article [class.pinned]="a.pinned" [class.compact]="compact()">
        <app-avatar [name]="a.authorName" [size]="compact() ? 32 : 38" />
        <div class="body">
          <header>
            <h3>{{ a.title }}</h3>
            @if (a.pinned) { <span class="tag spark"><app-icon name="pin" [size]="12" /> Pinned</span> }
          </header>
          <p class="meta">
            {{ a.authorName }} to {{ a.audience === 'CLASS' ? a.className : audience(a.audience) }},
            {{ a.createdAt | date: 'MMM d, HH:mm' }}
          </p>
          <p class="text" [class.clamp]="compact()">{{ a.content }}</p>
        </div>
        @if (isDeletable(a)) {
          <button type="button" class="btn ghost icon sm" (click)="remove.emit(a)" aria-label="Delete announcement">
            <app-icon name="trash" [size]="16" />
          </button>
        }
      </article>
    } @empty {
      <div class="empty">
        <app-icon name="megaphone" [size]="30" />
        <h3>No announcements</h3>
        <p>News from the school and your teachers will appear here.</p>
      </div>
    }
  `,
  styles: `
    article { display: flex; gap: 14px; padding: 18px 22px; border-bottom: 1px solid var(--line); }
    article:last-child { border-bottom: none; }
    article.pinned { background: linear-gradient(90deg, var(--spark-soft), transparent 60%); }
    article.compact { padding: 14px 22px; }
    .body { flex: 1; min-width: 0; }
    header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    h3 { font-size: 1rem; font-weight: 700; }
    .compact h3 { font-size: .94rem; }
    .meta { font-size: .8rem; color: var(--muted); margin: 3px 0 8px; }
    .text { white-space: pre-line; font-size: .93rem; max-width: 72ch; }
    .text.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementListComponent {
  readonly items = input.required<Announcement[]>();
  readonly compact = input(false);
  readonly canDelete = input<((a: Announcement) => boolean) | null>(null);
  readonly remove = output<Announcement>();

  audience(a: string) { return AUDIENCE[a] ?? a; }

  isDeletable(a: Announcement): boolean {
    const fn = this.canDelete();
    return !!fn && fn(a);
  }
}
