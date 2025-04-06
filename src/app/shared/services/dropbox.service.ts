import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, from, throwError, defer, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { DropboxAuthService } from './dropbox.auth.service';

declare var Dropbox: any;

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private dropboxAuthService: DropboxAuthService
  ) {}

  /**
   * Get the authentication token from auth service
   */
  private getAuthToken(): string | null {
    // Get token from auth service
    const token = this.dropboxAuthService.getAccessToken();
    
    if (!token) {
      console.error('No Dropbox token available');
      this.toastr.error('Dropbox token not configured', 'Configuration Error');
      return null;
    }
    
    return token;
  }

  /**
   * Verify if the current token is valid by getting the current account info
   * @returns Observable with the user account info if valid, error if invalid
   */
  validateToken(): Observable<any> {
    const token = this.dropboxAuthService.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    const url = 'https://api.dropboxapi.com/2/users/get_current_account';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      // DON'T set Content-Type for this request
    });

    return this.http.post(url, null, { headers }).pipe(
      catchError(error => {
        console.error('Token validation error:', error);
        return throwError(() => error);
      })
    );
  }
  
  

  /**
   * Handle errors consistently 
   */
  private handleError(error: any): Observable<never> {
    console.error('Dropbox API error:', error);
    this.toastr.error('Error communicating with Dropbox', 'API Error');
    return throwError(() => error);
  }

  listFiles(path: string = ''): Observable<any> {
    const token = this.getAuthToken();
    if (!token) {
      return throwError(() => new Error('Dropbox token not configured'));
    }

    const url = 'https://api.dropboxapi.com/2/files/list_folder';
    const body = { path: path || '' };
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(url, body, { headers }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  downloadFile(filePath: string): Observable<Blob> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    const url = 'https://content.dropboxapi.com/2/files/download';

    return new Observable((observer) => {
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: filePath,
          }),
        },
      })
        .then((response) => {
          if (!response.ok) {
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

          observer.next(fileBlob);
          observer.complete();
        })
        .catch((error) => {
          console.error('Error downloading file:', error);
          observer.error(error);
        });
    });
  }

  deleteFile(path: string): Observable<any> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    const deleteUrl = `https://api.dropboxapi.com/2/files/delete_v2`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http.post(deleteUrl, { path }, { headers }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  createSharedLink(filePath: string): Observable<string> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    const checkLinkUrl = 'https://api.dropboxapi.com/2/sharing/list_shared_links';
    const createLinkUrl = 'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings';

    return this.makeSharedLinkRequest(checkLinkUrl, createLinkUrl, token, filePath);
  }

  // Helper method for shared link creation
  private makeSharedLinkRequest(checkUrl: string, createUrl: string, token: string, filePath: string): Observable<string> {
    const fetchApi = (url: string, body: any): Observable<Response> => 
      from(fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }));

    return fetchApi(checkUrl, {
      path: filePath,
      direct_only: true,
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
          return throwError(() => new Error(`Failed to check for existing shared links: ${response.statusText}`));
        }
        return from(response.json());
      }),
      switchMap((data: any) => {
        if (data.links && data.links.length > 0) {
          return from(Promise.resolve(data.links[0].url.replace('?dl=0', '?dl=1')));
        }

        return fetchApi(createUrl, {
          path: filePath,
          settings: {
            requested_visibility: 'public',
          },
        }).pipe(
          switchMap((createResponse) => {
            if (!createResponse.ok) {
              return throwError(() => new Error(`Failed to create shared link: ${createResponse.statusText}`));
            }
            return from(createResponse.json());
          }),
          map((createData: any) => createData.url.replace('?dl=0', '?dl=1'))
        );
      }),
      catchError(error => {
        console.error('Error creating shared link:', error);
        return throwError(() => error);
      })
    );
  }

  uploadFile(filePath: string = '', fileContent: Blob): Observable<any> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    const url = 'https://content.dropboxapi.com/2/files/upload';
    
    // Add timestamp to filename to prevent conflicts
    const timestamp = new Date().getTime();
    const filePathParts = filePath.split('/');
    const fileName = filePathParts.pop();
    const fileNameParts = fileName?.split('.') || [];
    const ext = fileNameParts.pop();
    const newFileName = `${fileNameParts.join('.')}_${timestamp}.${ext}`;
    const newFilePath = [...filePathParts, newFileName].join('/');

    return from(
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: newFilePath,
            mode: 'add',
            autorename: true,
            mute: false,
          }),
        },
        body: fileContent,
      })
    ).pipe(
      switchMap((response) => {
        if (!response.ok) {
          return from(response.text()).pipe(
            switchMap((errorDetails) => throwError(() => new Error(`Upload failed: ${errorDetails}`)))
          );
        }
        return from(response.json());
      }),
      map((result: any) => {
        console.log('Upload result from Dropbox API:', result);
        // Return the full metadata object plus additional fields
        return {
          ...result,
          original_path: filePath,
          timestamp: timestamp
        };
      }),
      catchError((error) => {
        console.error('Error uploading file to Dropbox:', error);
        return throwError(() => error);
      })
    );
  }

  openFileInNewTab(filePath: string): Observable<void> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
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
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    const DROPBOX_THUMBNAIL_URL = 'https://content.dropboxapi.com/2/files/get_thumbnail';
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
