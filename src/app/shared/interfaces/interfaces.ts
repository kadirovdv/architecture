export interface Section {
  sectionId: string;
  name: string;
  author: string;
}

export interface Lesson {
  id?: string;
  lessonTitle?: LessonTitle;
  thumbnail?: string;
  index?: number;
  createdAt?: string;
  tasks?: string[];
}

export interface LessonTitle {
  uz?: string;
  ru?: string;
  en?: string;
}

export interface FileGroups {
  materials?: Files;
  presentations?: Files;
  discussions?: Files;
  videos?: Files;
}

export interface Files {
  uz?: [];
  ru?: [];
  en?: [];
}

export interface File {
  name?: string;
  size?: number;
}
