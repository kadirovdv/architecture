export type BackendLanguage = 'UZ' | 'RU' | 'EN';
export type LangKey = 'uz' | 'ru' | 'en';

export interface ApiDataResponse<T> {
  data: T;
}

export interface FileItemDto {
  id: string;
  name: string;
  size: number;
  url?: string;
  path?: string;
}

export type BucketedFiles = Record<LangKey, FileItemDto[]>;

export interface TaskBucketsDto {
  firstBasedFiles: {
    taskExampleFiles: BucketedFiles;
    taskSolutionFiles: BucketedFiles;
  };
  secondBasedFiles: {
    taskTitleFiles: BucketedFiles;
    taskPresentationFiles: BucketedFiles;
    taskLiteratureFiles: BucketedFiles;
    taskVideoUrls: any[];
  };
}

export interface LessonTaskDto extends TaskBucketsDto {
  id: string;
  title: string;
  index: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonResourceDto {
  id: string;
  taskId: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  createdAt: string;
  category: string | null;
  language: BackendLanguage | null;
  publicUrl: string;
}

export interface LessonDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: BackendLanguage;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  resources: LessonResourceDto[];
  tasks: LessonTaskDto[];
}

export interface LessonListItemDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: BackendLanguage;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  resourceCount: number;
  exampleResources: Array<{
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    relativePath: string;
    createdAt: string;
    publicUrl: string;
  }>;
  thumbnailUrl: string | null;
}

export interface SearchResponseDto {
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    language: BackendLanguage;
    createdAt: string;
    updatedAt: string;
    active: boolean;
  }>;
  resources: Array<{
    id: string;
    lessonId: string;
    lessonSlug: string;
    taskId: string | null;
    fileName: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    relativePath: string;
    createdAt: string;
    category: string | null;
    language: BackendLanguage | null;
    publicUrl: string;
  }>;
}

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN' | 'GENERAL_ADMIN';
export type AdminStatus = 'ACTIVE' | 'BLOCKED';

export interface BackendAuthUserDto {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendLoginResponseDto {
  token: string;
  user: BackendAuthUserDto;
}

export interface BackendMeResponseDto {
  user: BackendAuthUserDto;
}


