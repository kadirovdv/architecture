import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, from, throwError, defer, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

declare var Dropbox: any;

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private readonly token: string = sessionStorage.getItem('accessToken') || '';

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    console.log('Dropbox token:', this.token);
    if (!this.token) {
      console.error('No Dropbox token found in environment. Please add the token to your environment file.');
    }
  }

  /**
   * Get the authentication token from environment
   */
  private getAuthToken(): string {
    if (!this.token) {
      console.error('No Dropbox token available in environment');
      this.toastr.error('Dropbox token not configured', 'Configuration Error');
    }
    return this.token;
  }

  /**
   * Verify if the current token is valid by getting the current account info
   * @returns Observable with the user account info if valid, error if invalid
   */
  validateToken(): Observable<any> {
    const token = sessionStorage.getItem('accessToken');
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
   * Check if a file with the same name exists in Dropbox
   * @param fileName The name of the file to check
   * @returns Observable with the file metadata if exists, null if it doesn't
   */
  checkFileExists(fileName: string): Observable<any> {
    const token = this.getAuthToken();
    if (!token) {
      return throwError(() => new Error('Dropbox token not configured'));
    }
    
    // First, search for the file by name
    const searchUrl = 'https://api.dropboxapi.com/2/files/search_v2';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    const searchBody = {
      query: fileName,
      options: {
        filename_only: true,
        max_results: 10
      }
    };
    
    return this.http.post(searchUrl, searchBody, { headers }).pipe(
      map((response: any) => {
        console.log('Search response:', response);
        
        if (response && response.matches && response.matches.length > 0) {
          // File with this name exists
          const matchingFiles = response.matches.filter((match: any) => 
            match.metadata.metadata.name.toLowerCase() === fileName.toLowerCase()
          );
          
          if (matchingFiles.length > 0) {
            console.log(`File "${fileName}" already exists in Dropbox`);
            return matchingFiles[0].metadata.metadata;
          }
        }
        
        // No matching file found
        console.log(`File "${fileName}" does not exist in Dropbox`);
        return null;
      }),
      catchError(error => {
        console.error('Error checking if file exists:', error);
        // Return null instead of throwing an error to allow upload to proceed
        return of(null);
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

    const fetchApi = (url: string, options: RequestInit): Observable<Response> => 
      from(fetch(url, options));

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
          return throwError(() => new Error(`Failed to check for existing shared links: ${response.statusText}`));
        }
        return from(response.json());
      }),
      switchMap((data: any) => {
        if (data.links && data.links.length > 0) {
          return from(Promise.resolve(data.links[0].url.replace('?dl=0', '?dl=1')));
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
              return throwError(() => new Error(`Failed to create shared link: ${createResponse.statusText}`));
            }
            return from(createResponse.json());
          }),
          map((createData: any) => createData.url.replace('?dl=0', '?dl=1'))
        );
      }),
      catchError((error) => {
        console.error('Error creating or fetching shared link:', error);
        return throwError(() => new Error('Error occurred while creating or fetching shared link'));
      })
    );
  }

  uploadFile(filePath: string = '', fileContent: Blob): Observable<any> {
    const token = this.getAuthToken();
    if (!token) return throwError(() => new Error('Dropbox token not configured'));
    
    // Check for valid file to upload
    if (!fileContent || !(fileContent instanceof Blob)) {
      console.error('Invalid file content provided for upload:', fileContent);
      return throwError(() => new Error('Invalid file content: must be a Blob or File object'));
    }
    
    // Log file details for debugging
    let fileDetails = 'Unknown type';
    if (fileContent instanceof File) {
      fileDetails = `File: ${fileContent.name}, size: ${fileContent.size} bytes, type: ${fileContent.type}`;
    } else if (fileContent instanceof Blob) {
      fileDetails = `Blob: size: ${fileContent.size} bytes, type: ${fileContent.type}`;
    }
    console.log(`Uploading to Dropbox: ${fileDetails}`);
    
    const url = 'https://content.dropboxapi.com/2/files/upload';
    
    // Simplify path handling - just use the filename with timestamp
    const timestamp = new Date().getTime();
    
    // Get just the filename, regardless of any path structure
    let fileName = filePath;
    if (fileName.includes('/')) {
      fileName = fileName.split('/').pop() || '';
    }
    
    // Add timestamp to filename to ensure uniqueness
    const fileNameParts = fileName.split('.');
    const ext = fileNameParts.length > 1 ? fileNameParts.pop() : '';
    const newFileName = ext ? 
      `${fileNameParts.join('.')}_${timestamp}.${ext}` : 
      `${fileName}_${timestamp}`;
    
    console.log(`Uploading to Dropbox with filename: /${newFileName}`);

    return defer(() =>
      from(
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: `/${newFileName}`,
              mode: 'add',
              autorename: true,
              mute: false,
            }),
          },
          body: fileContent,
        })
      )
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
        return {
          ...result,
          original_path: filePath,
          timestamp: timestamp
        };
      }),
      catchError((error) => {
        console.error('Error during upload:', error);
        this.toastr.error(`Failed to upload file: ${error.message}`);
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
