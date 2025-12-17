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
import { ToastrService } from 'ngx-toastr';
import { DropboxAuthService } from '../services/dropbox.auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private toastr: ToastrService,
    private dropboxAuth: DropboxAuthService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only intercept Dropbox API requests
    if (!request.url.includes('dropbox')) {
      return next.handle(request);
    }

    const token = this.dropboxAuth.getAccessToken();
    
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          console.error('Dropbox API authentication error:', error);
          this.toastr.error('Dropbox API request failed due to authentication error', 'API Error');
        }
        
        return throwError(() => error);
      })
    );
  }
} 
