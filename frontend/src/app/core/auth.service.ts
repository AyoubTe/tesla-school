import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Me, Role } from './models';

const TOKEN_KEY = 'tesla.token';
const EXPIRES_KEY = 'tesla.expires';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly tokenSig = signal<string | null>(this.readToken());
  readonly user = signal<Me | null>(null);

  readonly token = this.tokenSig.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSig());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly isTeacher = computed(() => this.role() === 'TEACHER');
  readonly isStudent = computed(() => this.role() === 'STUDENT');

  login(email: string, password: string): Observable<Me> {
    return this.api.login(email, password).pipe(
      tap(res => {
        this.store(res.token, res.expiresAt);
        this.user.set(res.user);
      }),
      map(res => res.user),
    );
  }

  /** Loads the profile behind a stored token; resolves to null (and signs out) if the token is no longer valid. */
  restore(): Observable<Me | null> {
    if (!this.tokenSig()) return of(null);
    if (this.user()) return of(this.user());
    return this.api.me().pipe(
      tap(me => this.user.set(me)),
      catchError(() => {
        this.clear();
        return of(null);
      }),
    );
  }

  logout(redirect = true): void {
    this.clear();
    if (redirect) void this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const r = this.role();
    return !!r && roles.includes(r);
  }

  private store(token: string, expiresAt: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXPIRES_KEY, expiresAt);
    } catch { /* storage unavailable: keep the session in memory only */ }
    this.tokenSig.set(token);
  }

  private clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch { /* ignore */ }
    this.tokenSig.set(null);
    this.user.set(null);
  }

  private readToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const expires = localStorage.getItem(EXPIRES_KEY);
      if (!token || (expires && new Date(expires).getTime() < Date.now())) return null;
      return token;
    } catch {
      return null;
    }
  }
}
