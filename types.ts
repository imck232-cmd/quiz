
export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST'
}

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
  MATCHING = 'MATCHING',
  EXTRACT = 'EXTRACT',      // استخرج
  ENUMERATE = 'ENUMERATE',  // عدد
  EXPRESSION = 'EXPRESSION', // اكتب تعبيرا
  DRAW = 'DRAW',            // ارسم
  EVIDENCE = 'EVIDENCE',    // دلل على
  OTHER = 'OTHER'           // غير ذلك
}

export interface StudentData {
  id: string;
  fullName: string;
  schoolName: string;
  grade: string;
  section: string;
  academicYear: string;
  email?: string;
  registrationDate: string;
}

export interface TeacherProfile {
  code: string; // Unique ID/Login Key
  fullName: string;
  schoolName: string;
  subject: string;
  academicYear: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For MCQ
  correctAnswer?: string; // Optional for open-ended
  explanation?: string;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  term: string;
  gradeLevel: string;
  date: string;
  durationMinutes: number | null; // null means open time
  questions: Question[];
  isActive: boolean;
  createdBy?: string;
}

export interface QuizResult {
  id: string;
  studentId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalScore: number;
  answers: Record<string, string>; // questionId -> answer
  submittedAt: string;
  isPassed: boolean;
}

export interface TeacherStats {
  totalStudents: number;
  averageScore: number;
  passRate: number;
  totalQuizzesTaken: number;
}
