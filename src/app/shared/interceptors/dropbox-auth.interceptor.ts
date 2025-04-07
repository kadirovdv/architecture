import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DropboxAuthService } from '../services/dropbox.auth.service';
import { DropboxService } from '../services/dropbox.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class DropboxAuthInterceptor implements HttpInterceptor {
  
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private dropboxService: DropboxService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check if this is a Dropbox API request
    const isDropboxRequest = 
      request.url.includes('api.dropboxapi.com') || 
      request.url.includes('content.dropboxapi.com');
    
    if (isDropboxRequest) {
      // Don't intercept the validation request itself to avoid infinite loops
      if (request.url.includes('users/get_current_account')) {
        return next.handle(request).pipe(
          catchError((error) => throwError(() => error))
        );
      }
      
      // Get token source
      const tokenSource = this.dropboxAuthService.getTokenSource();
      
      // Check if token is expired before even sending the request
      if (this.dropboxAuthService.isTokenExpired()) {
        // If the token was from environment, try to refresh it first
        if (tokenSource === 'environment' && environment.dropboxToken) {
          // Try to use the environment token again (maybe it was updated)
          this.dropboxAuthService.setToken(environment.dropboxToken, 'environment');
          
          // If it's still expired, redirect
          if (this.dropboxAuthService.isTokenExpired()) {
            this.dropboxAuthService.redirectToLogin();
            return throwError(() => new Error('Dropbox token expired. Redirecting to login.'));
          }
        } else {
          // Redirect to login page since token is expired
          this.dropboxAuthService.redirectToLogin();
          return throwError(() => new Error('Dropbox token expired. Redirecting to login.'));
        }
      }
      
      // If token is not expired, proceed with the request and catch any 401 errors
      return next.handle(request).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            // Get token source before clearing
            const source = this.dropboxAuthService.getTokenSource();
            
            // Clear the current token as it's invalid
            this.dropboxAuthService.clearToken();
            
            // If the token was from environment, try to refresh it
            if (source === 'environment' && environment.dropboxToken) {
              this.dropboxAuthService.setToken(environment.dropboxToken, 'environment');
              
              // Verify the token
              this.verifyEnvironmentToken();
              
              // If it's still expired, redirect
              if (this.dropboxAuthService.isTokenExpired()) {
                this.dropboxAuthService.redirectToLogin();
                return throwError(() => new Error('Environment token is invalid. Redirecting to login.'));
              }
            } else {
              // Redirect to login page
              this.dropboxAuthService.redirectToLogin();
              return throwError(() => new Error('Dropbox authentication failed. Redirecting to login.'));
            }
          }
          
          // For any other errors, just pass them through
          return throwError(() => error);
        })
      );
    }
    
    // Not a Dropbox request, just pass it through
    return next.handle(request);
  }

  /**
   * Verify the environment token by making a validation request
   */
  private async verifyEnvironmentToken(): Promise<boolean> {
    try {
      await firstValueFrom(this.dropboxService.validateToken());
      return true;
    } catch (error) {
      console.error('Environment token validation failed:', error);
      this.dropboxAuthService.clearToken();
      return false;
    }
  }
} 