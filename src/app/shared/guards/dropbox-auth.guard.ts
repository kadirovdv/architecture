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
    // Check if we're currently on the dropbox-login page to avoid redirect loops
    if (state.url.includes('dropbox-login')) {
      return true;
    }
    
    const isAuthenticated = this.dropboxAuthService.isAuthenticated();
    console.log('DropboxAuthGuard check:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login page');
      
      // Store the attempted URL for redirecting
      this.dropboxAuthService.initiateAuth(state.url);
      
      // Navigate to the login page with return URL
      this.router.navigate(['/dropbox-login'], {
        queryParams: { returnUrl: state.url }
      });
      
      return false;
    }
    
    console.log('Authenticated, allowing navigation to:', state.url);
    return true;
  }
} 