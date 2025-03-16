import { SafeResourceUrl } from "@angular/platform-browser";

export interface FirstClassFileGroups {
  taskExampleFiles?: Files;
  taskSolutionFiles?: Files;
}

export interface SecondClassFileGroups {
  taskTitleFiles?: Files;
  taskPresentationFiles?: Files;
  taskLiteratureFiles?: Files;
  taskVideoUrls?: Videos[];
}

export interface Files {
  [key: string]: FileItem[] | undefined;
  uz?: FileItem[];
  ru?: FileItem[];
  en?: FileItem[];
}

export interface File {
  name?: string;
  size?: number;
}

export interface Videos {
  url: string;
  name: string;
}

export interface FileItem {
  name: string;
  size: number;
}

export interface Lesson {
  id?: string;
  lessonTitle?: LessonTitle;
  thumbnail?: string | SafeResourceUrl;
  index?: number;
  createdAt?: string;
  tasks?: Task[] | any[];
}

export interface LessonTitle {
  uz?: string;
  ru?: string;
  en?: string;
}

export interface Task {
  title?: string;
  id?: string;
  index?: number;
  createdAt?: string;
  firstBasedFiles?: FirstClassFileGroups | any;
  secondBasedFiles?: SecondClassFileGroups | any;
}