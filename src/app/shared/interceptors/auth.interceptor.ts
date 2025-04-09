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
import { environment } from 'src/environments/environment';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly token: string = environment.dropboxToken;

  constructor(private toastr: ToastrService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only intercept Dropbox API requests
    if (!request.url.includes('dropbox')) {
      return next.handle(request);
    }

    // Get the token from environment
    const token = this.token;
    
    // Add the authorization header if we have a token
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
        }
      });
      console.log('Added Dropbox Bearer token to request:', request.url);
    } else {
      console.warn('No Dropbox token available for request:', request.url);
      this.toastr.error('Dropbox token not configured', 'Configuration Error');
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle API errors
        if (error.status === 401 || error.status === 403) {
          console.error('Dropbox API authentication error:', error);
          this.toastr.error('Dropbox API request failed due to authentication error', 'API Error');
        }
        
        return throwError(() => error);
      })
    );
  }
} 