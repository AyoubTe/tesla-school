import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, TeacherInput, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Teacher } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-teachers',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, DatePipe, AvatarComponent, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div><h1>Teachers</h1><p>{{ teachers().length }} members of the teaching staff.</p></div>
      @if (auth.isAdmin()) {
        <button type="button" class="btn primary" (click)="edit(null)"><app-icon name="plus" [size]="17" /> Add teacher</button>
      }
    </div>

    <div class="toolbar">
      <label class="search grow">
        <span class="sr-only">Search teachers</span>
        <app-icon name="search" [size]="17" />
        <input class="input" type="search" placeholder="Search by name or subject" [(ngModel)]="query" />
      </label>
    </div>

    <div class="cards">
      @for (t of filtered(); track t.id) {
        <article class="panel teacher">
          <div class="top">
            <app-avatar [name]="t.fullName" [size]="52" />
            <div class="id">
              <h2>{{ t.fullName }}</h2>
              <span class="muted small">{{ t.specialty || 'Teacher' }}</span>
            </div>
          </div>
          <ul>
            <li><app-icon name="mail" [size]="15" /><a [href]="'mailto:' + t.email">{{ t.email }}</a></li>
            @if (t.phone) { <li><app-icon name="phone" [size]="15" />{{ t.phone }}</li> }
            <li><app-icon name="id" [size]="15" />{{ t.employeeNumber }}@if (t.hireDate) {, since {{ t.hireDate | date: 'y' }}}</li>
          </ul>
          <footer>
            <a [routerLink]="['/courses']" [queryParams]="{ teacherId: t.id }" class="tag arc">
              {{ t.courseCount }} {{ t.courseCount === 1 ? 'course' : 'courses' }}
            </a>
            @if (!t.enabled) { <span class="tag danger">Disabled</span> }
            @if (auth.isAdmin()) {
              <span class="spacer"></span>
              <button type="button" class="btn ghost icon sm" (click)="edit(t)" [attr.aria-label]="'Edit ' + t.fullName">
                <app-icon name="pencil" [size]="15" /></button>
              <button type="button" class="btn ghost icon sm" (click)="remove(t)" [attr.aria-label]="'Delete ' + t.fullName">
                <app-icon name="trash" [size]="15" /></button>
            }
          </footer>
        </article>
      } @empty {
        <div class="panel empty"><app-icon name="users" [size]="30" /><h3>No teachers found</h3></div>
      }
    </div>

    <app-modal [open]="formOpen()" [title]="editing() ? 'Edit teacher' : 'Add a teacher'"
               [subtitle]="editing() ? editing()!.employeeNumber : 'They’ll get a welcome email with a temporary password.'"
               [width]="620" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="teacher-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field"><label for="tf-first">First name</label><input id="tf-first" class="input" formControlName="firstName" /></div>
          <div class="field"><label for="tf-last">Last name</label><input id="tf-last" class="input" formControlName="lastName" /></div>
          <div class="field span-2"><label for="tf-email">School email</label><input id="tf-email" class="input" type="email" formControlName="email" /></div>
          <div class="field"><label for="tf-spec">Subject</label><input id="tf-spec" class="input" formControlName="specialty" placeholder="e.g. Physics" /></div>
          <div class="field"><label for="tf-phone">Phone</label><input id="tf-phone" class="input" formControlName="phone" /></div>
          <div class="field"><label for="tf-hire">Hire date</label><input id="tf-hire" class="input" type="date" formControlName="hireDate" /></div>
          <div class="field span-2"><label for="tf-bio">Short bio</label><textarea id="tf-bio" class="textarea" formControlName="bio"></textarea></div>
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="formOpen.set(false)">Cancel</button>
        <button type="submit" form="teacher-form" class="btn primary" [disabled]="busy()">
          {{ busy() ? 'Saving…' : editing() ? 'Save changes' : 'Add teacher' }}</button>
      </div>
    </app-modal>
  `,
  styles: `
    .teacher { display: flex; flex-direction: column; padding: 20px; gap: 16px; }
    .top { display: flex; gap: 14px; align-items: center; }
    .id { min-width: 0; }
    h2 { font-size: 1.05rem; font-stretch: 108%; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: .88rem; }
    li { display: flex; align-items: center; gap: 9px; color: var(--muted); min-width: 0; }
    li a { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    footer { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--line); }
    footer a.tag:hover { text-decoration: none; filter: brightness(.96); }
    .spacer { flex: 1; }
    .empty { grid-column: 1 / -1; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);

  readonly teachers = signal<Teacher[]>([]);
  readonly queryText = signal('');
  get query() { return this.queryText(); }
  set query(v: string) { this.queryText.set(v); }

  readonly filtered = computed(() => {
    const q = this.queryText().trim().toLowerCase();
    return q ? this.teachers().filter(t => `${t.fullName} ${t.specialty ?? ''}`.toLowerCase().includes(q)) : this.teachers();
  });

  readonly formOpen = signal(false);
  readonly editing = signal<Teacher | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    specialty: [''], phone: [''], hireDate: [''], bio: [''],
  });

  constructor() { this.load(); }

  load() { this.api.teachers().subscribe(t => this.teachers.set(t)); }

  edit(t: Teacher | null) {
    this.editing.set(t);
    this.error.set(null);
    this.form.reset({
      firstName: t?.firstName ?? '', lastName: t?.lastName ?? '', email: t?.email ?? '',
      specialty: t?.specialty ?? '', phone: t?.phone ?? '', hireDate: t?.hireDate ?? '', bio: t?.bio ?? '',
    });
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Name and a valid email are required.'); return; }
    const v = this.form.getRawValue();
    const body: TeacherInput = { ...v, specialty: v.specialty || null, phone: v.phone || null,
      hireDate: v.hireDate || null, bio: v.bio || null };
    const t = this.editing();
    this.busy.set(true);
    (t ? this.api.updateTeacher(t.id, body) : this.api.createTeacher(body)).subscribe({
      next: saved => {
        this.busy.set(false);
        this.formOpen.set(false);
        this.ui.ok(t ? 'Teacher updated' : 'Teacher added', t ? undefined : `A welcome email was sent to ${saved.email}.`);
        this.load();
      },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  async remove(t: Teacher) {
    const ok = await this.ui.confirm(`Delete ${t.fullName}?`,
      'Their courses stay but will have no teacher until you assign one. Their login is removed.', 'Delete teacher');
    if (!ok) return;
    this.api.deleteTeacher(t.id).subscribe({
      next: () => { this.ui.ok('Teacher deleted'); this.load(); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
