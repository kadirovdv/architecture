import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, from, throwError, defer } from 'rxjs';
import { catchError, map, shareReplay, share, switchMap } from 'rxjs/operators';

declare var Dropbox: any;

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private dbx: any;
  private accessToken: string | null = null;

  constructor(private http: HttpClient) {}

  initializeDropbox() {
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${environment.appKEY}&response_type=${environment.token}`;
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
    const listUrl = `https://api.dropboxapi.com/2/files/list_folder`;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.token}`,
      'Content-Type': 'application/json',
    });

    return this.http.post(listUrl, { path }, { headers });
  }

  downloadFile(filePath: string): Observable<Blob> {
    const url = 'https://content.dropboxapi.com/2/files/download';

    return new Observable((observer) => {
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${environment.token}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: filePath, // e.g., '/path/to/file.txt'
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
    const deleteUrl = `https://api.dropboxapi.com/2/files/delete_v2`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    });

    return this.http.post(deleteUrl, { path }, { headers });
  }

  createSharedLink(filePath: string): Observable<string> {
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
        Authorization: `Bearer ${environment.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: filePath,
        direct_only: true,
      }),
    }).pipe(
      switchMap((response) => {
        if (!response.ok) {
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
            Authorization: `Bearer ${environment.token}`,
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
        console.error(error);
        return throwError(
          () =>
            new Error('Error occurred while creating or fetching shared link')
        );
      })
    );
  }

  uploadFile(filePath: string = '', fileContent: Blob): Observable<string> {
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
            Authorization: `Bearer ${environment.token}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: newFilePath,
              mode: 'add',
              autorename: true, // Enable autorename to handle any remaining conflicts
              mute: false
            }),
          },
          body: fileContent,
        })
      )
    ).pipe(
      switchMap((response) => {
        if (!response.ok) {
          return response.json().then(errorData => {
            console.error('Dropbox API Error:', errorData);
            throw new Error(`Failed to upload file: ${errorData?.error?.message || response.statusText}`);
          });
        }
        return from(response.json());
      }),
      catchError((error) => {
        console.error('Upload Error:', error);
        return throwError(() => new Error(`Failed to upload file: ${error.message}`));
      })
    );
  }

  openFileInNewTab(filePath: string): Observable<void> {
    const url = 'https://api.dropboxapi.com/2/sharing/list_shared_links';
    const headers = {
      Authorization: `Bearer ${environment.token}`,
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
        .catch((error) => {
          console.error('Error:', error);
          throw error;
        })
    );
  }

  getThumbnail(filePath: string, size: string = 'w2048h1536'): Observable<Blob> {
    const DROPBOX_THUMBNAIL_URL =
      'https://content.dropboxapi.com/2/files/get_thumbnail';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.token}`,
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
