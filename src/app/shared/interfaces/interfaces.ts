export interface Section {
  sectionId: string;
  name: string;
  author: string;
}

export interface Lesson {
  id?: string | any;
  lessonTitle?: LessonTitle | any;
  thumbnail?: string | any;
  index?: number | any;
  createdAt?: string | any;
}

export interface LessonTitle {
  uz?: string | any;
  ru?: string | any;
  en?: string | any;
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
