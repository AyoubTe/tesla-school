import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import { LogoComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { CoilFigureComponent } from './coil-figure.component';

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, LogoComponent, IconComponent, CoilFigureComponent],
  template: `
    <div class="auth">
      <section class="plate">
        <div class="brand display"><app-logo [size]="40" /> Tesla School</div>
        <figure><app-coil-figure /></figure>
        <div><h2>A fresh start.</h2><p>Pick a password you don't use anywhere else.</p></div>
      </section>
      <section class="form-side">
        <div class="card">
          <h1>Choose a new password</h1>
          @if (!token()) {
            <p class="lead">This page needs the link from your reset email.</p>
            <a routerLink="/forgot-password" class="btn primary submit">Request a new link</a>
          } @else {
            <p class="lead">At least 8 characters, with a letter and a number.</p>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
              <div class="field">
                <label for="pw">New password</label>
                <input id="pw" class="input" type="password" formControlName="password" autocomplete="new-password" />
              </div>
              <div class="field">
                <label for="pw2">Confirm new password</label>
                <input id="pw2" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
              </div>
              <button class="btn primary submit" type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : 'Save new password' }}
              </button>
            </form>
          }
          <a routerLink="/login" class="back"><app-icon name="back" [size]="16" /> Back to sign in</a>
        </div>
      </section>
    </div>
  `,
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  /** Bound from ?token= via withComponentInputBinding. */
  readonly token = input<string>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirm: ['', Validators.required],
  });

  submit() {
    const { password, confirm } = this.form.getRawValue();
    if (this.form.controls.password.invalid) { this.error.set('Use at least 8 characters with a letter and a number.'); return; }
    if (password !== confirm) { this.error.set('The two passwords don’t match.'); return; }
    this.busy.set(true);
    this.api.resetPassword(this.token() ?? '', password).subscribe({
      next: () => {
        this.ui.ok('Password changed', 'Sign in with your new password.');
        void this.router.navigate(['/login']);
      },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
