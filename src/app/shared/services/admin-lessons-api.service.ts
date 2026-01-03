import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';
import type {
  ApiDataResponse,
  LessonDetailDto,
  LessonResourceDto,
  BackendLanguage,
} from '../models/backend.dto';
import { environment } from 'src/environments/environment';

type LessonPayload = {
  slug: string;
  title: string;
  description?: string | null;
  language?: BackendLanguage;
  active?: boolean;
};

type UpdateLessonPayload = Partial<Omit<LessonPayload, 'slug'>>;

type CreateTaskPayload = {
  title: string;
  index?: number;
};

type UpdateTaskPayload = {
  title?: string;
  index?: number;
};

@Injectable({
  providedIn: 'root',
})
export class AdminLessonsApiService {
  private readonly baseUrl = (environment as any)?.apiBaseUrl
    ? String((environment as any).apiBaseUrl).replace(/\/+$/, '')
    : '';

  constructor(private api: ApiClientService, private http: HttpClient) {}

  createLesson(payload: LessonPayload) {
    return this.api.post<ApiDataResponse<any>>('/api/admin/lessons', payload).pipe(map((r) => r.data));
  }

  getLessonDetail(slug: string): Observable<LessonDetailDto> {
    return this.api
      .get<ApiDataResponse<LessonDetailDto>>(`/api/admin/lessons/${encodeURIComponent(slug)}`)
      .pipe(map((r) => r.data));
  }

  updateLesson(slug: string, payload: UpdateLessonPayload) {
    return this.api
      .patch<ApiDataResponse<any>>(`/api/admin/lessons/${encodeURIComponent(slug)}`, payload)
      .pipe(map((r) => r.data));
  }

  deleteLesson(slug: string) {
    return this.api
      .delete<ApiDataResponse<{ id: string; message: string }>>(`/api/admin/lessons/${encodeURIComponent(slug)}`)
      .pipe(map((r) => r.data));
  }

  createTask(slug: string, payload: CreateTaskPayload) {
    return this.api
      .post<ApiDataResponse<any>>(`/api/admin/lessons/${encodeURIComponent(slug)}/tasks`, payload)
      .pipe(map((r) => r.data));
  }

  updateTask(slug: string, taskId: string, payload: UpdateTaskPayload) {
    return this.api
      .patch<ApiDataResponse<any>>(
        `/api/admin/lessons/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}`,
        payload,
      )
      .pipe(map((r) => r.data));
  }

  deleteTask(slug: string, taskId: string) {
    return this.api
      .delete<ApiDataResponse<{ id: string; message: string }>>(
        `/api/admin/lessons/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}`,
      )
      .pipe(map((r) => r.data));
  }

  uploadLessonResource(
    slug: string,
    file: File,
    meta?: { category?: string | null; language?: string | BackendLanguage | null },
  ): Observable<LessonResourceDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.category) formData.append('category', meta.category);
    if (meta?.language) formData.append('language', String(meta.language));

    const url = `${this.baseUrl}/api/admin/lessons/${encodeURIComponent(slug)}/resources`;
    return this.http
      .post<ApiDataResponse<LessonResourceDto>>(url, formData, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  uploadTaskResource(
    slug: string,
    taskId: string,
    file: File,
    meta?: { category?: string | null; language?: string | BackendLanguage | null },
  ): Observable<LessonResourceDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.category) formData.append('category', meta.category);
    if (meta?.language) formData.append('language', String(meta.language));

    const url = `${this.baseUrl}/api/admin/lessons/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(taskId)}/resources`;
    return this.http
      .post<ApiDataResponse<LessonResourceDto>>(url, formData, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  deleteResource(id: string) {
    return this.api
      .delete<ApiDataResponse<{ id: string; message: string }>>(`/api/admin/resources/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }
}


