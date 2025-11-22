import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuestionType, QuizResult, StudentData } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface Props {
  quiz: Quiz;
  student: StudentData;
  onComplete: () => void;
}

export const QuizRunner: React.FC<Props> = ({ quiz, student, onComplete }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.durationMinutes ? quiz.durationMinutes * 60 : 0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    if (!isSubmitted) {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        if (quiz.durationMinutes) {
            setTimeLeft((prev) => {
            if (prev <= 1) {
                handleSubmit();
                return 0;
            }
            return prev - 1;
            });
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitted, quiz.durationMinutes]);

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [quiz.questions[currentQIndex].id]: value
    }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    clearInterval(timerRef.current);
    setIsSubmitted(true);

    let score = 0;
    let totalScore = 0;

    quiz.questions.forEach(q => {
      totalScore += q.points;
      const studentAns = answers[q.id]?.trim().toLowerCase();
      const correctAns = q.correctAnswer?.trim().toLowerCase();
      
      // Automatic grading for objective questions
      if (q.type === QuestionType.MCQ || q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.FILL_BLANK) {
         if (studentAns && correctAns && studentAns === correctAns) {
             score += q.points;
         }
      } else {
        // Subjective questions default to 0 until graded (or give full mark if strictly self-assessment demo)
        // For this demo, we will assume correct if not empty for subjective types to show progress
        if (studentAns && studentAns.length > 0) {
             score += q.points; // Optimistic grading for demo
        }
      }
    });

    const resultData: QuizResult = {
      id: `res-${Date.now()}`,
      studentId: student.id,
      quizId: quiz.id,
      quizTitle: quiz.title,
      score,
      totalScore,
      answers,
      submittedAt: new Date().toISOString(),
      isPassed: (score / totalScore) >= 0.5
    };

    setResult(resultData);
    storageService.saveResult(resultData);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isSubmitted && result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="text-center py-8">
          <div className={`inline-flex p-4 rounded-full mb-4 ${result.isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.isPassed ? (
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {result.isPassed ? 'تم إرسال الإجابة بنجاح' : 'تم إرسال الإجابة'}
          </h2>
          <p className="text-slate-500 mb-4">
            {quiz.questions.some(q => q.type !== QuestionType.MCQ && q.type !== QuestionType.TRUE_FALSE) 
                ? 'يحتوي الاختبار على أسئلة مقالية قد تحتاج لمراجعة المعلم لاعتماد الدرجة النهائية.' 
                : ''}
          </p>
          <div className="text-xl mb-6">
            الدرجة التقديرية: <span className="font-bold">{result.score}</span> / {result.totalScore}
          </div>
          <Button onClick={onComplete}>العودة لقائمة الاختبارات</Button>
        </Card>

        <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-700 mb-4">مراجعة الإجابات</h3>
            {quiz.questions.map((q, idx) => {
                const studentAnswer = result.answers[q.id];
                // Only show color feedback for objective questions
                const isObjective = [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK].includes(q.type);
                const isCorrect = isObjective && studentAnswer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
                const borderColor = isObjective 
                    ? (isCorrect ? 'border-r-green-500' : 'border-r-red-500')
                    : 'border-r-blue-500';

                return (
                    <Card key={q.id} className={`border-r-4 ${borderColor}`}>
                        <div className="flex gap-3">
                            <div className="mt-1">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">
                                    {idx + 1}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-medium text-slate-800 mb-3">{q.text}</p>
                                
                                <div className="bg-slate-50 p-3 rounded-lg mb-2 text-sm">
                                    <span className="font-bold ml-2">إجابتك:</span>
                                    <span className={isObjective ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-slate-800'}>
                                        {studentAnswer || 'لم تتم الإجابة'}
                                    </span>
                                </div>
                                
                                {isObjective && !isCorrect && q.correctAnswer && (
                                    <div className="bg-blue-50 p-3 rounded-lg mb-2 text-sm">
                                        <span className="font-bold ml-2">الإجابة الصحيحة:</span>
                                        <span className="text-blue-700">{q.correctAnswer}</span>
                                    </div>
                                )}

                                {q.explanation && (
                                    <div className="text-sm text-slate-500 mt-2 flex gap-2 items-start">
                                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{q.explanation}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQIndex];
  const isLastQuestion = currentQIndex === quiz.questions.length - 1;
  const progress = ((currentQIndex + 1) / quiz.questions.length) * 100;

  // Helper to render input based on type
  const renderInput = () => {
      // 1. Prepare Options
      let currentOptions = question.options;
      
      // FORCE Options for True/False if missing
      if (question.type === QuestionType.TRUE_FALSE && (!currentOptions || currentOptions.length === 0)) {
          currentOptions = ['صواب', 'خطأ'];
      }

      // 2. Determine Input Type - Buttons for MCQ/TF
      if (question.type === QuestionType.MCQ || question.type === QuestionType.TRUE_FALSE) {
          if (currentOptions && currentOptions.length > 0) {
              return (
                <div className="space-y-3">
                    {currentOptions.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(option)}
                            className={`w-full p-4 rounded-lg border-2 text-right transition-all ${
                                answers[question.id] === option 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                                : 'border-slate-100 hover:border-slate-300 text-slate-600'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
              );
          } else {
              // Fallback if options missing (should not happen for T/F due to check above)
               return (
                  <div className="space-y-2">
                      <p className="text-sm text-red-500 mb-2">لم تظهر خيارات لهذا السؤال، يرجى كتابة الإجابة:</p>
                      <textarea 
                          className="w-full p-4 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[80px]"
                          placeholder="اكتب إجابتك هنا..."
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswer(e.target.value)}
                      />
                  </div>
              );
          }
      }

      // 3. Default Text Area for ALL other types
      let placeholder = "اكتب إجابتك هنا...";
      
      switch (question.type) {
          case QuestionType.MATCHING: placeholder = "اكتب أزواج المطابقة هنا (مثال: 1-أ، 2-ب)..."; break;
          case QuestionType.EXTRACT: placeholder = "استخرج المطلوب من النص واكتبه هنا..."; break;
          case QuestionType.ENUMERATE: placeholder = "عدد النقاط المطلوبة (كل نقطة في سطر)..."; break;
          case QuestionType.EXPRESSION: placeholder = "اكتب التعبير أو الفقرة المطلوبة..."; break;
          case QuestionType.DRAW: placeholder = "يمكنك وصف الرسم هنا أو الإجابة في ورقة خارجية..."; break;
          case QuestionType.EVIDENCE: placeholder = "اذكر الدليل أو البرهان..."; break;
          case QuestionType.FILL_BLANK: placeholder = "اكتب الكلمة المفقودة..."; break;
          default: placeholder = "اكتب إجابتك هنا..."; break;
      }

      return (
          <div className="space-y-2">
              <textarea 
                  className="w-full p-4 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[150px]"
                  placeholder={placeholder}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
              />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Clock className="w-5 h-5 text-blue-600" />
                {quiz.durationMinutes ? (
                    <span className={timeLeft < 60 ? 'text-red-500 animate-pulse' : ''}>
                        {formatTime(timeLeft)}
                    </span>
                ) : (
                    <span>{formatTime(timeElapsed)} (مفتوح)</span>
                )}
            </div>
            <div className="text-sm font-medium text-slate-500">
                سؤال {currentQIndex + 1} من {quiz.questions.length}
            </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full mb-6 overflow-hidden">
            <div 
                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>

        {/* Question Card */}
        <Card className="min-h-[400px] flex flex-col justify-between">
            <div>
                <div className="mb-4">
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {question.type === QuestionType.MCQ ? 'اختيار من متعدد' : 
                         question.type === QuestionType.TRUE_FALSE ? 'صواب/خطأ' :
                         question.type === QuestionType.MATCHING ? 'وصل / مطابقة' :
                         question.type === QuestionType.FILL_BLANK ? 'أكمل الفراغ' :
                         'سؤال مقالي'}
                    </span>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded mr-2">
                        {question.points} درجات
                    </span>
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 leading-relaxed">
                    {question.text}
                </h2>

                {renderInput()}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <Button 
                    variant="secondary" 
                    onClick={() => setCurrentQIndex(prev => prev - 1)}
                    disabled={currentQIndex === 0}
                >
                    السابق
                </Button>
                
                {isLastQuestion ? (
                    <Button variant="primary" onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                        إنهاء الاختبار
                    </Button>
                ) : (
                    <Button variant="primary" onClick={() => setCurrentQIndex(prev => prev + 1)}>
                        التالي
                    </Button>
                )}
            </div>
        </Card>
    </div>
  );
};