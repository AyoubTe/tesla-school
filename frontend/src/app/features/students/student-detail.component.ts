import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AttendanceRecord, AttendanceSummary, Grade, GradeSummary, Student, titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { DialComponent } from '../../shared/dial.component';
import { IconComponent } from '../../shared/icon.component';
import { StudentFormComponent } from './student-form.component';

@Component({
  selector: 'app-student-detail',
  imports: [RouterLink, DatePipe, AvatarComponent, DialComponent, IconComponent, StudentFormComponent],
  template: `
    <a routerLink="/students" class="back small"><app-icon name="back" [size]="15" /> All students</a>

    @if (error()) { <div class="alert">{{ error() }}</div> }

    @if (student(); as s) {
      <section class="panel profile">
        <app-avatar [name]="s.fullName" [size]="72" />
        <div class="who">
          <h1 class="display">{{ s.fullName }}</h1>
          <div class="row wrap">
            <span class="tag">{{ s.studentNumber }}</span>
            @if (s.className) { <a class="tag arc" [routerLink]="['/classes', s.classId]">{{ s.className }}</a> }
            @if (!s.enabled) { <span class="tag danger">Account disabled</span> }
          </div>
          <dl>
            <div><dt>Email</dt><dd>{{ s.email }}</dd></div>
            <div><dt>Phone</dt><dd>{{ s.phone || '–' }}</dd></div>
            <div><dt>Born</dt><dd>{{ s.dateOfBirth ? (s.dateOfBirth | date: 'd MMM y') : '–' }}</dd></div>
            <div><dt>Guardian</dt><dd>{{ s.guardianName || '–' }}@if (s.guardianEmail) {<br><span class="muted small">{{ s.guardianEmail }}</span>}</dd></div>
            <div><dt>Address</dt><dd>{{ s.address || '–' }}</dd></div>
            <div><dt>Enrolled</dt><dd>{{ s.enrollmentDate ? (s.enrollmentDate | date: 'd MMM y') : '–' }}</dd></div>
          </dl>
        </div>
        @if (auth.isAdmin()) {
          <div class="actions">
            <button type="button" class="btn" (click)="formOpen.set(true)"><app-icon name="pencil" [size]="16" /> Edit</button>
            <button type="button" class="btn danger" (click)="remove(s)"><app-icon name="trash" [size]="16" /> Delete</button>
          </div>
        }
      </section>

      <div class="grid cols-3 mt">
        <section class="panel panel-pad"><app-dial [value]="summary()?.overall ?? null" label="Overall average" /></section>
        <section class="panel panel-pad"><app-dial [value]="attendance()?.rate ?? null" label="Attendance" /></section>
        <section class="panel panel-pad stack">
          <h2 class="section-title">Attendance record</h2>
          <div class="facts">
            <span><strong>{{ attendance()?.present ?? 0 }}</strong> present</span>
            <span><strong>{{ attendance()?.late ?? 0 }}</strong> late</span>
            <span><strong>{{ attendance()?.absent ?? 0 }}</strong> absent</span>
            <span><strong>{{ attendance()?.excused ?? 0 }}</strong> excused</span>
          </div>
        </section>
      </div>

      <div class="grid cols-2 mt">
        <section class="panel">
          <div class="panel-head"><h2 class="section-title">Grades</h2><span class="muted small">{{ grades().length }} assessments</span></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Assessment</th><th>Course</th><th class="right">Score</th></tr></thead>
              <tbody>
                @for (g of grades(); track g.id) {
                  <tr>
                    <td><strong>{{ g.title }}</strong><div class="muted small">{{ titleCase(g.type) }}, {{ g.date | date: 'd MMM' }}</div></td>
                    <td><span class="row small"><span class="dot" [style.background]="g.color"></span>{{ g.courseName }}</span></td>
                    <td class="right num"><strong>{{ g.score }}</strong><span class="muted">/{{ g.maxScore }}</span></td>
                  </tr>
                } @empty { <tr><td colspan="3"><div class="empty"><h3>No grades yet</h3></div></td></tr> }
              </tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2 class="section-title">Absences and late arrivals</h2></div>
          @for (a of flagged(); track a.id) {
            <div class="list-row">
              <span class="dot" [style.background]="a.color"></span>
              <span class="grow">{{ a.courseName }}<br><span class="muted small">{{ a.date | date: 'EEE d MMM' }}</span></span>
              <span class="tag" [class.danger]="a.status === 'ABSENT'" [class.warn]="a.status === 'LATE'">{{ titleCase(a.status) }}</span>
            </div>
          } @empty {
            <div class="empty"><app-icon name="check" [size]="28" /><h3>Perfect attendance</h3><p>No absences or late arrivals recorded.</p></div>
          }
        </section>
      </div>

      <app-student-form [open]="formOpen()" [student]="s" (closed)="formOpen.set(false)"
                        (saved)="student.set($event); formOpen.set(false)" />
    } @else if (!error()) {
      <div class="panel panel-pad"><div class="skeleton" style="height:120px"></div></div>
    }
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; font-weight: 600; }
    .mt { margin-top: 18px; }
    .grow { flex: 1; }
    .profile { display: flex; gap: 22px; padding: 24px; align-items: flex-start; flex-wrap: wrap; }
    .who { flex: 1; min-width: 260px; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; }
    dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px 24px; margin: 18px 0 0; }
    dt { font-size: .78rem; color: var(--muted); font-weight: 600; }
    dd { margin: 2px 0 0; font-size: .92rem; overflow-wrap: anywhere; }
    .actions { display: flex; gap: 8px; }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; color: var(--muted); font-size: .9rem;
             strong { display: block; font-size: 1.6rem; color: var(--text); font-stretch: 112%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly titleCase = titleCase;

  readonly student = signal<Student | null>(null);
  readonly grades = signal<Grade[]>([]);
  readonly summary = signal<GradeSummary | null>(null);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly attendance = signal<AttendanceSummary | null>(null);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly flagged = computed(() => this.records().filter(r => r.status !== 'PRESENT'));

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.api.student(id).subscribe({
        next: s => this.student.set(s),
        error: err => this.error.set(errorMessage(err, 'This student could not be loaded.')),
      });
      this.api.studentGrades(id).subscribe(g => this.grades.set(g));
      this.api.studentGradeSummary(id).subscribe(s => this.summary.set(s));
      this.api.studentAttendance(id).subscribe(r => this.records.set(r));
      this.api.studentAttendanceSummary(id).subscribe(s => this.attendance.set(s));
    });
  }

  async remove(s: Student) {
    const ok = await this.ui.confirm(`Delete ${s.fullName}?`,
      'This removes the student, their login, grades and attendance history. It can’t be undone.', 'Delete student');
    if (!ok) return;
    this.api.deleteStudent(s.id).subscribe({
      next: () => { this.ui.ok('Student deleted'); void this.router.navigate(['/students']); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
