import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, of } from 'rxjs';
import { catchError, filter, finalize, last, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(private storage: AngularFireStorage) { }

  uploadFile(file: File, path: string): Observable<number | { url: string }> {
    const filePath = `${path}/${new Date().getTime()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);

    return task.percentageChanges().pipe(
      filter(percentage => percentage !== null && percentage !== undefined),
      switchMap(percentage => {
        if (percentage === 100) {
          return fileRef.getDownloadURL().pipe(
            map(url => ({ url }))
          );
        }
        return of(percentage);
      }),
      catchError(error => {
        console.error('Upload error:', error);
        throw error;
      })
    );
  }

  deleteFile(url: string): Observable<void> {
    // Extract the file path from the download URL
    try {
      const storageRef = this.storage.refFromURL(url);
      return from(storageRef.delete());
    } catch (error) {
      console.error('Error deleting file:', error);
      return of(undefined);
    }
  }
} 