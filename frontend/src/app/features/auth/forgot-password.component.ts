import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { LogoComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { CoilFigureComponent } from './coil-figure.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, LogoComponent, IconComponent, CoilFigureComponent],
  template: `
    <div class="auth">
      <section class="plate">
        <div class="brand display"><app-logo [size]="40" /> Tesla School</div>
        <figure><app-coil-figure /></figure>
        <div><h2>Locked out?</h2><p>We'll email you a link to choose a new password.</p></div>
      </section>
      <section class="form-side">
        <div class="card">
          <h1>Reset your password</h1>
          @if (sent()) {
            <p class="lead">If an account exists for <strong>{{ form.controls.email.value }}</strong>, a reset link is on its
              way. It works once and expires in 30 minutes.</p>
            <div class="alert ok"><app-icon name="mail" [size]="17" /> Check your inbox, and your spam folder.</div>
          } @else {
            <p class="lead">Enter your school email and we'll send you a reset link.</p>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
              <div class="field">
                <label for="email">Email</label>
                <input id="email" class="input" type="email" formControlName="email" autocomplete="username" autofocus />
              </div>
              <button class="btn primary submit" type="submit" [disabled]="busy()">
                {{ busy() ? 'Sending…' : 'Send reset link' }}
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
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit() {
    if (this.form.invalid) { this.error.set('Enter a valid email address.'); return; }
    this.busy.set(true);
    this.api.forgotPassword(this.form.controls.email.value).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
