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
import { Router } from '@angular/router';
import { DropboxAuthService } from '../services/dropbox.auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private dropboxAuthService: DropboxAuthService,
    private toastr: ToastrService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only intercept Dropbox API requests
    if (!request.url.includes('dropbox')) {
      return next.handle(request);
    }

    // Add the authorization header if we have a token
    const token = this.dropboxAuthService.getAccessToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized and 403 Forbidden errors
        if (error.status === 401 || error.status === 403 || 
            (error.error && typeof error.error === 'string' && 
             error.error.includes('invalid_access_token'))) {
          console.error('Authentication error with Dropbox API:', error);
          
          // Show error to user
          this.toastr.error('Your Dropbox session has expired. Please log in again.', 'Authentication Error');
          
          // Clear the invalid token
          this.dropboxAuthService.signOut();
          
          // Store the current route for redirect after login
          const currentUrl = this.router.url;
          
          // Redirect to login page
          this.router.navigate(['/dropbox-login'], { 
            queryParams: { returnUrl: currentUrl }
          });
        }
        
        return throwError(() => error);
      })
    );
  }
} 