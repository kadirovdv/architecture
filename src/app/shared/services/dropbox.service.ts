import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, from, throwError, defer, of } from 'rxjs';
import { catchError, map, shareReplay, share, switchMap, tap } from 'rxjs/operators';
import { DropboxAuthService } from './dropbox.auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

declare var Dropbox: any;

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private dbx: any;
  private envToken: string = environment.dropboxToken;

  constructor(
    private http: HttpClient,
    private dropboxAuthService: DropboxAuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.initializeToken();
  }

  /**
   * Initialize by setting the environment token if available
   */
  initializeToken() {
    console.log('Initializing Dropbox service with environment token');
    if (this.envToken) {
      this.dropboxAuthService.setToken(this.envToken);
    }
  }

  /**
   * Get the current access token or initiate authentication if not available
   */
  private getAuthToken(): string | null {
    // First check if environment token is set and valid
    if (this.envToken) {
      return this.envToken;
    }
    
    // Then try to get the token from the auth service
    const token = this.dropboxAuthService.getAccessToken();
    if (!token) {
      console.log('No Dropbox token available, initiating authentication');
      // Store current path for redirect after authentication
      const currentPath = this.router.url;
      this.dropboxAuthService.initiateAuth(currentPath);
      return null;
    }
    return token;
  }

  /**
   * Validate the token with a simple API call
   */
  validateToken(token: string): Observable<boolean> {
    const url = 'https://api.dropboxapi.com/2/users/get_current_account';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });

    return this.http.post(url, null, { headers }).pipe(
      map(() => true),
      catchError(error => {
        console.error('Token validation failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Handle authentication errors by redirecting to login
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 401 || error.status === 403) {
      console.log('Authentication error detected, redirecting to login');
      this.toastr.error('Dropbox authentication has expired. Redirecting to login...', 'Auth Error');
      
      // Clear invalid token
      this.dropboxAuthService.clearToken();
      
      // Redirect to login
      setTimeout(() => {
        this.router.navigate(['/dropbox-login']);
      }, 1000);
    }
    return throwError(() => error);
  }

  initializeDropbox() {
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${environment.appKEY}&response_type=token`;
    window.location.href = authUrl;
  }

  //   uploadFile(path: string, file: File): Observable<any> {
  //     const uploadUrl = `https://content.dropboxapi.com/2/files/upload`;
  //     const headers = new HttpHeaders({
  //       'Authorization': `Bearer ${this.accessToken}`,
  //       'Content-Type': 'application/octet-stream',
  //       'Dropbox-API-Arg': JSON.stringify({
  //         path: path,
  //         mode: 'add',
  //         autorename: true,
  //         mute: false,
  //       }),
  //     });

  //     return this.http.post(uploadUrl, file, { headers });
  //   }

  listFiles(path: string = ''): Observable<any> {
    const token = this.getAuthToken();
    if (!token) {
      console.error('Cannot list files: No authentication token');
      return throwError(() => new Error('Authentication required'));
    }

    const url = 'https://api.dropboxapi.com/2/files/list_folder';
    const body = { path: path || '' };
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(url, body, { headers }).pipe(
      catchError(error => {
        console.error('Error listing files:', error);
        return this.handleAuthError(error);
      })
    );
  }

  downloadFile(filePath: string): Observable<Blob> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const url = 'https://content.dropboxapi.com/2/files/download';

    return new Observable((observer) => {
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: filePath, // e.g., '/path/to/file.txt'
          }),
        },
      })
        .then((response) => {
          if (!response.ok) {
            // Check for auth errors
            if (response.status === 401 || response.status === 403) {
              this.dropboxAuthService.clearToken();
              this.toastr.error('Authentication failed. Redirecting to login...', 'Auth Error');
              this.router.navigate(['/dropbox-login']);
              throw new Error('Authentication failed');
            }
            
            return response.text().then((errorDetails) => {
              throw new Error(
                `Failed to download file: ${response.statusText}, ${errorDetails}`
              );
            });
          }
          return response.blob();
        })
        .then((fileBlob) => {
          console.log('File downloaded successfully');

          // Save the file (optional, for browsers)
          const fileUrl = URL.createObjectURL(fileBlob);
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = filePath.split('/').pop() || 'download';
          link.click();
          URL.revokeObjectURL(fileUrl);

          observer.next(fileBlob); // Emit the fileBlob
          observer.complete();
        })
        .catch((error) => {
          console.error('Error downloading file:', error);
          observer.error(error); // Emit the error
        });
    });
  }

  deleteFile(path: string): Observable<any> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const deleteUrl = `https://api.dropboxapi.com/2/files/delete_v2`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.post(deleteUrl, { path }, { headers }).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  createSharedLink(filePath: string): Observable<string> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const checkLinkUrl =
      'https://api.dropboxapi.com/2/sharing/list_shared_links';
    const createLinkUrl =
      'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings';

    const fetchApi = (
      url: string,
      options: RequestInit
    ): Observable<Response> => from(fetch(url, options));

    return fetchApi(checkLinkUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: filePath,
        direct_only: true,
      }),
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          // Check for auth errors
          if (response.status === 401 || response.status === 403) {
            this.dropboxAuthService.clearToken();
            this.toastr.error('Authentication failed. Redirecting to login...', 'Auth Error');
            this.router.navigate(['/dropbox-login']);
            return throwError(() => new Error('Authentication failed'));
          }
          
          return throwError(
            () =>
              new Error(
                `Failed to check for existing shared links: ${response.statusText}`
              )
          );
        }
        return from(response.json());
      }),
      switchMap((data: any) => {
        if (data.links && data.links.length > 0) {
          return from(
            Promise.resolve(data.links[0].url.replace('?dl=0', '?dl=1'))
          );
        }

        return fetchApi(createLinkUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: filePath,
            settings: {
              requested_visibility: 'public',
            },
          }),
        }).pipe(
          switchMap((createResponse) => {
            if (!createResponse.ok) {
              // Check for auth errors
              if (createResponse.status === 401 || createResponse.status === 403) {
                this.dropboxAuthService.clearToken();
                this.toastr.error('Authentication failed. Redirecting to login...', 'Auth Error');
                this.router.navigate(['/dropbox-login']);
                return throwError(() => new Error('Authentication failed'));
              }
              
              return throwError(
                () =>
                  new Error(
                    `Failed to create shared link: ${createResponse.statusText}`
                  )
              );
            }
            return from(createResponse.json());
          }),
          map((createData: any) => createData.url.replace('?dl=0', '?dl=1'))
        );
      }),
      catchError((error) => {
        console.error('Error creating or fetching shared link:', error);
        if (error.status === 401 || error.status === 403) {
          this.handleAuthError(error);
        }
        return throwError(
          () =>
            new Error('Error occurred while creating or fetching shared link')
        );
      })
    );
  }

  uploadFile(filePath: string = '', fileContent: Blob): Observable<string> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const url = 'https://content.dropboxapi.com/2/files/upload';
    
    // Add timestamp to filename to prevent conflicts
    const timestamp = new Date().getTime();
    const filePathParts = filePath.split('/');
    const fileName = filePathParts.pop();
    const fileNameParts = fileName?.split('.') || [];
    const ext = fileNameParts.pop();
    const newFileName = `${fileNameParts.join('.')}_${timestamp}.${ext}`;
    const newFilePath = [...filePathParts, newFileName].join('/');

    return defer(() =>
      from(
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: newFilePath,
              mode: 'add',
              autorename: true, // Enable autorename to handle any remaining conflicts
              mute: false,
            }),
          },
          body: fileContent,
        })
      )
    ).pipe(
      switchMap((response) => {
        if (!response.ok) {
          // Check for auth errors
          if (response.status === 401 || response.status === 403) {
            this.dropboxAuthService.clearToken();
            this.toastr.error('Authentication failed. Redirecting to login...', 'Auth Error');
            this.router.navigate(['/dropbox-login']);
            return throwError(() => new Error('Authentication failed'));
          }
          
          return from(response.text()).pipe(
            switchMap((errorDetails) =>
              throwError(() => new Error(`Upload failed: ${errorDetails}`))
            )
          );
        }
        return from(response.json());
      }),
      map((result: any) => {
        console.log('Upload result:', result);
        return result.path_display || newFilePath;
      }),
      catchError((error) => {
        console.error('Error during upload:', error);
        if (error.status === 401 || error.status === 403) {
          return this.handleAuthError(error);
        }
        return throwError(() => error);
      })
    );
  }

  openFileInNewTab(filePath: string): Observable<void> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const url = 'https://api.dropboxapi.com/2/sharing/list_shared_links';
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({ path: filePath });

    return from(
      fetch(url, { method: 'POST', headers, body })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.links && data.links.length > 0) {
            const sharedUrl = data.links[0].url.replace('?dl=0', '?raw=1');
            window.open(sharedUrl, '_blank');
          } else {
            console.error('No shared link exists for the file.');
          }
        })
    );
  }

  getThumbnail(filePath: string, size: string = 'w2048h1536'): Observable<Blob> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Authentication required'));
    
    const DROPBOX_THUMBNAIL_URL =
      'https://content.dropboxapi.com/2/files/get_thumbnail';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: filePath,
        size: size,
      }),
    });

    return this.http
      .post(DROPBOX_THUMBNAIL_URL, null, { headers, responseType: 'blob' })
      .pipe(
        map((blob: Blob) => blob),
        shareReplay(1),
        catchError((error) => {
          console.error('Error fetching thumbnail:', error);
          return throwError(() => new Error('Failed to fetch thumbnail'));
        })
      );
  }
}
