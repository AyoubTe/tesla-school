import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Course, DAYS, DayOfWeek, SchoolClass, Slot, Teacher, titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { WeekGridComponent } from '../../shared/week-grid.component';

type View = { kind: 'mine' } | { kind: 'class'; id: number } | { kind: 'teacher'; id: number };

@Component({
  selector: 'app-timetable',
  imports: [FormsModule, ReactiveFormsModule, IconComponent, ModalComponent, WeekGridComponent],
  template: `
    <div class="page-head">
      <div><h1>Timetable</h1><p>{{ subtitle() }}</p></div>
      @if (auth.isAdmin() && view().kind === 'class') {
        <button type="button" class="btn primary" (click)="openAdd()"><app-icon name="plus" [size]="17" /> Add lesson</button>
      }
    </div>

    @if (!auth.isStudent()) {
      <div class="toolbar">
        @if (!auth.isAdmin()) {
          <button type="button" class="btn" [class.primary]="view().kind === 'mine'" (click)="view.set({ kind: 'mine' })">My week</button>
        }
        <select class="select auto" aria-label="Show a class" [ngModel]="view().kind === 'class' ? viewId() : null"
                (ngModelChange)="$event ? view.set({ kind: 'class', id: $event }) : null">
          <option [ngValue]="null">Show a class…</option>
          @for (c of classes(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
        </select>
        <select class="select auto" aria-label="Show a teacher" [ngModel]="view().kind === 'teacher' ? viewId() : null"
                (ngModelChange)="$event ? view.set({ kind: 'teacher', id: $event }) : null">
          <option [ngValue]="null">Show a teacher…</option>
          @for (t of teachers(); track t.id) { <option [ngValue]="t.id">{{ t.fullName }}</option> }
        </select>
      </div>
    }

    <section class="panel table-wrap">
      <app-week-grid [slots]="slots()" [perspective]="perspective()" [removable]="auth.isAdmin()" (remove)="removeSlot($event)" />
    </section>
    @if (loaded() && !slots().length) {
      <p class="muted small note">No lessons scheduled for this view yet.</p>
    }

    <app-modal [open]="addOpen()" title="Add a lesson" [subtitle]="currentClassName()" [width]="520" (closed)="addOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="addSlot()" id="slot-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field span-2"><label for="sl-course">Course</label>
            <select id="sl-course" class="select" formControlName="courseId">
              @for (c of classCourses(); track c.id) { <option [ngValue]="c.id">{{ c.name }} ({{ c.teacherName ?? 'no teacher' }})</option> }
            </select></div>
          <div class="field"><label for="sl-day">Day</label>
            <select id="sl-day" class="select" formControlName="day">
              @for (d of days; track d) { <option [ngValue]="d">{{ titleCase(d) }}</option> }
            </select></div>
          <div class="field"><label for="sl-room">Room</label><input id="sl-room" class="input" formControlName="room" placeholder="Class room by default" /></div>
          <div class="field"><label for="sl-start">Starts</label><input id="sl-start" class="input" type="time" formControlName="startTime" /></div>
          <div class="field"><label for="sl-end">Ends</label><input id="sl-end" class="input" type="time" formControlName="endTime" /></div>
        </div>
        <p class="hint" style="margin-top:12px">Clashes with the class, the teacher or the room are rejected.</p>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="addOpen.set(false)">Cancel</button>
        <button type="submit" form="slot-form" class="btn primary" [disabled]="busy()">Add lesson</button>
      </div>
    </app-modal>
  `,
  styles: `.auto { width: auto; min-width: 190px; } .note { margin-top: 12px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);
  readonly days = DAYS;
  readonly titleCase = titleCase;

  readonly classes = signal<SchoolClass[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly slots = signal<Slot[]>([]);
  readonly loaded = signal(false);
  readonly view = signal<View>({ kind: 'mine' });

  readonly viewId = computed(() => { const v = this.view(); return v.kind === 'mine' ? null : v.id; });
  readonly perspective = computed<'class' | 'teacher'>(() => {
    const v = this.view();
    return v.kind === 'teacher' || (v.kind === 'mine' && this.auth.isTeacher()) ? 'teacher' : 'class';
  });
  readonly currentClassName = computed(() => this.classes().find(c => c.id === this.viewId())?.name ?? '');
  readonly classCourses = computed(() => this.courses().filter(c => c.classId === this.viewId()));
  readonly subtitle = computed(() => {
    const v = this.view();
    if (v.kind === 'class') return `Weekly lessons for ${this.currentClassName()}.`;
    if (v.kind === 'teacher') return `Weekly lessons taught by ${this.teachers().find(t => t.id === v.id)?.fullName ?? ''}.`;
    return this.auth.isStudent() ? `Your week with ${this.auth.user()?.className ?? 'your class'}.` : 'Your teaching week.';
  });

  readonly addOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).group({
    courseId: [null as number | null, Validators.required],
    day: ['MONDAY' as DayOfWeek, Validators.required],
    startTime: ['08:30', Validators.required],
    endTime: ['10:00', Validators.required],
    room: [''],
  });

  constructor() {
    if (!this.auth.isStudent()) {
      this.api.classes().subscribe(c => {
        this.classes.set(c);
        if (this.auth.isAdmin() && c.length) this.view.set({ kind: 'class', id: c[0].id });
      });
      this.api.teachers().subscribe(t => this.teachers.set(t));
    }
    if (this.auth.isAdmin()) this.api.courses().subscribe(c => this.courses.set(c));
    effect(() => this.load(this.view()));
  }

  private load(v: View) {
    if (v.kind === 'mine' && this.auth.isAdmin()) return;
    const req = v.kind === 'class' ? this.api.schedule({ classId: v.id })
      : v.kind === 'teacher' ? this.api.schedule({ teacherId: v.id }) : this.api.mySchedule();
    req.subscribe({ next: s => { this.slots.set(s); this.loaded.set(true); }, error: () => this.loaded.set(true) });
  }

  openAdd() {
    this.error.set(null);
    this.form.reset({ courseId: this.classCourses()[0]?.id ?? null, day: 'MONDAY', startTime: '08:30', endTime: '10:00', room: '' });
    this.addOpen.set(true);
  }

  addSlot() {
    if (this.form.invalid) { this.error.set('Pick a course, day and times.'); return; }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api.addSlot({ courseId: v.courseId as number, day: v.day as DayOfWeek, startTime: v.startTime ?? '',
      endTime: v.endTime ?? '', room: v.room || null }).subscribe({
      next: () => { this.busy.set(false); this.addOpen.set(false); this.ui.ok('Lesson added'); this.load(this.view()); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  async removeSlot(s: Slot) {
    if (!await this.ui.confirm('Remove this lesson?', `${s.courseName} on ${titleCase(s.day)} at ${s.startTime.slice(0, 5)}.`, 'Remove lesson')) return;
    this.api.deleteSlot(s.id).subscribe({
      next: () => { this.ui.ok('Lesson removed'); this.load(this.view()); },
      error: err => this.ui.error('Could not remove', errorMessage(err)),
    });
  }
}
