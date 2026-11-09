import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, StudentInput, errorMessage } from '../../core/api.service';
import { SchoolClass, Student } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-student-form',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [open]="open()" [title]="student() ? 'Edit student' : 'Add a student'"
               [subtitle]="student() ? student()!.studentNumber : 'They’ll get a welcome email with a temporary password.'"
               [width]="640" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()" id="student-form" novalidate>
        @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field"><label for="sf-first">First name</label>
            <input id="sf-first" class="input" formControlName="firstName" /></div>
          <div class="field"><label for="sf-last">Last name</label>
            <input id="sf-last" class="input" formControlName="lastName" /></div>
          <div class="field span-2"><label for="sf-email">School email</label>
            <input id="sf-email" class="input" type="email" formControlName="email" /></div>
          <div class="field"><label for="sf-class">Class</label>
            <select id="sf-class" class="select" formControlName="classId">
              <option [ngValue]="null">Not assigned</option>
              @for (c of classes(); track c.id) {
                <option [ngValue]="c.id" [disabled]="c.studentCount >= c.capacity && c.id !== student()?.classId">
                  {{ c.name }} ({{ c.studentCount }}/{{ c.capacity }})
                </option>
              }
            </select></div>
          <div class="field"><label for="sf-dob">Date of birth</label>
            <input id="sf-dob" class="input" type="date" formControlName="dateOfBirth" /></div>
          <div class="field"><label for="sf-phone">Phone</label>
            <input id="sf-phone" class="input" formControlName="phone" /></div>
          <div class="field"><label for="sf-address">Address</label>
            <input id="sf-address" class="input" formControlName="address" /></div>
          <div class="field"><label for="sf-gname">Guardian name</label>
            <input id="sf-gname" class="input" formControlName="guardianName" /></div>
          <div class="field"><label for="sf-gemail">Guardian email</label>
            <input id="sf-gemail" class="input" type="email" formControlName="guardianEmail" />
            <span class="hint">Receives absence alerts.</span></div>
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="student-form" class="btn primary" [disabled]="busy()">
          {{ busy() ? 'Saving…' : student() ? 'Save changes' : 'Add student' }}
        </button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentFormComponent {
  readonly open = input(false);
  readonly student = input<Student | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Student>();

  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly classes = signal<SchoolClass[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    classId: [null as number | null],
    dateOfBirth: [''],
    phone: [''],
    address: [''],
    guardianName: [''],
    guardianEmail: ['', Validators.email],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.error.set(null);
      this.api.classes().subscribe(c => this.classes.set(c));
      const s = this.student();
      this.form.reset({
        firstName: s?.firstName ?? '', lastName: s?.lastName ?? '', email: s?.email ?? '',
        classId: s?.classId ?? null, dateOfBirth: s?.dateOfBirth ?? '', phone: s?.phone ?? '',
        address: s?.address ?? '', guardianName: s?.guardianName ?? '', guardianEmail: s?.guardianEmail ?? '',
      });
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Check the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const body: StudentInput = {
      firstName: v.firstName ?? '', lastName: v.lastName ?? '', email: v.email ?? '',
      classId: v.classId ?? null, dateOfBirth: v.dateOfBirth || null, phone: v.phone || null,
      address: v.address || null, guardianName: v.guardianName || null, guardianEmail: v.guardianEmail || null,
    };
    const s = this.student();
    this.busy.set(true);
    (s ? this.api.updateStudent(s.id, body) : this.api.createStudent(body)).subscribe({
      next: saved => {
        this.busy.set(false);
        this.ui.ok(s ? 'Student updated' : 'Student added', s ? undefined : `A welcome email was sent to ${saved.email}.`);
        this.saved.emit(saved);
      },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
