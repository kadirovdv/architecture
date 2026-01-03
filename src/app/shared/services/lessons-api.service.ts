import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';
import type {
  ApiDataResponse,
  LessonDetailDto,
  LessonListItemDto,
  SearchResponseDto,
  BackendLanguage,
} from '../models/backend.dto';

@Injectable({
  providedIn: 'root',
})
export class LessonsApiService {
  constructor(private api: ApiClientService) {}

  listLessons(params?: { language?: BackendLanguage; activeOnly?: boolean }): Observable<LessonListItemDto[]> {
    let httpParams = new HttpParams();
    if (params?.language) httpParams = httpParams.set('language', params.language);
    if (typeof params?.activeOnly === 'boolean') {
      httpParams = httpParams.set('activeOnly', String(params.activeOnly));
    }

    return this.api
      .get<ApiDataResponse<LessonListItemDto[]>>('/api/lessons', { params: httpParams })
      .pipe(map((res) => res.data));
  }

  getLesson(slug: string): Observable<LessonDetailDto> {
    return this.api
      .get<ApiDataResponse<LessonDetailDto>>(`/api/lessons/${encodeURIComponent(slug)}`)
      .pipe(map((res) => res.data));
  }

  getLessonResources(slug: string): Observable<any[]> {
    return this.api
      .get<ApiDataResponse<any[]>>(`/api/lessons/${encodeURIComponent(slug)}/resources`)
      .pipe(map((res) => res.data));
  }

  search(q: string): Observable<SearchResponseDto> {
    const params = new HttpParams().set('q', q);
    return this.api
      .get<ApiDataResponse<SearchResponseDto>>('/api/search', { params })
      .pipe(map((res) => res.data));
  }
}


