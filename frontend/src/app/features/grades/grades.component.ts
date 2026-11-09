import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Course, GRADE_TYPES, Grade, GradeSummary, GradeType, Student, isoDate, titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { DialComponent } from '../../shared/dial.component';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

interface Assessment { key: string; title: string; type: GradeType; date: string; maxScore: number; }

@Component({
  selector: 'app-grades',
  imports: [FormsModule, DatePipe, DecimalPipe, AvatarComponent, DialComponent, IconComponent, ModalComponent],
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradesComponent implements OnInit {
  readonly courseId = input<string>();

  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly types = GRADE_TYPES;
  readonly titleCase = titleCase;

  // -------- teacher / admin
  readonly courses = signal<Course[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly course = computed(() => this.courses().find(c => c.id === this.selectedId()) ?? null);
  readonly roster = signal<Student[]>([]);
  readonly grades = signal<Grade[]>([]);
  readonly loading = signal(false);

  readonly assessments = computed<Assessment[]>(() => {
    const map = new Map<string, Assessment>();
    for (const g of this.grades()) {
      const key = `${g.date}|${g.title}`;
      if (!map.has(key)) map.set(key, { key, title: g.title, type: g.type, date: g.date, maxScore: g.maxScore });
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly cells = computed(() => {
    const map = new Map<string, Grade>();
    for (const g of this.grades()) map.set(`${g.studentId}|${g.date}|${g.title}`, g);
    return map;
  });

  readonly studentAverages = computed(() => {
    const map = new Map<number, number>();
    const by = new Map<number, number[]>();
    for (const g of this.grades()) by.set(g.studentId, [...(by.get(g.studentId) ?? []), g.score / g.maxScore * 100]);
    by.forEach((v, k) => map.set(k, v.reduce((a, b) => a + b, 0) / v.length));
    return map;
  });

  readonly assessmentAverages = computed(() => {
    const map = new Map<string, number>();
    for (const a of this.assessments()) {
      const list = this.grades().filter(g => `${g.date}|${g.title}` === a.key);
      if (list.length) map.set(a.key, list.reduce((s, g) => s + g.score / g.maxScore * 100, 0) / list.length);
    }
    return map;
  });

  // -------- new assessment (bulk)
  readonly bulkOpen = signal(false);
  readonly bulkBusy = signal(false);
  readonly bulkError = signal<string | null>(null);
  bulk = { title: '', type: 'QUIZ' as GradeType, maxScore: 20, date: isoDate() };
  bulkScores: Record<number, number | null> = {};

  // -------- edit one grade
  readonly editing = signal<Grade | null>(null);
  editScore = 0;
  editComment = '';

  // -------- student
  readonly mine = signal<Grade[]>([]);
  readonly summary = signal<GradeSummary | null>(null);
  readonly courseFilter = signal<number | null>(null);
  readonly myFiltered = computed(() => this.mine().filter(g => this.courseFilter() === null || g.courseId === this.courseFilter()));

  constructor() {
    if (this.auth.isStudent()) {
      this.api.myGrades().subscribe(g => this.mine.set(g));
      this.api.myGradeSummary().subscribe(s => this.summary.set(s));
    } else {
      effect(() => {
        const id = this.selectedId();
        if (id !== null) this.loadCourse(id);
      });
    }
  }

  ngOnInit() {
    if (this.auth.isStudent()) return;
    const req = this.auth.isTeacher() ? this.api.courses({ teacherId: this.auth.user()?.teacherId }) : this.api.courses();
    req.subscribe(c => {
      this.courses.set(c);
      const fromUrl = Number(this.courseId());
      this.selectedId.set(c.some(x => x.id === fromUrl) ? fromUrl : c[0]?.id ?? null);
    });
  }

  select(id: number) {
    this.selectedId.set(id);
    void this.router.navigate([], { queryParams: { courseId: id }, replaceUrl: true });
  }

  private loadCourse(id: number) {
    const c = this.courses().find(x => x.id === id);
    if (!c) return;
    this.loading.set(true);
    this.api.classStudents(c.classId).subscribe(s => this.roster.set(s));
    this.api.courseGrades(id).subscribe({
      next: g => { this.grades.set(g); this.loading.set(false); },
      error: err => { this.loading.set(false); this.ui.error('Could not load grades', errorMessage(err)); },
    });
  }

  cell(studentId: number, a: Assessment): Grade | undefined {
    return this.cells().get(`${studentId}|${a.date}|${a.title}`);
  }

  tone(pct: number | undefined | null): string {
    if (pct === undefined || pct === null) return '';
    return pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'low';
  }

  openBulk() {
    this.bulk = { title: '', type: 'QUIZ', maxScore: 20, date: isoDate() };
    this.bulkScores = Object.fromEntries(this.roster().map(s => [s.id, null]));
    this.bulkError.set(null);
    this.bulkOpen.set(true);
  }

  saveBulk() {
    const c = this.course();
    if (!c) return;
    if (!this.bulk.title.trim()) { this.bulkError.set('Give the assessment a title.'); return; }
    const entries = this.roster().map(s => ({ studentId: s.id, score: this.bulkScores[s.id] ?? null, comment: null }));
    const bad = entries.find(e => e.score !== null && (e.score < 0 || e.score > this.bulk.maxScore));
    if (bad) { this.bulkError.set(`Scores must be between 0 and ${this.bulk.maxScore}.`); return; }
    if (!entries.some(e => e.score !== null)) { this.bulkError.set('Enter at least one score.'); return; }
    this.bulkBusy.set(true);
    this.api.postGrades({ courseId: c.id, title: this.bulk.title.trim(), type: this.bulk.type,
      maxScore: Number(this.bulk.maxScore), date: this.bulk.date, entries }).subscribe({
      next: saved => {
        this.bulkBusy.set(false);
        this.bulkOpen.set(false);
        this.ui.ok('Grades posted', `${saved.length} students were notified.`);
        this.loadCourse(c.id);
      },
      error: err => { this.bulkBusy.set(false); this.bulkError.set(errorMessage(err)); },
    });
  }

  openEdit(g: Grade) {
    this.editScore = g.score;
    this.editComment = g.comment ?? '';
    this.editing.set(g);
  }

  saveEdit() {
    const g = this.editing();
    if (!g) return;
    this.api.updateGrade(g.id, { studentId: g.studentId, courseId: g.courseId, title: g.title, type: g.type,
      score: Number(this.editScore), maxScore: g.maxScore, date: g.date, comment: this.editComment || null }).subscribe({
      next: () => { this.editing.set(null); this.ui.ok('Grade updated'); this.loadCourse(g.courseId); },
      error: err => this.ui.error('Could not update', errorMessage(err)),
    });
  }

  async deleteGrade(g: Grade) {
    if (!await this.ui.confirm('Delete this grade?', `${g.studentName}: ${g.title}, ${g.score}/${g.maxScore}.`, 'Delete grade')) return;
    this.api.deleteGrade(g.id).subscribe({
      next: () => { this.editing.set(null); this.ui.ok('Grade deleted'); this.loadCourse(g.courseId); },
      error: err => this.ui.error('Could not delete', errorMessage(err)),
    });
  }
}
