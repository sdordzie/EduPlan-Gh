export type UserRole = 'super_admin' | 'admin' | 'hod' | 'facilitator' | 'viewer';
export type SchoolType = 'basic' | 'shs';
export type AcademicPeriodType = 'term' | 'semester';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  schoolId?: string;
  departmentId?: string;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  logo?: string;
  motto?: string;
  address?: string;
  type: SchoolType;
  settings?: any;
}

export interface LessonPlanComment {
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Lesson {
  introduction: string;
  mainLesson: string;
  closure: string;
}

export interface Assessment {
  mode: string;
  task: string;
  markScheme?: string;
  rubric?: string;
}

export type LessonPlanStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';

export interface LessonPlan {
  id: string;
  facilitatorId: string;
  facilitatorName: string;
  subject: string;
  numLearners: number;
  week: number;
  duration: string;
  form: string;
  strand: string;
  subStrand: string;
  contentStandard: string;
  learningOutcomes: string;
  indicators: string;
  essentialQuestions: string;
  pedagogicalStrategies: string;
  resources: string;
  differentiation: string;
  lessons: Lesson[];
  formativeAssessment: Assessment;
  transcriptAssessment: Assessment;
  reflection: string;
  status: LessonPlanStatus;
  schoolId: string;
  periodId: string;
  createdAt: string;
  updatedAt: string;
  comments: LessonPlanComment[];
}

export interface Department {
  id: string;
  name: string;
  schoolId: string;
}

export interface Subject {
  id: string;
  name: string;
  departmentId?: string;
  schoolId: string;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  type: AcademicPeriodType;
  startDate: string;
  endDate: string;
  schoolId: string;
}
