import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DropboxAuthService } from '../services/dropbox.auth.service';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthGuard implements CanActivate {
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private router: Router
  ) {}

  canActivate():
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.dropboxAuthService.validateToken().pipe(
      map((valid: boolean) => {
        if (valid) {
          return true;
        } else {
          this.dropboxAuthService.redirectToLogin();
          return false;
        }
      }),
      catchError(() => {
        this.dropboxAuthService.redirectToLogin();
        return of(false);
      })
    );
  }
}
