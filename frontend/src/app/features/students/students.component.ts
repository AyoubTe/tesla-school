import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Page, SchoolClass, Student } from '../../core/models';
import { AvatarComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { PagerComponent } from '../../shared/pager.component';
import { StudentFormComponent } from './student-form.component';

@Component({
  selector: 'app-students',
  imports: [FormsModule, IconComponent, AvatarComponent, PagerComponent, StudentFormComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Students</h1>
        <p>{{ page()?.totalElements ?? '…' }} enrolled this year.</p>
      </div>
      @if (auth.isAdmin()) {
        <button type="button" class="btn primary" (click)="formOpen.set(true)">
          <app-icon name="plus" [size]="17" /> Add student
        </button>
      }
    </div>

    <div class="toolbar">
      <label class="search grow">
        <span class="sr-only">Search students</span>
        <app-icon name="search" [size]="17" />
        <input class="input" type="search" placeholder="Search by name, email or student number"
               [ngModel]="q()" (ngModelChange)="search($event)" />
      </label>
      <select class="select" style="width:auto;min-width:190px" aria-label="Filter by class"
              [ngModel]="classId()" (ngModelChange)="classId.set($event); load(0)">
        <option [ngValue]="null">All classes</option>
        @for (c of classes(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
      </select>
    </div>

    <section class="panel">
      @if (error()) { <div class="panel-body"><div class="alert">{{ error() }}</div></div> }
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Student</th><th>Number</th><th>Class</th><th>Guardian</th><th>Status</th></tr></thead>
          <tbody>
            @for (s of page()?.content ?? []; track s.id) {
              <tr class="clickable" (click)="open(s)" (keydown.enter)="open(s)" tabindex="0">
                <td>
                  <div class="row">
                    <app-avatar [name]="s.fullName" [size]="34" />
                    <div><strong>{{ s.fullName }}</strong><div class="muted small">{{ s.email }}</div></div>
                  </div>
                </td>
                <td class="num muted">{{ s.studentNumber }}</td>
                <td>@if (s.className) { <span class="tag arc">{{ s.className }}</span> } @else { <span class="muted">–</span> }</td>
                <td class="muted small">{{ s.guardianName ?? '–' }}</td>
                <td>@if (s.enabled) { <span class="tag ok">Active</span> } @else { <span class="tag danger">Disabled</span> }</td>
              </tr>
            } @empty {
              @if (page()) {
                <tr><td colspan="5"><div class="empty"><app-icon name="search" [size]="28" />
                  <h3>No students match</h3><p>Try another name, or clear the class filter.</p></div></td></tr>
              } @else {
                @for (i of [1, 2, 3, 4, 5]; track i) { <tr><td colspan="5"><div class="skeleton" style="height:28px"></div></td></tr> }
              }
            }
          </tbody>
        </table>
      </div>
      <app-pager [page]="page()" (change)="load($event)" />
    </section>

    <app-student-form [open]="formOpen()" (closed)="formOpen.set(false)" (saved)="formOpen.set(false); load(0)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly page = signal<Page<Student> | null>(null);
  readonly classes = signal<SchoolClass[]>([]);
  readonly q = signal('');
  readonly classId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.api.classes().subscribe(c => this.classes.set(c));
    this.load(0);
  }

  search(value: string) {
    this.q.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(0), 250);
  }

  load(page: number) {
    this.api.students(this.q(), this.classId(), page).subscribe({
      next: p => { this.page.set(p); this.error.set(null); },
      error: err => this.error.set(errorMessage(err)),
    });
  }

  open(s: Student) {
    void this.router.navigate(['/students', s.id]);
  }
}
