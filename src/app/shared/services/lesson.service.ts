import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  constructor(private firestore: AngularFirestore) { }

  getLessons(): Observable<any[]> {
    return this.firestore.collection('lessons', ref => ref.orderBy('order', 'asc')).get().pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Record<string, any>;
          return { id: doc.id, ...data };
        });
      })
    );
  }

  getTaskById(lessonId: string, taskId: string): Observable<any> {
    return this.firestore.doc(`lessons/${lessonId}/tasks/${taskId}`).get().pipe(
      map(doc => {
        if (!doc.exists) {
          throw new Error('Task not found');
        }
        return { id: doc.id, ...doc.data() as Record<string, any> };
      })
    );
  }

  updateTask(lessonId: string, task: any): Observable<void> {
    const { id, ...taskData } = task;
    return from(this.firestore.doc(`lessons/${lessonId}/tasks/${id}`).update(taskData));
  }
} 