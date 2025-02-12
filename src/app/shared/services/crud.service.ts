import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CrudService {
  constructor(private firestore: AngularFirestore) {}
  data$: Observable<any[]> = new Observable();

  addDocument<T>(collectionName: string, data: T): Promise<void> {
    const id = this.firestore.createId();
    return this.firestore.collection<T>(collectionName).doc(id).set({ ...data, id });
  }

  getDocuments<T>(collectionName: string): Observable<T[]> {
    return this.firestore.collection<T>(collectionName).snapshotChanges().pipe(
      map((actions) =>
        actions.map((a) => {
          const data = a.payload.doc.data() as T;
          const id = a.payload.doc.id;
          return { ...data, id };
        })
      )
    );
  }

  getDocumentById<T>(collectionName: string, docId: string): Observable<T | undefined> {
    return this.firestore.collection<T>(collectionName).doc(docId).valueChanges();
  }

  updateDocument<T>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
    return this.firestore.collection<T>(collectionName).doc(docId).update(data);
  }

  deleteDocument(collectionName: string, docId: string): Promise<void> {
    return this.firestore.collection(collectionName).doc(docId).delete();
  }

  getDataByField(collection: string, docId: string): Observable<any> {
    return this.firestore
      .collection(collection)
      .doc(docId)
      .valueChanges();
  }
}
