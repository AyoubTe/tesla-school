import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AttendanceRecord, AttendanceStatus, AttendanceSummary, Course, RollCallSheet, isoDate, titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { DialComponent } from '../../shared/dial.component';
import { IconComponent } from '../../shared/icon.component';

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' }, { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' }, { value: 'EXCUSED', label: 'Excused' },
];

@Component({
  selector: 'app-attendance',
  imports: [FormsModule, DatePipe, AvatarComponent, DialComponent, IconComponent],
  template: `
    @if (auth.isStudent()) {
      <div class="page-head"><div><h1>My attendance</h1><p>Late arrivals count as attended. Excused absences don't count against you.</p></div></div>
      <div class="grid top">
        <section class="panel panel-pad"><app-dial [value]="summary()?.rate ?? null" label="Attendance rate" /></section>
        <section class="panel tally">
          @for (s of statuses; track s.value) {
            <div class="t" [attr.data-s]="s.value"><strong class="display">{{ count(s.value) }}</strong><span>{{ s.label }}</span></div>
          }
        </section>
      </div>
      <section class="panel mt">
        <div class="panel-head">
          <h2 class="section-title">Record</h2>
          <label class="checkbox"><input type="checkbox" [(ngModel)]="onlyIssues" /> Only absences and late arrivals</label>
        </div>
        @for (r of shownRecords(); track r.id) {
          <div class="list-row">
            <span class="dot" [style.background]="r.color"></span>
            <span class="grow">{{ r.courseName }}<br><span class="muted small">{{ r.date | date: 'EEEE d MMMM' }}</span></span>
            <span class="tag" [class]="statusClass(r.status)">{{ titleCase(r.status) }}</span>
          </div>
        } @empty {
          <div class="empty"><app-icon name="clipboard" [size]="28" /><h3>Nothing to show</h3></div>
        }
      </section>
    } @else {
      <div class="page-head">
        <div><h1>Roll call</h1><p>Absent and late students are notified, and guardians get an email.</p></div>
      </div>
      <div class="toolbar">
        <select class="select auto" aria-label="Course" [ngModel]="selectedId()" (ngModelChange)="selectedId.set($event)">
          @for (c of courses(); track c.id) { <option [ngValue]="c.id">{{ c.name }}, {{ c.className }}</option> }
        </select>
        <input class="input auto" type="date" aria-label="Date" [max]="today" [ngModel]="date()" (ngModelChange)="date.set($event)" />
        @if (sheet()?.taken) { <span class="tag ok"><app-icon name="check" [size]="13" /> Already taken, you can update it</span> }
      </div>

      @if (sheet(); as sh) {
        <section class="panel">
          <div class="panel-head">
            <h2 class="section-title">{{ sh.courseName }}, {{ sh.className }}</h2>
            <div class="row">
              <span class="muted small">{{ present() }} of {{ lines().length }} attending</span>
              <button type="button" class="btn sm" (click)="setAll('PRESENT')">Mark all present</button>
            </div>
          </div>
          @for (l of lines(); track l.studentId; let i = $index) {
            <div class="list-row roll">
              <app-avatar [name]="l.studentName" [size]="32" />
              <span class="grow"><strong>{{ l.studentName }}</strong><br><span class="muted small num">{{ l.studentNumber }}</span></span>
              <div class="segmented status" role="radiogroup" [attr.aria-label]="'Status for ' + l.studentName">
                @for (s of statuses; track s.value) {
                  <button type="button" role="radio" [attr.aria-checked]="l.status === s.value" [class.active]="l.status === s.value"
                          [attr.data-s]="s.value" (click)="setStatus(i, s.value)">{{ s.label }}</button>
                }
              </div>
              <input class="input note" placeholder="Note" [ngModel]="l.note ?? ''" (ngModelChange)="setNote(i, $event)"
                     [attr.aria-label]="'Note for ' + l.studentName" />
            </div>
          } @empty {
            <div class="empty"><h3>No students in this class</h3></div>
          }
          @if (lines().length) {
            <div class="save-bar">
              <button type="button" class="btn primary" [disabled]="busy()" (click)="save()">
                {{ busy() ? 'Saving…' : sh.taken ? 'Update attendance' : 'Save attendance' }}</button>
            </div>
          }
        </section>
      } @else if (!courses().length) {
        <div class="panel empty"><app-icon name="clipboard" [size]="28" /><h3>No courses to take attendance for</h3></div>
      }
    }
  `,
  styles: `
    .mt { margin-top: 18px; } .grow { flex: 1; min-width: 0; } .auto { width: auto; min-width: 180px; }
    .top { grid-template-columns: minmax(220px, 1fr) 2fr; }
    @media (max-width: 760px) { .top { grid-template-columns: 1fr; } }
    .tally { display: grid; grid-template-columns: repeat(4, 1fr); }
    .t { display: flex; flex-direction: column; justify-content: center; padding: 20px; border-right: 1px solid var(--line); }
    .t:last-child { border-right: none; }
    .t strong { font-size: 2.2rem; line-height: 1; } .t span { color: var(--muted); font-size: .86rem; margin-top: 6px; }
    .t[data-s='ABSENT'] strong { color: var(--danger); } .t[data-s='LATE'] strong { color: var(--warn); }
    .roll { flex-wrap: wrap; }
    .note { width: 180px; height: 34px; }
    .status button[data-s='PRESENT'].active { background: var(--ok); color: #fff; }
    .status button[data-s='LATE'].active { background: var(--spark); color: #2b1800; }
    .status button[data-s='ABSENT'].active { background: var(--danger); color: #fff; }
    .status button[data-s='EXCUSED'].active { background: var(--muted); color: var(--surface); }
    .save-bar { display: flex; justify-content: flex-end; padding: 14px 22px; border-top: 1px solid var(--line);
                position: sticky; bottom: 0; background: var(--surface); border-radius: 0 0 var(--r-panel) var(--r-panel); }
    @media (max-width: 700px) { .note { width: 100%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent implements OnInit {
  readonly courseId = input<string>();
  readonly dateParam = input<string>(undefined, { alias: 'date' });

  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);
  readonly statuses = STATUSES;
  readonly titleCase = titleCase;
  readonly today = isoDate();

  // teacher
  readonly courses = signal<Course[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly date = signal(isoDate());
  readonly sheet = signal<RollCallSheet | null>(null);
  readonly lines = signal<{ studentId: number; studentName: string; studentNumber: string; status: AttendanceStatus; note: string | null }[]>([]);
  readonly busy = signal(false);
  readonly present = computed(() => this.lines().filter(l => l.status === 'PRESENT' || l.status === 'LATE').length);

  // student
  readonly records = signal<AttendanceRecord[]>([]);
  readonly summary = signal<AttendanceSummary | null>(null);
  private readonly issuesOnly = signal(false);
  get onlyIssues() { return this.issuesOnly(); }
  set onlyIssues(v: boolean) { this.issuesOnly.set(v); }
  readonly shownRecords = computed(() => this.issuesOnly() ? this.records().filter(r => r.status !== 'PRESENT') : this.records());

  constructor() {
    if (this.auth.isStudent()) {
      this.api.myAttendance().subscribe(r => this.records.set(r));
      this.api.myAttendanceSummary().subscribe(s => this.summary.set(s));
    } else {
      effect(() => {
        const id = this.selectedId();
        const d = this.date();
        if (id !== null && d) this.loadSheet(id, d);
      });
    }
  }

  ngOnInit() {
    if (this.auth.isStudent()) return;
    if (this.dateParam()) this.date.set(this.dateParam()!);
    const req = this.auth.isTeacher() ? this.api.courses({ teacherId: this.auth.user()?.teacherId }) : this.api.courses();
    req.subscribe(c => {
      this.courses.set(c);
      const fromUrl = Number(this.courseId());
      this.selectedId.set(c.some(x => x.id === fromUrl) ? fromUrl : c[0]?.id ?? null);
    });
  }

  private loadSheet(courseId: number, date: string) {
    this.api.rollCall(courseId, date).subscribe({
      next: sh => this.applySheet(sh),
      error: err => this.ui.error('Could not load the class list', errorMessage(err)),
    });
  }

  private applySheet(sh: RollCallSheet) {
    this.sheet.set(sh);
    this.lines.set(sh.lines.map(l => ({ ...l, status: l.status ?? 'PRESENT' })));
  }

  setStatus(i: number, status: AttendanceStatus) {
    this.lines.update(list => list.map((l, j) => j === i ? { ...l, status } : l));
  }

  setNote(i: number, note: string) {
    this.lines.update(list => list.map((l, j) => j === i ? { ...l, note } : l));
  }

  setAll(status: AttendanceStatus) {
    this.lines.update(list => list.map(l => ({ ...l, status })));
  }

  save() {
    const id = this.selectedId();
    if (id === null) return;
    this.busy.set(true);
    const entries = this.lines().map(l => ({ studentId: l.studentId, status: l.status, note: l.note || null }));
    const flagged = entries.filter(e => e.status === 'ABSENT' || e.status === 'LATE').length;
    this.api.saveRollCall(id, this.date(), entries).subscribe({
      next: sh => {
        this.busy.set(false);
        this.applySheet(sh);
        this.ui.ok('Attendance saved', flagged ? `${flagged} ${flagged === 1 ? 'student was' : 'students were'} flagged and notified.` : 'Everyone attended.');
      },
      error: err => { this.busy.set(false); this.ui.error('Could not save attendance', errorMessage(err)); },
    });
  }

  count(s: AttendanceStatus): number {
    const sum = this.summary();
    if (!sum) return 0;
    return { PRESENT: sum.present, LATE: sum.late, ABSENT: sum.absent, EXCUSED: sum.excused }[s];
  }

  statusClass(s: AttendanceStatus) {
    return { PRESENT: 'tag ok', LATE: 'tag warn', ABSENT: 'tag danger', EXCUSED: 'tag' }[s];
  }
}
