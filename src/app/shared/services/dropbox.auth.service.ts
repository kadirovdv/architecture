import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private storageKey = 'accessToken';
  public token: string = sessionStorage.getItem(this.storageKey) || environment.dropboxToken;
  constructor(private http: HttpClient, private router: Router) {}

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.storageKey) || environment.dropboxToken;
  }

  validateToken(): Observable<any> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    const url = 'https://api.dropboxapi.com/2/users/get_current_account';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(url, null, { headers }).pipe(
      catchError((error) => {
        sessionStorage.removeItem(this.storageKey);
        return throwError(() => error);
      })
    );
  }

  redirectToLogin(): void {
    this.router.navigate(['/auth/dropbox-login']);
  }

  extractTokenFromUrl(): void {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      sessionStorage.setItem(this.storageKey, accessToken);
    }
  }

  startOAuth(): void {
    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${environment.appKEY}&redirect_uri=${window.location.origin}`;
    window.location.href = authUrl;
  }

  setTokenManually(token: string): void {
    this.token = token;
    sessionStorage.setItem(this.storageKey, this.token);
  }
}
