import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, ClassInput, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { SchoolClass, Teacher } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-classes',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div><h1>Classes</h1><p>Student cohorts for the 2026–2027 school year.</p></div>
      @if (auth.isAdmin()) {
        <button type="button" class="btn primary" (click)="edit(null)"><app-icon name="plus" [size]="17" /> Add class</button>
      }
    </div>

    <div class="cards">
      @for (c of classes(); track c.id) {
        <article class="panel klass">
          <header>
            <span class="level display">{{ c.gradeLevel }}</span>
            <div class="title">
              @if (canOpen()) { <a [routerLink]="['/classes', c.id]"><h2 class="display">{{ c.name }}</h2></a> }
              @else { <h2 class="display">{{ c.name }}</h2> }
              <span class="muted small">{{ c.academicYear }}{{ c.room ? ', room ' + c.room : '' }}</span>
            </div>
          </header>
          <div class="cap">
            <div class="row between small"><span>Enrolment</span><span class="num">{{ c.studentCount }} of {{ c.capacity }}</span></div>
            <div class="meter"><span [style.width.%]="c.studentCount / c.capacity * 100"
                 [style.background]="c.studentCount >= c.capacity ? 'var(--spark)' : null"></span></div>
          </div>
          <dl>
            <div><dt>Homeroom teacher</dt><dd>{{ c.homeroomTeacherName ?? 'Not assigned' }}</dd></div>
            <div><dt>Courses</dt><dd>{{ c.courseCount }}</dd></div>
          </dl>
          @if (auth.isAdmin()) {
            <footer>
              <button type="button" class="btn sm" (click)="edit(c)"><app-icon name="pencil" [size]="14" /> Edit</button>
              <button type="button" class="btn sm ghost" (click)="remove(c)"><app-icon name="trash" [size]="14" /> Delete</button>
            </footer>
          }
        </article>
      } @empty {
        <div class="panel empty"><app-icon name="school" [size]="30" /><h3>No classes yet</h3><p>Add the first class to start enrolling students.</p></div>
      }
    </div>

    <app-modal [open]="formOpen()" [title]="editing() ? 'Edit ' + editing()!.name : 'Add a class'" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="class-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field span-2"><label for="cf-name">Name</label><input id="cf-name" class="input" formControlName="name" placeholder="e.g. 10-C Dynamo" /></div>
          <div class="field"><label for="cf-level">Grade level</label><input id="cf-level" class="input" type="number" min="1" max="13" formControlName="gradeLevel" /></div>
          <div class="field"><label for="cf-year">Academic year</label><input id="cf-year" class="input" formControlName="academicYear" /></div>
          <div class="field"><label for="cf-room">Room</label><input id="cf-room" class="input" formControlName="room" /></div>
          <div class="field"><label for="cf-cap">Capacity</label><input id="cf-cap" class="input" type="number" min="1" max="60" formControlName="capacity" /></div>
          <div class="field span-2"><label for="cf-home">Homeroom teacher</label>
            <select id="cf-home" class="select" formControlName="homeroomTeacherId">
              <option [ngValue]="null">Not assigned</option>
              @for (t of teachers(); track t.id) { <option [ngValue]="t.id">{{ t.fullName }}</option> }
            </select></div>
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="formOpen.set(false)">Cancel</button>
        <button type="submit" form="class-form" class="btn primary" [disabled]="busy()">{{ editing() ? 'Save changes' : 'Add class' }}</button>
      </div>
    </app-modal>
  `,
  styles: `
    .klass { padding: 20px; display: flex; flex-direction: column; gap: 18px; }
    header { display: flex; gap: 14px; align-items: center; }
    .level { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; flex: none;
             background: var(--ink); color: #fff; font-size: 1.4rem; }
    h2 { font-size: 1.2rem; }
    .title a { color: var(--text); }
    .cap { display: flex; flex-direction: column; gap: 7px; color: var(--muted); }
    dl { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin: 0; font-size: .88rem; }
    dl div:last-child { text-align: right; }
    dt { color: var(--muted); font-size: .78rem; font-weight: 600; } dd { margin: 2px 0 0; }
    footer { display: flex; gap: 6px; padding-top: 14px; border-top: 1px solid var(--line); }
    .empty { grid-column: 1 / -1; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassesComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly formOpen = signal(false);
  readonly editing = signal<SchoolClass | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    name: ['', Validators.required],
    gradeLevel: [10, [Validators.required, Validators.min(1), Validators.max(13)]],
    academicYear: ['2026–2027', Validators.required],
    room: [''],
    capacity: [28, [Validators.required, Validators.min(1), Validators.max(60)]],
    homeroomTeacherId: [null as number | null],
  });

  canOpen() { return this.auth.hasRole('ADMIN', 'TEACHER'); }

  constructor() { this.load(); }

  load() { this.api.classes().subscribe(c => this.classes.set(c)); }

  edit(c: SchoolClass | null) {
    if (!this.teachers().length) this.api.teachers().subscribe(t => this.teachers.set(t));
    this.editing.set(c);
    this.error.set(null);
    this.form.reset({
      name: c?.name ?? '', gradeLevel: c?.gradeLevel ?? 10, academicYear: c?.academicYear ?? '2026–2027',
      room: c?.room ?? '', capacity: c?.capacity ?? 28, homeroomTeacherId: c?.homeroomTeacherId ?? null,
    });
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Check the highlighted fields.'); return; }
    const v = this.form.getRawValue();
    const body: ClassInput = { name: v.name ?? '', gradeLevel: Number(v.gradeLevel), academicYear: v.academicYear ?? '',
      room: v.room || null, capacity: Number(v.capacity), homeroomTeacherId: v.homeroomTeacherId ?? null };
    const c = this.editing();
    this.busy.set(true);
    (c ? this.api.updateClass(c.id, body) : this.api.createClass(body)).subscribe({
      next: () => { this.busy.set(false); this.formOpen.set(false); this.ui.ok(c ? 'Class updated' : 'Class added'); this.load(); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  async remove(c: SchoolClass) {
    if (!await this.ui.confirm(`Delete ${c.name}?`, 'Only empty classes with no courses can be deleted.', 'Delete class')) return;
    this.api.deleteClass(c.id).subscribe({
      next: () => { this.ui.ok('Class deleted'); this.load(); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
