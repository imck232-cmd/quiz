import { Quiz, QuizResult, StudentData } from "../types";

const KEYS = {
  STUDENTS: 'app_students',
  RESULTS: 'app_results',
  QUIZZES: 'app_quizzes',
  CURRENT_USER: 'app_current_user'
};

export const storageService = {
  // --- Students ---
  saveStudent: (student: StudentData) => {
    const students = storageService.getStudents();
    const exists = students.find(s => s.id === student.id);
    if (!exists) {
      students.push(student);
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    } else {
      const updated = students.map(s => s.id === student.id ? student : s);
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(updated));
    }
  },

  getStudents: (): StudentData[] => {
    const data = localStorage.getItem(KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  },

  // --- Quizzes ---
  saveQuiz: (quiz: Quiz) => {
    const quizzes = storageService.getQuizzes();
    // Check if updating or new
    const existingIdx = quizzes.findIndex(q => q.id === quiz.id);
    if (existingIdx >= 0) {
      quizzes[existingIdx] = quiz;
    } else {
      quizzes.push(quiz);
    }
    localStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
  },

  getQuizzes: (): Quiz[] => {
    const data = localStorage.getItem(KEYS.QUIZZES);
    return data ? JSON.parse(data) : [];
  },

  deleteQuiz: (quizId: string) => {
    const quizzes = storageService.getQuizzes().filter(q => q.id !== quizId);
    localStorage.setItem(KEYS.QUIZZES, JSON.stringify(quizzes));
  },

  // --- Results ---
  saveResult: (result: QuizResult) => {
    const results = storageService.getResults();
    results.push(result);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(results));
  },

  getResults: (): QuizResult[] => {
    const data = localStorage.getItem(KEYS.RESULTS);
    return data ? JSON.parse(data) : [];
  },

  getResultsByStudent: (studentId: string): QuizResult[] => {
    return storageService.getResults().filter(r => r.studentId === studentId);
  },

  clearSession: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};