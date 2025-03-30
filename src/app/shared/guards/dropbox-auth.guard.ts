import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { DropboxAuthService } from '../services/dropbox.auth.service';
import { Observable, map, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DropboxAuthGuard implements CanActivate {
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const isAuthenticated = this.dropboxAuthService.isAuthenticated();
    
    if (!isAuthenticated) {
      // Store the attempted URL for redirecting
      this.dropboxAuthService.initiateAuth(state.url);
      
      // Navigate to the login page
      this.router.navigate(['/dropbox-login'], {
        queryParams: { returnUrl: state.url }
      });
      
      return false;
    }
    
    return true;
  }
} 