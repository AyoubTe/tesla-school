import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Announcement, Audience, SchoolClass } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AnnouncementListComponent } from '../../shared/announcement-list.component';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-announcements',
  imports: [ReactiveFormsModule, AnnouncementListComponent, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div><h1>Announcements</h1><p>News for the whole school, for staff, and for individual classes.</p></div>
      @if (canPost()) {
        <button type="button" class="btn primary" (click)="compose()"><app-icon name="megaphone" [size]="17" /> New announcement</button>
      }
    </div>

    <section class="panel">
      <app-announcement-list [items]="items()" [canDelete]="canDelete" (remove)="remove($event)" />
    </section>

    <app-modal [open]="open()" title="New announcement" subtitle="Recipients get a live notification right away."
               [width]="600" (closed)="open.set(false)">
      <form [formGroup]="form" (ngSubmit)="publish()" id="ann-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="stack">
          <div class="field"><label for="an-title">Title</label><input id="an-title" class="input" formControlName="title" /></div>
          <div class="field"><label for="an-content">Message</label><textarea id="an-content" class="textarea" rows="6" formControlName="content"></textarea></div>
          <div class="form-grid">
            <div class="field"><label for="an-aud">Send to</label>
              <select id="an-aud" class="select" formControlName="audience">
                @for (a of audiences(); track a.value) { <option [ngValue]="a.value">{{ a.label }}</option> }
              </select></div>
            @if (form.controls.audience.value === 'CLASS') {
              <div class="field"><label for="an-class">Class</label>
                <select id="an-class" class="select" formControlName="classId">
                  @for (c of classes(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                </select></div>
            }
          </div>
          @if (auth.isAdmin()) {
            <label class="checkbox"><input type="checkbox" formControlName="pinned" />
              Pin to the top and also send it by email</label>
          }
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="open.set(false)">Cancel</button>
        <button type="submit" form="ann-form" class="btn primary" [disabled]="busy()">{{ busy() ? 'Publishing…' : 'Publish' }}</button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);

  readonly items = signal<Announcement[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly open = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly canPost = computed(() => this.auth.hasRole('ADMIN', 'TEACHER'));
  readonly audiences = computed<{ value: Audience; label: string }[]>(() => this.auth.isAdmin()
    ? [{ value: 'ALL', label: 'Everyone' }, { value: 'STUDENTS', label: 'All students' },
       { value: 'TEACHERS', label: 'Staff only' }, { value: 'CLASS', label: 'One class' }]
    : [{ value: 'CLASS', label: 'One class' }, { value: 'STUDENTS', label: 'All students' }]);

  readonly canDelete = (a: Announcement) => this.auth.isAdmin() || a.authorId === this.auth.user()?.id;

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    content: ['', [Validators.required, Validators.maxLength(5000)]],
    audience: ['ALL' as Audience, Validators.required],
    classId: [null as number | null],
    pinned: [false],
  });

  constructor() {
    this.load();
    const refresh = () => this.load();
    window.addEventListener('tesla:announcement', refresh);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('tesla:announcement', refresh));
  }

  load() { this.api.announcements(50).subscribe(a => this.items.set(a)); }

  compose() {
    if (!this.classes().length) this.api.classes().subscribe(c => {
      this.classes.set(c);
      if (this.form.controls.classId.value === null) this.form.controls.classId.setValue(c[0]?.id ?? null);
    });
    this.error.set(null);
    this.form.reset({ title: '', content: '', audience: this.audiences()[0].value, classId: this.classes()[0]?.id ?? null, pinned: false });
    this.open.set(true);
  }

  publish() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Add a title and a message.'); return; }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api.publishAnnouncement({ title: v.title ?? '', content: v.content ?? '', audience: v.audience as Audience,
      classId: v.audience === 'CLASS' ? v.classId : null, pinned: !!v.pinned }).subscribe({
      next: () => { this.busy.set(false); this.open.set(false); this.ui.ok('Announcement published'); this.load(); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  async remove(a: Announcement) {
    if (!await this.ui.confirm('Delete this announcement?', a.title, 'Delete')) return;
    this.api.deleteAnnouncement(a.id).subscribe({
      next: () => { this.ui.ok('Announcement deleted'); this.load(); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
