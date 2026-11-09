import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Page, Role, UserAccount, titleCase } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { AvatarComponent } from '../../shared/brand';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PagerComponent } from '../../shared/pager.component';

@Component({
  selector: 'app-accounts',
  imports: [FormsModule, ReactiveFormsModule, DatePipe, AvatarComponent, IconComponent, ModalComponent, PagerComponent],
  template: `
    <div class="page-head">
      <div><h1>Accounts</h1><p>Every login at Tesla School. Disable an account to block sign-in without deleting any records.</p></div>
      <button type="button" class="btn primary" (click)="openCreate()"><app-icon name="plus" [size]="17" /> Add administrator</button>
    </div>

    <div class="toolbar">
      <label class="search grow">
        <span class="sr-only">Search accounts</span>
        <app-icon name="search" [size]="17" />
        <input class="input" type="search" placeholder="Search by name or email" [ngModel]="q()" (ngModelChange)="search($event)" />
      </label>
      <div class="segmented" role="tablist" aria-label="Filter by role">
        @for (r of roles; track r.label) {
          <button type="button" [class.active]="role() === r.value" (click)="role.set(r.value); load(0)">{{ r.label }}</button>
        }
      </div>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Person</th><th>Role</th><th>Last sign-in</th><th>Status</th><th class="right">Actions</th></tr></thead>
          <tbody>
            @for (u of page()?.content ?? []; track u.id) {
              <tr>
                <td><div class="row"><app-avatar [name]="u.fullName" [size]="32" />
                  <div><strong>{{ u.fullName }}</strong><div class="muted small">{{ u.email }}</div></div></div></td>
                <td><span class="tag" [class.arc]="u.role === 'ADMIN'">{{ titleCase(u.role) }}</span></td>
                <td class="muted small">{{ u.lastLoginAt ? (u.lastLoginAt | date: 'd MMM, HH:mm') : 'Never' }}
                  @if (u.mustChangePassword) { <div class="warn-text">Temporary password</div> }</td>
                <td>
                  <label class="switch" [attr.title]="u.id === auth.user()?.id ? 'You can’t disable your own account' : ''">
                    <input type="checkbox" [checked]="u.enabled" [disabled]="u.id === auth.user()?.id" (change)="toggle(u)" />
                    <span class="track"></span><span>{{ u.enabled ? 'Active' : 'Disabled' }}</span>
                  </label>
                </td>
                <td class="right">
                  <button type="button" class="btn sm" (click)="reset(u)"><app-icon name="key" [size]="14" /> Reset password</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5"><div class="empty"><h3>No accounts match</h3></div></td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pager [page]="page()" (change)="load($event)" />
    </section>

    <app-modal [open]="createOpen()" title="Add an administrator" subtitle="They’ll get a welcome email with a temporary password."
               [width]="480" (closed)="createOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="create()" id="admin-form" novalidate>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field"><label for="ad-first">First name</label><input id="ad-first" class="input" formControlName="firstName" /></div>
          <div class="field"><label for="ad-last">Last name</label><input id="ad-last" class="input" formControlName="lastName" /></div>
          <div class="field span-2"><label for="ad-email">Email</label><input id="ad-email" class="input" type="email" formControlName="email" /></div>
        </div>
      </form>
      <div modal-actions>
        <button type="button" class="btn" (click)="createOpen.set(false)">Cancel</button>
        <button type="submit" form="admin-form" class="btn primary" [disabled]="busy()">Add administrator</button>
      </div>
    </app-modal>
  `,
  styles: `
    .warn-text { color: var(--warn); font-size: .78rem; font-weight: 600; }
    .switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-size: .88rem; position: relative; }
    .switch input { position: absolute; opacity: 0; width: 38px; height: 22px; margin: 0; cursor: pointer; }
    .track { width: 38px; height: 22px; border-radius: 11px; background: var(--line-strong); position: relative; transition: background-color .15s; }
    .track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%;
                    background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgb(0 0 0 / 25%); }
    .switch input:checked + .track { background: var(--ok); }
    .switch input:checked + .track::after { transform: translateX(16px); }
    .switch input:focus-visible + .track { box-shadow: var(--focus); }
    .switch input:disabled + .track { opacity: .5; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly auth = inject(AuthService);
  readonly titleCase = titleCase;
  readonly roles: { label: string; value: Role | null }[] = [
    { label: 'All', value: null }, { label: 'Admins', value: 'ADMIN' },
    { label: 'Teachers', value: 'TEACHER' }, { label: 'Students', value: 'STUDENT' }];

  readonly page = signal<Page<UserAccount> | null>(null);
  readonly q = signal('');
  readonly role = signal<Role | null>(null);
  readonly createOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
  });
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() { this.load(0); }

  search(v: string) {
    this.q.set(v);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(0), 250);
  }

  load(p: number) { this.api.users(this.q(), this.role(), p).subscribe(page => this.page.set(page)); }

  private replace(u: UserAccount) {
    this.page.update(p => p ? { ...p, content: p.content.map(x => x.id === u.id ? u : x) } : p);
  }

  toggle(u: UserAccount) {
    this.api.setUserEnabled(u.id, !u.enabled).subscribe({
      next: saved => { this.replace(saved); this.ui.ok(saved.enabled ? 'Account enabled' : 'Account disabled', saved.fullName); },
      error: err => { this.replace(u); this.ui.error('Could not change the account', errorMessage(err)); },
    });
  }

  async reset(u: UserAccount) {
    if (!await this.ui.confirm(`Reset ${u.fullName}'s password?`,
      'A temporary password is emailed to them. Their current password stops working immediately.', 'Reset password', false)) return;
    this.api.resetUserPassword(u.id).subscribe({
      next: saved => { this.replace(saved); this.ui.ok('Password reset', `A temporary password was emailed to ${saved.email}.`); },
      error: err => this.ui.error('Could not reset the password', errorMessage(err)),
    });
  }

  openCreate() {
    this.form.reset();
    this.error.set(null);
    this.createOpen.set(true);
  }

  create() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Name and a valid email are required.'); return; }
    this.busy.set(true);
    this.api.createAdmin(this.form.getRawValue()).subscribe({
      next: u => { this.busy.set(false); this.createOpen.set(false); this.ui.ok('Administrator added', `A welcome email was sent to ${u.email}.`); this.load(0); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
