import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { PASSWORD_PATTERN } from '../auth/reset-password.component';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AvatarComponent],
  template: `
    <div class="page-head"><div><h1>Profile</h1><p>Your name as others see it, and your password.</p></div></div>

    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-head"><h2 class="section-title">About you</h2></div>
        <div class="panel-body">
          <div class="row me">
            <app-avatar [name]="auth.user()?.fullName ?? ''" [size]="56" />
            <div>
              <strong>{{ auth.user()?.fullName }}</strong>
              <div class="muted small">{{ auth.user()?.email }}</div>
              <span class="tag arc">{{ titleCase(auth.user()?.role) }}{{ auth.user()?.className ? ', ' + auth.user()?.className : '' }}</span>
            </div>
          </div>
          <form [formGroup]="nameForm" (ngSubmit)="saveName()" class="stack" novalidate>
            <div class="form-grid">
              <div class="field"><label for="pf-first">First name</label><input id="pf-first" class="input" formControlName="firstName" /></div>
              <div class="field"><label for="pf-last">Last name</label><input id="pf-last" class="input" formControlName="lastName" /></div>
            </div>
            <div><button type="submit" class="btn primary" [disabled]="nameForm.pristine || nameBusy()">Save name</button></div>
          </form>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2 class="section-title">Change password</h2></div>
        <form class="panel-body stack" [formGroup]="pwForm" (ngSubmit)="savePassword()" novalidate>
          @if (pwError()) { <div class="alert">{{ pwError() }}</div> }
          <div class="field"><label for="pf-cur">Current password</label>
            <input id="pf-cur" class="input" type="password" formControlName="current" autocomplete="current-password" /></div>
          <div class="field"><label for="pf-new">New password</label>
            <input id="pf-new" class="input" type="password" formControlName="next" autocomplete="new-password" />
            <span class="hint">At least 8 characters, with a letter and a number.</span></div>
          <div class="field"><label for="pf-conf">Confirm new password</label>
            <input id="pf-conf" class="input" type="password" formControlName="confirm" autocomplete="new-password" /></div>
          <div><button type="submit" class="btn primary" [disabled]="pwBusy()">{{ pwBusy() ? 'Saving…' : 'Change password' }}</button></div>
        </form>
      </section>
    </div>
  `,
  styles: `.me { margin-bottom: 22px; gap: 16px; } .me .tag { margin-top: 6px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);
  readonly titleCase = titleCase;
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly nameBusy = signal(false);
  readonly pwBusy = signal(false);
  readonly pwError = signal<string | null>(null);

  readonly nameForm = this.fb.group({
    firstName: [this.auth.user()?.firstName ?? '', Validators.required],
    lastName: [this.auth.user()?.lastName ?? '', Validators.required],
  });
  readonly pwForm = this.fb.group({
    current: ['', Validators.required],
    next: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirm: ['', Validators.required],
  });

  saveName() {
    if (this.nameForm.invalid) return;
    const { firstName, lastName } = this.nameForm.getRawValue();
    this.nameBusy.set(true);
    this.api.updateProfile(firstName, lastName).subscribe({
      next: me => { this.nameBusy.set(false); this.auth.user.set(me); this.nameForm.markAsPristine(); this.ui.ok('Name saved'); },
      error: err => { this.nameBusy.set(false); this.ui.error('Could not save', errorMessage(err)); },
    });
  }

  savePassword() {
    const { current, next, confirm } = this.pwForm.getRawValue();
    if (!current) { this.pwError.set('Enter your current password.'); return; }
    if (this.pwForm.controls.next.invalid) { this.pwError.set('Use at least 8 characters with a letter and a number.'); return; }
    if (next !== confirm) { this.pwError.set('The new passwords don’t match.'); return; }
    this.pwBusy.set(true);
    this.pwError.set(null);
    this.api.changePassword(current, next).subscribe({
      next: () => {
        this.pwBusy.set(false);
        this.pwForm.reset();
        const u = this.auth.user();
        if (u) this.auth.user.set({ ...u, mustChangePassword: false });
        this.ui.ok('Password changed');
      },
      error: err => { this.pwBusy.set(false); this.pwError.set(errorMessage(err)); },
    });
  }
}
