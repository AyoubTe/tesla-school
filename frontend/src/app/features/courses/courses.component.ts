import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, CourseInput, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Course, SchoolClass, Teacher } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

export const COURSE_COLORS = ['#1F8FB8', '#5B6CD9', '#C7782A', '#4F9A3A', '#2E9E6A', '#A05472', '#B3443C', '#7A5BC7', '#3A7F8C'];

@Component({
  selector: 'app-courses',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div><h1>{{ auth.isStudent() ? 'My courses' : 'Courses' }}</h1>
        <p>{{ auth.isStudent() ? 'The subjects your class takes this year.' : 'Every subject taught, by class and teacher.' }}</p></div>
      @if (auth.isAdmin()) {
        <button type="button" class="btn primary" (click)="edit(null)"><app-icon name="plus" [size]="17" /> Add course</button>
      }
    </div>

    @if (!auth.isStudent()) {
      <div class="toolbar">
        <select class="select auto" aria-label="Filter by class" [ngModel]="classFilter()" (ngModelChange)="classFilter.set($event)">
          <option [ngValue]="null">All classes</option>
          @for (c of classes(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
        </select>
        <select class="select auto" aria-label="Filter by teacher" [ngModel]="teacherFilter()" (ngModelChange)="teacherFilter.set($event)">
          <option [ngValue]="null">All teachers</option>
          @for (t of teachers(); track t.id) { <option [ngValue]="t.id">{{ t.fullName }}</option> }
        </select>
        @if (auth.isTeacher()) {
          <button type="button" class="btn" [class.primary]="teacherFilter() === auth.user()?.teacherId"
                  (click)="teacherFilter.set(auth.user()?.teacherId ?? null)">Only mine</button>
        }
      </div>
    }

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Course</th><th>Class</th><th>Teacher</th><th class="right">Coefficient</th><th></th></tr></thead>
          <tbody>
            @for (c of filtered(); track c.id) {
              <tr>
                <td>
                  <div class="row">
                    <span class="swatch" [style.background]="c.color"></span>
                    <div><strong>{{ c.name }}</strong><div class="muted small">{{ c.code }}</div></div>
                  </div>
                </td>
                <td><span class="tag arc">{{ c.className }}</span></td>
                <td>{{ c.teacherName ?? '–' }}</td>
                <td class="right num">{{ c.coefficient }}</td>
                <td class="right">
                  <div class="row" style="justify-content:flex-end">
                    @if (canGrade(c)) {
                      <a class="btn sm" [routerLink]="['/grades']" [queryParams]="{ courseId: c.id }">Gradebook</a>
                    }
                    @if (auth.isAdmin()) {
                      <button type="button" class="btn ghost icon sm" (click)="edit(c)" [attr.aria-label]="'Edit ' + c.name"><app-icon name="pencil" [size]="15" /></button>
                      <button type="button" class="btn ghost icon sm" (click)="remove(c)" [attr.aria-label]="'Delete ' + c.name"><app-icon name="trash" [size]="15" /></button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5"><div class="empty"><app-icon name="book" [size]="28" /><h3>No courses match</h3><p>Change the filters, or add a course.</p></div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="formOpen()" [title]="editing() ? 'Edit course' : 'Add a course'" [width]="600" (closed)="formOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="course-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field"><label for="co-name">Name</label><input id="co-name" class="input" formControlName="name" placeholder="e.g. Physics" /></div>
          <div class="field"><label for="co-code">Code</label><input id="co-code" class="input" formControlName="code" placeholder="e.g. PHY-10A" /></div>
          <div class="field"><label for="co-class">Class</label>
            <select id="co-class" class="select" formControlName="classId">
              @for (c of classes(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select></div>
          <div class="field"><label for="co-teacher">Teacher</label>
            <select id="co-teacher" class="select" formControlName="teacherId">
              <option [ngValue]="null">Not assigned</option>
              @for (t of teachers(); track t.id) { <option [ngValue]="t.id">{{ t.fullName }}</option> }
            </select></div>
          <div class="field"><label for="co-coef">Coefficient</label>
            <input id="co-coef" class="input" type="number" min="0.5" max="10" step="0.5" formControlName="coefficient" />
            <span class="hint">Weight in the overall average.</span></div>
          <div class="field"><span class="label">Colour</span>
            <div class="swatches" role="radiogroup" aria-label="Course colour">
              @for (col of colors; track col) {
                <button type="button" class="swatch-btn" [style.background]="col" role="radio"
                        [attr.aria-checked]="form.controls.color.value === col" [attr.aria-label]="col"
                        [class.on]="form.controls.color.value === col" (click)="form.controls.color.setValue(col)"></button>
              }
            </div></div>
          <div class="field span-2"><label for="co-desc">Description</label><textarea id="co-desc" class="textarea" formControlName="description"></textarea></div>
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="formOpen.set(false)">Cancel</button>
        <button type="submit" form="course-form" class="btn primary" [disabled]="busy()">{{ editing() ? 'Save changes' : 'Add course' }}</button>
      </div>
    </app-modal>
  `,
  styles: `
    .auto { width: auto; min-width: 180px; }
    .swatch { width: 12px; height: 32px; border-radius: 4px; flex: none; }
    .swatches { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 4px; }
    .swatch-btn { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--surface); cursor: pointer;
                  box-shadow: 0 0 0 1px var(--line-strong); }
    .swatch-btn.on { box-shadow: 0 0 0 2px var(--text); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesComponent implements OnInit {
  /** Optional ?teacherId= / ?classId= from links elsewhere in the app. */
  readonly teacherId = input<string>();
  readonly classId = input<string>();

  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);
  readonly colors = COURSE_COLORS;

  readonly courses = signal<Course[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly classFilter = signal<number | null>(null);
  readonly teacherFilter = signal<number | null>(null);

  readonly filtered = computed(() => this.courses().filter(c =>
    (this.classFilter() === null || c.classId === this.classFilter()) &&
    (this.teacherFilter() === null || c.teacherId === this.teacherFilter())));

  readonly formOpen = signal(false);
  readonly editing = signal<Course | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    name: ['', Validators.required], code: ['', Validators.required], description: [''],
    coefficient: [1, [Validators.required, Validators.min(0.5)]], color: [COURSE_COLORS[0]],
    teacherId: [null as number | null], classId: [null as number | null, Validators.required],
  });

  ngOnInit() {
    if (this.teacherId()) this.teacherFilter.set(Number(this.teacherId()));
    if (this.classId()) this.classFilter.set(Number(this.classId()));
  }

  constructor() {
    this.load();
    if (!this.auth.isStudent()) {
      this.api.classes().subscribe(c => this.classes.set(c));
      this.api.teachers().subscribe(t => this.teachers.set(t));
    }
  }

  load() {
    (this.auth.isStudent() ? this.api.myCourses() : this.api.courses()).subscribe(c => this.courses.set(c));
  }

  canGrade(c: Course) {
    return this.auth.isAdmin() || (this.auth.isTeacher() && c.teacherId === this.auth.user()?.teacherId);
  }

  edit(c: Course | null) {
    this.editing.set(c);
    this.error.set(null);
    this.form.reset({
      name: c?.name ?? '', code: c?.code ?? '', description: c?.description ?? '', coefficient: c?.coefficient ?? 1,
      color: c?.color ?? COURSE_COLORS[0], teacherId: c?.teacherId ?? null,
      classId: c?.classId ?? this.classFilter() ?? this.classes()[0]?.id ?? null,
    });
    this.formOpen.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Name, code and class are required.'); return; }
    const v = this.form.getRawValue();
    const body: CourseInput = { name: v.name ?? '', code: v.code ?? '', description: v.description || null,
      coefficient: Number(v.coefficient), color: v.color ?? COURSE_COLORS[0], teacherId: v.teacherId ?? null,
      classId: v.classId as number };
    const c = this.editing();
    this.busy.set(true);
    (c ? this.api.updateCourse(c.id, body) : this.api.createCourse(body)).subscribe({
      next: () => { this.busy.set(false); this.formOpen.set(false); this.ui.ok(c ? 'Course updated' : 'Course added'); this.load(); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  async remove(c: Course) {
    if (!await this.ui.confirm(`Delete ${c.name} (${c.className})?`,
      'All grades, attendance and timetable entries for this course are deleted too.', 'Delete course')) return;
    this.api.deleteCourse(c.id).subscribe({
      next: () => { this.ui.ok('Course deleted'); this.load(); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
