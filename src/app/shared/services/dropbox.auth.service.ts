import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private readonly storageKey = 'dropbox_access_token';
  private readonly returnUrlKey = 'dropbox_auth_return_url';

  constructor(private http: HttpClient, private router: Router) {}

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.storageKey);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  clearToken(): void {
    sessionStorage.removeItem(this.storageKey);
  }

  startOAuth(returnUrl?: string): void {
    if (returnUrl) {
      sessionStorage.setItem(this.returnUrlKey, returnUrl);
    }

    const redirectUri = this.getRedirectUri();
    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${environment.appKEY}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  }

  exchangeCodeForToken(code: string): Observable<string> {
    const redirectUri = this.getRedirectUri();
    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: environment.appKEY,
      client_secret: environment.appSecret || '',
      redirect_uri: redirectUri,
    });

    return this.http
      .post<{ access_token: string }>(
        'https://api.dropboxapi.com/oauth2/token',
        body.toString(),
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }
      )
      .pipe(
        map((response) => response.access_token),
        tap((token) => this.storeToken(token))
      );
  }

  fetchAccountInfo(): Observable<any> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(
      'https://api.dropboxapi.com/2/users/get_current_account',
      null,
      { headers }
    );
  }

  storeToken(token: string): void {
    sessionStorage.setItem(this.storageKey, token);
  }

  getStoredReturnUrl(): string {
    return sessionStorage.getItem(this.returnUrlKey) || '/dashboard/lessons';
  }

  clearStoredReturnUrl(): void {
    sessionStorage.removeItem(this.returnUrlKey);
  }

  redirectToLogin(): void {
    this.router.navigate(['/auth/dropbox-login']);
  }

  private getRedirectUri(): string {
    return `${window.location.origin}/auth/dropbox-login`;
  }
}
