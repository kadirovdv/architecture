import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DropboxAuthService } from '../services/dropbox.auth.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class DropboxAuthInterceptor implements HttpInterceptor {
  
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check if this is a Dropbox API request
    const isDropboxRequest = 
      request.url.includes('api.dropboxapi.com') || 
      request.url.includes('content.dropboxapi.com');
    
    if (isDropboxRequest) {
      // Add token to the request, using environment token for API calls
      const token = this.dropboxAuthService.getAccessToken();
      if (!token) {
        console.error('No Dropbox token available');
        this.dropboxAuthService.redirectToLogin();
        return throwError(() => new Error('No Dropbox token available'));
      }
      
      // Add the token to the request
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Send the request and handle expired token errors
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          console.log('Dropbox API error:', error);

          // Check specifically for expired_access_token error from Dropbox API
          if (
            error.error?.error && 
            error.error.error['.tag'] === 'expired_access_token'
          ) {
            console.warn('Dropbox token has expired');
            
            // Show error message to user
            this.translate.get(['dropbox.errors.expired', 'dropbox.errors.auth-required']).subscribe(texts => {
              this.toastr.error(
                texts['dropbox.errors.expired'],
                texts['dropbox.errors.auth-required']
              );
            });
            
            // Clear the token
            this.dropboxAuthService.clearToken();
            
            // Redirect to login to get a new user token
            this.dropboxAuthService.redirectToLogin();
            
            return throwError(() => new Error('Dropbox token expired. Please log in again.'));
          }
          
          // Also handle 401 errors
          if (error.status === 401) {
            console.warn('Unauthorized access to Dropbox API (401)');
            
            // Show error message to user
            this.translate.get(['dropbox.errors.auth-failed', 'dropbox.errors.auth-required']).subscribe(texts => {
              this.toastr.error(
                texts['dropbox.errors.auth-failed'],
                texts['dropbox.errors.auth-required']
              );
            });
            
            // Clear the token
            this.dropboxAuthService.clearToken();
            
            // Redirect to login
            this.dropboxAuthService.redirectToLogin();
            
            return throwError(() => new Error('Dropbox authentication failed. Please log in again.'));
          }
          
          // For other errors, just pass them through
          return throwError(() => error);
        })
      );
    }
    
    // Not a Dropbox request, just pass it through
    return next.handle(request);
  }
} 