import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { Course, SchoolClass, Slot, Student } from '../../core/models';
import { AvatarComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { WeekGridComponent } from '../../shared/week-grid.component';

@Component({
  selector: 'app-class-detail',
  imports: [RouterLink, AvatarComponent, IconComponent, WeekGridComponent],
  template: `
    <a routerLink="/classes" class="back small"><app-icon name="back" [size]="15" /> All classes</a>
    @if (error()) { <div class="alert">{{ error() }}</div> }

    @if (klass(); as c) {
      <div class="page-head">
        <div>
          <h1>{{ c.name }}</h1>
          <p>Grade {{ c.gradeLevel }}, {{ c.academicYear }}{{ c.room ? ', room ' + c.room : '' }}.
            Homeroom teacher: {{ c.homeroomTeacherName ?? 'not assigned' }}.</p>
        </div>
        <div class="segmented" role="tablist">
          <button type="button" [class.active]="tab() === 'roster'" (click)="tab.set('roster')">Students ({{ students().length }})</button>
          <button type="button" [class.active]="tab() === 'courses'" (click)="tab.set('courses')">Courses ({{ courses().length }})</button>
          <button type="button" [class.active]="tab() === 'timetable'" (click)="tab.set('timetable')">Timetable</button>
        </div>
      </div>

      @switch (tab()) {
        @case ('roster') {
          <section class="panel">
            @for (s of students(); track s.id; let i = $index) {
              <a class="list-row person" [routerLink]="['/students', s.id]">
                <span class="muted small num idx">{{ i + 1 }}</span>
                <app-avatar [name]="s.fullName" [size]="32" />
                <span class="grow"><strong>{{ s.fullName }}</strong><br><span class="muted small">{{ s.email }}</span></span>
                <span class="muted small num">{{ s.studentNumber }}</span>
                <app-icon name="chevron-right" [size]="16" />
              </a>
            } @empty { <div class="empty"><h3>No students in this class</h3></div> }
          </section>
        }
        @case ('courses') {
          <section class="panel">
            @for (k of courses(); track k.id) {
              <a class="list-row person" [routerLink]="['/grades']" [queryParams]="{ courseId: k.id }">
                <span class="dot" [style.background]="k.color"></span>
                <span class="grow"><strong>{{ k.name }}</strong>&nbsp; <span class="muted small">{{ k.code }}</span><br>
                  <span class="muted small">{{ k.teacherName ?? 'No teacher assigned' }}, coefficient {{ k.coefficient }}</span></span>
                <span class="muted small">Gradebook</span>
                <app-icon name="chevron-right" [size]="16" />
              </a>
            } @empty { <div class="empty"><h3>No courses yet</h3></div> }
          </section>
        }
        @case ('timetable') {
          <section class="panel table-wrap"><app-week-grid [slots]="slots()" perspective="class" /></section>
        }
      }
    }
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; font-weight: 600; }
    .grow { flex: 1; min-width: 0; }
    .idx { width: 22px; text-align: right; }
    .person { color: var(--text); text-decoration: none; app-icon { color: var(--muted); }
      &:hover { background: var(--surface-2); text-decoration: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDetailComponent {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);

  readonly klass = signal<SchoolClass | null>(null);
  readonly students = signal<Student[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly slots = signal<Slot[]>([]);
  readonly tab = signal<'roster' | 'courses' | 'timetable'>('roster');
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api.schoolClass(id).subscribe({ next: c => this.klass.set(c), error: e => this.error.set(errorMessage(e)) });
      this.api.classStudents(id).subscribe(s => this.students.set(s));
      this.api.courses({ classId: id }).subscribe(c => this.courses.set(c));
      this.api.schedule({ classId: id }).subscribe(s => this.slots.set(s));
    });
  }
}
