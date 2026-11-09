import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LogoComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { CoilFigureComponent } from './coil-figure.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, LogoComponent, IconComponent, CoilFigureComponent],
  template: `
    <div class="auth">
      <section class="plate">
        <div class="brand display"><app-logo [size]="40" /> Tesla School</div>
        <figure><app-coil-figure /></figure>
        <div>
          <h2>Learning, at high voltage.</h2>
          <p>Timetables, grades, attendance and announcements for every student, teacher and member of staff.</p>
          <div class="legend">
            <span>A. Toroid &nbsp; B. Secondary coil &nbsp; C. Primary coil</span>
            <span>After N. Tesla's resonant transformer, 1891.</span>
          </div>
        </div>
      </section>

      <section class="form-side">
        <div class="card">
          <h1>Sign in</h1>
          <p class="lead">Use the email address the school gave you.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            @if (error()) { <div class="alert" role="alert"><app-icon name="alert" [size]="17" />{{ error() }}</div> }
            <div class="field">
              <label for="email">Email</label>
              <input id="email" class="input" type="email" formControlName="email" autocomplete="username" autofocus />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" class="input" type="password" formControlName="password" autocomplete="current-password" />
            </div>
            <div class="row-end">
              <span></span>
              <a routerLink="/forgot-password">Forgot password?</a>
            </div>
            <button class="btn primary submit" type="submit" [disabled]="busy()">
              {{ busy() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <div class="demo">
            <p>Demo accounts from the seed data</p>
            <div class="row">
              <button type="button" class="btn sm" (click)="fill('admin@tesla-school.edu', 'Admin@123')">
                <app-icon name="shield" [size]="15" /> Administrator
              </button>
              <button type="button" class="btn sm" (click)="fill('marcus.hale@tesla-school.edu', 'Teacher@123')">
                <app-icon name="users" [size]="15" /> Teacher
              </button>
              <button type="button" class="btn sm" (click)="fill('amelie.laurent@tesla-school.edu', 'Student@123')">
                <app-icon name="cap" [size]="15" /> Student
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  fill(email: string, password: string) {
    this.form.setValue({ email, password });
    this.error.set(null);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const next = this.route.snapshot.queryParamMap.get('next');
        void this.router.navigateByUrl(next && next.startsWith('/') ? next : '/');
      },
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, 'Sign-in failed. Try again.'));
      },
    });
  }
}
