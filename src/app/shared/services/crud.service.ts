// src/app/services/crud.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collectionData,
  docData,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  documentId
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CrudService {
  constructor(private firestore: Firestore) {}

  // Create
  createIColelctionAndtem(collectionName: string, data: any): Promise<any> {
    const collectionRef = collection(this.firestore, collectionName);
    return addDoc(collectionRef, data);
  }

  createItemInColelction(collectionName: string, data: any = {}) {
    const id = documentId();
    console.log(id);
    
    const docRef = doc(this.firestore, `${collectionName}/${id}`);
    return updateDoc(docRef, data);
  }

  // Read
  getItems(collectionName: string): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    return collectionData(collectionRef, { idField: 'id' });
  }

  // Update
  updateItem(collectionName: string, id: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, `${collectionName}/${id}`);
    return updateDoc(docRef, data);
  }

  // Delete
  deleteItem(collectionName: string, id: string): Promise<void> {
    const docRef = doc(this.firestore, `${collectionName}/${id}`);
    return deleteDoc(docRef);
  }

}