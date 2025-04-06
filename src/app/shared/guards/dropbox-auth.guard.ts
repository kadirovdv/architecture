import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot,
  UrlTree,
  Router
} from '@angular/router';
import { Observable, map, catchError, of } from 'rxjs';
import { DropboxAuthService } from '../services/dropbox.auth.service';
import { DropboxTokenManagerService } from '../services/dropbox-token-manager.service';

@Injectable({
  providedIn: 'root'
})
export class DropboxAuthGuard implements CanActivate {
  
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private tokenManager: DropboxTokenManagerService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // If token is already expired, redirect to login immediately
    if (this.dropboxAuthService.isTokenExpired()) {
      this.dropboxAuthService.redirectToLogin(state.url);
      return false;
    }
    
    // Otherwise, verify the token with a lightweight API call
    return this.tokenManager.ensureValidToken().pipe(
      map(() => true),
      catchError(() => {
        // Route navigation will happen in the token manager service
        return of(false);
      })
    );
  }
} 