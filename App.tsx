import React, { useState, useEffect } from 'react';
import { UserRole, StudentData, Quiz } from './types';
import { generateDailyQuiz } from './services/geminiService';
import { storageService } from './services/storageService';
import { StudentAuth } from './components/StudentAuth';
import { QuizRunner } from './components/QuizRunner';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { GraduationCap, Lock, BookOpen, Clock, FileQuestion } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'HOME' | 'QUIZ_LIST' | 'RUNNING_QUIZ' | 'TEACHER_DASH'>('HOME');
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherAuth, setTeacherAuth] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);

  const handleStudentLogin = async (student: StudentData) => {
    setLoading(true);
    storageService.saveStudent(student);
    setCurrentStudent(student);
    
    // Load quizzes suitable for student
    const allQuizzes = storageService.getQuizzes();
    // Filter logic: Show quizzes for student's grade or general ones
    // Also create a daily quiz if none exists for today
    
    const today = new Date().toISOString().split('T')[0];
    let dailyQuiz = allQuizzes.find(q => q.id === today);
    
    if (!dailyQuiz) {
        try {
            dailyQuiz = await generateDailyQuiz(today);
            storageService.saveQuiz(dailyQuiz);
            allQuizzes.push(dailyQuiz);
        } catch (e) {
            console.error("Failed to gen daily quiz");
        }
    }

    setAvailableQuizzes(allQuizzes.filter(q => q.isActive));
    setLoading(false);
    setCurrentView('QUIZ_LIST');
  };

  const startQuiz = (quiz: Quiz) => {
      setSelectedQuiz(quiz);
      setCurrentView('RUNNING_QUIZ');
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock password
    if (teacherPassword === 'admin123') {
      setTeacherAuth(true);
      setCurrentView('TEACHER_DASH');
      setTeacherPassword('');
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  const QuizList = () => (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">الاختبارات المتاحة</h2>
            <div className="text-slate-600">مرحباً، {currentStudent?.fullName}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableQuizzes.map(quiz => (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200" >
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 inline-block">
                                {quiz.subject}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{quiz.title}</h3>
                            <div className="flex gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {quiz.durationMinutes ? `${quiz.durationMinutes} دقيقة` : 'مفتوح'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <FileQuestion className="w-4 h-4" />
                                    {quiz.questions.length} سؤال
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => startQuiz(quiz)}>ابدأ الآن</Button>
                    </div>
                </Card>
            ))}
        </div>
        {availableQuizzes.length === 0 && (
            <div className="text-center py-10 text-slate-500">لا توجد اختبارات متاحة حالياً لصفك الدراسي</div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-tajawal text-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('HOME')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-800">نظام المنارة</span>
          </div>
          
          {currentView === 'HOME' && (
            <div className="flex gap-3">
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                دخول المعلمين
              </button>
            </div>
          )}
           {currentView !== 'HOME' && currentView !== 'TEACHER_DASH' && (
            <div className="flex gap-3">
              <button 
                onClick={() => {
                    setCurrentView('HOME');
                    setCurrentStudent(null);
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                خروج
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'HOME' && (
          <div className="space-y-20">
            {/* Student Section */}
            <StudentAuth onLogin={handleStudentLogin} />
            
            {/* Loader Overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-lg font-medium text-slate-700">جاري تحميل الاختبارات...</p>
                </div>
              </div>
            )}

            {/* Teacher Login Footer */}
            <div className="border-t border-slate-200 pt-10 mt-10">
              <div className="max-w-sm mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    دخول الكادر التعليمي
                  </h3>
                </div>
                <form onSubmit={handleTeacherLogin} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="كلمة المرور (admin123)"
                    className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none text-sm"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" className="text-sm">
                    دخول
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {currentView === 'QUIZ_LIST' && <QuizList />}

        {currentView === 'RUNNING_QUIZ' && currentStudent && selectedQuiz && (
          <QuizRunner 
            quiz={selectedQuiz} 
            student={currentStudent}
            onComplete={() => {
              setCurrentView('QUIZ_LIST');
              setSelectedQuiz(null);
            }} 
          />
        )}

        {currentView === 'TEACHER_DASH' && teacherAuth && (
          <TeacherDashboard onLogout={() => {
            setTeacherAuth(false);
            setCurrentView('HOME');
          }} />
        )}
      </main>
    </div>
  );
};

export default App;