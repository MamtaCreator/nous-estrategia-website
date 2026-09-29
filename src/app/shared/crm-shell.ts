import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, exhaustMap, filter, of, timer } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { LoadingService } from '../core/services/loading.service';
import { Phase4Service } from '../modules/phase4/services/phase4.service';

@Component({
  selector: 'app-crm-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './crm-shell.html',
  styleUrl: './crm-shell.css',
})
export class CrmShell {
  protected readonly auth = inject(AuthService);
  protected readonly loading = inject(LoadingService);
  private readonly router = inject(Router);
  private readonly api = inject(Phase4Service);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly unread = signal(0);

  /**
   * Set while the person is signing out on purpose. The effect below sends a vanished session to the
   * sign-in form, which is right when a token expires underneath someone, but wrong when they chose to
   * leave - so a deliberate sign-out marks itself and routes itself.
   */
  private signingOut = false;

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated() && !this.signingOut) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      }
    });

    // Unread notification badge: refreshed every minute while the tab is visible.
    timer(0, 60000).pipe(
      filter(() => !document.hidden && this.auth.isAuthenticated()),
      exhaustMap(() => this.api.notificationSummary().pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((s) => { if (s) this.unread.set(s.unreadCount); });
  }

  protected search(term: string): void {
    const q = term.trim();
    if (q.length >= 2) this.router.navigate(['/app/search'], { queryParams: { q } });
  }

  protected logout(): void {
    this.signingOut = true;
    this.auth.logout();
    // Signing out deliberately returns to the public home page, not the sign-in form: the person chose to
    // leave, so presenting them with a login box implies they still have somewhere to get back into.
    // Being signed out involuntarily is different - the interceptor and the route guard still send those
    // to /login with a returnUrl, so an expired session resumes where it left off.
    this.router.navigateByUrl('/');
  }
}
