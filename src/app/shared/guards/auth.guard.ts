import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BackendAuthService } from '../services/backend-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private backendAuth: BackendAuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.backendAuth.me().pipe(
      map(() => true),
      catchError(() => {
          this.router.navigate(['/auth/login']);
        return of(false);
      }),
    );
  }
}
