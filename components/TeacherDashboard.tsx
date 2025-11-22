import React, { useMemo, useState } from 'react';
import { StudentData, QuestionType, Question, Quiz } from '../types';
import { storageService } from '../services/storageService';
import { generateQuizFromContent } from '../services/geminiService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Download, LogOut, Plus, FileText, Save, Trash2, LayoutDashboard } from 'lucide-react';

interface Props {
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CREATE_QUIZ'>('DASHBOARD');
  
  // --- Dashboard State ---
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const students = useMemo(() => storageService.getStudents(), []);
  const results = useMemo(() => storageService.getResults(), []);
  const quizzes = useMemo(() => storageService.getQuizzes(), [activeTab]); // Refresh when tab changes

  // --- Create Quiz State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizMeta, setQuizMeta] = useState({
    title: '',
    subject: '',
    grade: '',
    term: 'الفصل الأول',
    duration: '30', // string for input, convert to number or null
    isOpenTime: false
  });
  const [content, setContent] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([QuestionType.MCQ, QuestionType.TRUE_FALSE]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<1 | 2>(1); // 1: Input, 2: Review

  const allTypes = [
    { id: QuestionType.MCQ, label: 'اختيار من متعدد' },
    { id: QuestionType.TRUE_FALSE, label: 'صواب وخطأ' },
    { id: QuestionType.FILL_BLANK, label: 'أكمل الفراغ' },
    { id: QuestionType.MATCHING, label: 'وصل' },
    { id: QuestionType.EXTRACT, label: 'استخرج' },
    { id: QuestionType.ENUMERATE, label: 'عدد / اذكر' },
    { id: QuestionType.EXPRESSION, label: 'اكتب تعبيراً' },
    { id: QuestionType.DRAW, label: 'ارسم' },
    { id: QuestionType.EVIDENCE, label: 'دلل على' },
    { id: QuestionType.OTHER, label: 'غير ذلك' },
  ];

  // --- Dashboard Logic ---
  const filteredStudents = useMemo(() => {
    if (filterGrade === 'all') return students;
    return students.filter(s => s.grade === filterGrade);
  }, [students, filterGrade]);

  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const relevantResults = results.filter(r => 
      filteredStudents.some(s => s.id === r.studentId)
    );
    const totalTaken = relevantResults.length;
    const passed = relevantResults.filter(r => r.isPassed).length;
    const passRate = totalTaken > 0 ? (passed / totalTaken) * 100 : 0;
    
    const scores = relevantResults.map(r => (r.score / r.totalScore) * 100);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return { totalStudents, totalTaken, passRate, avgScore, relevantResults };
  }, [filteredStudents, results]);

  const chartData = useMemo(() => {
    const grades = Array.from(new Set(students.map(s => s.grade)));
    return grades.map(grade => {
      const gradeStudents = students.filter(s => s.grade === grade);
      const gradeResults = results.filter(r => gradeStudents.some(s => s.id === r.studentId));
      const avg = gradeResults.length > 0 
        ? gradeResults.reduce((acc, curr) => acc + (curr.score/curr.totalScore)*100, 0) / gradeResults.length
        : 0;
      return { name: grade, average: Math.round(avg) };
    });
  }, [students, results]);

  const pieData = [
    { name: 'ناجح', value: stats.relevantResults.filter(r => r.isPassed).length },
    { name: 'راسب', value: stats.relevantResults.filter(r => !r.isPassed).length },
  ];

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setContent(prev => prev + '\n\n' + text);
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleType = (type: QuestionType) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      alert('الرجاء إدخال محتوى نصي أو رفع ملف');
      return;
    }
    if (selectedTypes.length === 0) {
      alert('الرجاء اختيار نوع سؤال واحد على الأقل');
      return;
    }
    
    setIsGenerating(true);
    try {
      const questions = await generateQuizFromContent(content, selectedTypes, {
        title: quizMeta.title,
        grade: quizMeta.grade,
        subject: quizMeta.subject
      });
      setGeneratedQuestions(questions);
      setStep(2);
    } catch (error) {
      alert('فشل في إنشاء الأسئلة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = () => {
    if (!quizMeta.title || !quizMeta.subject) {
      alert('الرجاء إكمال بيانات الاختبار');
      return;
    }

    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title: quizMeta.title,
      subject: quizMeta.subject,
      gradeLevel: quizMeta.grade,
      term: quizMeta.term,
      date: new Date().toISOString(),
      durationMinutes: quizMeta.isOpenTime ? null : parseInt(quizMeta.duration),
      questions: generatedQuestions,
      isActive: true
    };

    storageService.saveQuiz(newQuiz);
    alert('تم حفظ الاختبار بنجاح');
    setStep(1);
    setGeneratedQuestions([]);
    setContent('');
    setQuizMeta({ ...quizMeta, title: '', subject: '' });
    setActiveTab('DASHBOARD');
  };

  const updateQuestionPoints = (id: string, points: number) => {
    setGeneratedQuestions(prev => prev.map(q => q.id === id ? { ...q, points } : q));
  };

  const handleDeleteQuiz = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
        storageService.deleteQuiz(id);
        // Force re-render logic would be better with context, but forcing state update works
        setActiveTab('CREATE_QUIZ'); 
        setTimeout(() => setActiveTab('DASHBOARD'), 10);
    }
  };

  // --- Render Methods ---
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-blue-500 p-4">
           <p className="text-sm text-slate-500">إجمالي الطلاب</p>
           <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
        </Card>
        <Card className="border-r-4 border-r-purple-500 p-4">
           <p className="text-sm text-slate-500">الاختبارات المتاحة</p>
           <h3 className="text-2xl font-bold">{quizzes.length}</h3>
        </Card>
        <Card className="border-r-4 border-r-green-500 p-4">
           <p className="text-sm text-slate-500">متوسط الدرجات</p>
           <h3 className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</h3>
        </Card>
        <Card className="border-r-4 border-r-yellow-500 p-4">
           <p className="text-sm text-slate-500">نسبة النجاح</p>
           <h3 className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="الأداء حسب الصف" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#3b82f6" name="المتوسط %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="نسب النجاح" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'ناجح' ? '#22c55e' : '#ef4444'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="إدارة الاختبارات النشطة">
          <div className="overflow-x-auto">
              <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-600">
                      <tr>
                          <th className="p-3">عنوان الاختبار</th>
                          <th className="p-3">المادة</th>
                          <th className="p-3">الصف</th>
                          <th className="p-3">عدد الأسئلة</th>
                          <th className="p-3">إجراءات</th>
                      </tr>
                  </thead>
                  <tbody>
                      {quizzes.map(q => (
                          <tr key={q.id} className="border-b border-slate-100">
                              <td className="p-3 font-medium">{q.title}</td>
                              <td className="p-3">{q.subject}</td>
                              <td className="p-3">{q.gradeLevel}</td>
                              <td className="p-3">{q.questions.length}</td>
                              <td className="p-3">
                                  <button onClick={() => handleDeleteQuiz(q.id)} className="text-red-500 hover:text-red-700 p-2">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {quizzes.length === 0 && (
                          <tr><td colSpan={5} className="p-4 text-center text-slate-400">لا توجد اختبارات نشطة</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </Card>
    </div>
  );

  const renderCreateQuiz = () => (
    <div className="space-y-6">
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <Card className="lg:col-span-1 space-y-4 h-fit">
            <h3 className="font-bold text-lg mb-4">1. إعدادات الاختبار</h3>
            <div>
                <label className="block text-sm font-medium mb-1">عنوان الاختبار</label>
                <input type="text" className="w-full p-2 border rounded" 
                    value={quizMeta.title} onChange={e => setQuizMeta({...quizMeta, title: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">المادة</label>
                <input type="text" className="w-full p-2 border rounded" 
                    value={quizMeta.subject} onChange={e => setQuizMeta({...quizMeta, subject: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-medium mb-1">الصف</label>
                    <select className="w-full p-2 border rounded bg-white"
                        value={quizMeta.grade} onChange={e => setQuizMeta({...quizMeta, grade: e.target.value})}>
                        <option value="">اختر</option>
                        <option value="الصف السابع">الصف السابع</option>
                        <option value="الصف الثامن">الصف الثامن</option>
                        <option value="الصف التاسع">الصف التاسع</option>
                        <option value="الصف العاشر">الصف العاشر</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">الفصل</label>
                    <select className="w-full p-2 border rounded bg-white"
                        value={quizMeta.term} onChange={e => setQuizMeta({...quizMeta, term: e.target.value})}>
                        <option value="الفصل الأول">الفصل الأول</option>
                        <option value="الفصل الثاني">الفصل الثاني</option>
                        <option value="الفصل الثالث">الفصل الثالث</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-2 my-2">
                <input type="checkbox" id="isOpen" checked={quizMeta.isOpenTime} 
                    onChange={e => setQuizMeta({...quizMeta, isOpenTime: e.target.checked})} />
                <label htmlFor="isOpen" className="text-sm">مدة مفتوحة</label>
            </div>
            {!quizMeta.isOpenTime && (
                <div>
                    <label className="block text-sm font-medium mb-1">المدة (دقيقة)</label>
                    <input type="number" className="w-full p-2 border rounded" 
                        value={quizMeta.duration} onChange={e => setQuizMeta({...quizMeta, duration: e.target.value})} />
                </div>
            )}
          </Card>

          {/* Content & Types Column */}
          <Card className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-lg mb-4">2. المحتوى والأسئلة</h3>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">انسخ النص هنا أو ارفع ملف (PDF/Word/TXT)</p>
                <div className="flex justify-center gap-2">
                     <input type="file" accept=".txt,.json,.md" onChange={handleFileUpload} className="hidden" id="file-upload" />
                     <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50">
                        رفع ملف نصي
                     </label>
                </div>
            </div>

            <textarea 
                className="w-full h-48 p-3 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="الصق محتوى الدرس هنا ليتم إنشاء الأسئلة منه..."
                value={content}
                onChange={e => setContent(e.target.value)}
            />

            <div>
                <label className="block text-sm font-medium mb-2">أنواع الأسئلة المطلوبة:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {allTypes.map(type => (
                        <label key={type.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${selectedTypes.includes(type.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                            <input 
                                type="checkbox" 
                                checked={selectedTypes.includes(type.id)}
                                onChange={() => toggleType(type.id)}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm">{type.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t mt-4 flex justify-end">
                <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full md:w-auto">
                    إنشاء الأسئلة بالذكاء الاصطناعي
                </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">مراجعة وتعديل الدرجات</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>عودة للتعديل</Button>
                    <Button onClick={handleSaveQuiz}>
                        <Save className="w-4 h-4" />
                        حفظ ونشر الاختبار
                    </Button>
                </div>
            </div>

            <Card className="bg-blue-50 border-blue-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="font-bold">العنوان:</span> {quizMeta.title}</div>
                    <div><span className="font-bold">المادة:</span> {quizMeta.subject}</div>
                    <div><span className="font-bold">الصف:</span> {quizMeta.grade}</div>
                    <div><span className="font-bold">الزمن:</span> {quizMeta.isOpenTime ? 'مفتوح' : `${quizMeta.duration} دقيقة`}</div>
                </div>
            </Card>

            <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start">
                        <div className="bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full font-bold text-slate-600 shrink-0">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-medium text-lg mb-2">{q.text}</p>
                                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 whitespace-nowrap">{allTypes.find(t => t.id === q.type)?.label}</span>
                            </div>
                            
                            {q.options && q.options.length > 0 && (
                                <ul className="list-disc list-inside text-slate-600 text-sm mr-4 mb-2">
                                    {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                                </ul>
                            )}
                            
                            <div className="text-sm text-green-700 bg-green-50 p-2 rounded mt-2 inline-block">
                                الإجابة النموذجية: {q.correctAnswer || 'متروك للمعلم'}
                            </div>
                        </div>
                        <div className="w-full md:w-32 shrink-0">
                            <label className="block text-xs font-medium text-slate-500 mb-1">درجة السؤال</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-200 text-center font-bold text-blue-600"
                                value={q.points}
                                onChange={(e) => updateQuestionPoints(q.id, parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">لوحة تحكم المعلم</h1>
          <p className="text-slate-500">إدارة الاختبارات والطلاب</p>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button 
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'DASHBOARD' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <LayoutDashboard className="w-4 h-4" />
            الإحصائيات والنتائج
        </button>
        <button 
            onClick={() => setActiveTab('CREATE_QUIZ')}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'CREATE_QUIZ' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Plus className="w-4 h-4" />
            إنشاء اختبار جديد
        </button>
      </div>

      {activeTab === 'DASHBOARD' ? renderDashboard() : renderCreateQuiz()}
    </div>
  );
};