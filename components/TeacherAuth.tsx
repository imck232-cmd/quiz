
import React, { useState } from 'react';
import { TeacherProfile } from '../types';
import { storageService } from '../services/storageService';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Lock, UserPlus, School, BookOpen } from 'lucide-react';

interface Props {
  onLogin: (teacher: TeacherProfile) => void;
}

export const TeacherAuth: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [formData, setFormData] = useState<TeacherProfile>({
    code: '',
    fullName: '',
    schoolName: '',
    subject: '',
    academicYear: new Date().getFullYear().toString()
  });
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = storageService.getTeacherByCode(formData.code);
    if (teacher) {
      onLogin(teacher);
    } else {
      setError('كود المعلم غير صحيح. الرجاء التسجيل أولاً إذا كنت مستخدماً جديداً.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.fullName) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    // Check if code taken
    if (storageService.getTeacherByCode(formData.code)) {
      setError('هذا الكود مستخدم بالفعل، يرجى استخدام كود آخر أو تسجيل الدخول.');
      return;
    }

    storageService.saveTeacher(formData);
    onLogin(formData);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Lock className="w-5 h-5" />
          دخول الكادر التعليمي
        </h2>
      </div>

      <Card>
        {/* Tabs */}
        <div className="flex border-b border-slate-100 mb-6">
          <button
            onClick={() => { setMode('LOGIN'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${mode === 'LOGIN' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            تسجيل دخول
          </button>
          <button
            onClick={() => { setMode('REGISTER'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${mode === 'REGISTER' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            تسجيل جديد
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود المعلم (الرقم السري)</label>
              <input
                type="password"
                placeholder="أدخل الكود الخاص بك..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-center text-lg tracking-widest"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">دخول للوحة التحكم</Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
              <div className="relative">
                 <UserPlus className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                 <input
                    required
                    type="text"
                    className="w-full p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                 />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المدرسة</label>
              <div className="relative">
                 <School className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                 <input
                    required
                    type="text"
                    className="w-full p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.schoolName}
                    onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                    <div className="relative">
                        <BookOpen className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                        <input
                            required
                            type="text"
                            className="w-full p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">العام الدراسي</label>
                    <input
                        required
                        type="text"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                        value={formData.academicYear}
                        onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">انشئ كود خاص (كلمة مرور)</label>
              <input
                required
                type="text"
                placeholder="مثال: T-1020"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-slate-50"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">ستستخدم هذا الكود للدخول في المرات القادمة.</p>
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">إنشاء حساب معلم</Button>
          </form>
        )}
      </Card>
    </div>
  );
};
