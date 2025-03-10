export interface FirstClassFileGroups {
  taskExampleFiles?: Files[];
  taskSolutionFiles?: Files[];
}

export interface SecondClassFileGroups {
  taskTitleFiles?: Files[];
  taskPresentationFiles?: Files[];
  taskLiteratureFiles?: Files[];
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


export interface Lesson {
  id?: string;
  lessonTitle?: LessonTitle;
  thumbnail?: string;
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
  firstBasedFiles: FirstClassFileGroups;
  secondBasedFiles: SecondClassFileGroups;
}