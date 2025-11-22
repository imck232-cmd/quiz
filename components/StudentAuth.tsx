import React, { useState } from 'react';
import { StudentData } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { UserCircle2, School } from 'lucide-react';

interface Props {
  onLogin: (student: StudentData) => void;
}

export const StudentAuth: React.FC<Props> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    schoolName: '',
    grade: '',
    section: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.studentId) return;

    const student: StudentData = {
      id: formData.studentId,
      fullName: formData.fullName,
      schoolName: formData.schoolName,
      grade: formData.grade,
      section: formData.section,
      academicYear: new Date().getFullYear().toString(),
      registrationDate: new Date().toISOString()
    };

    onLogin(student);
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <School className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">بوابة الطلاب</h1>
        <p className="text-slate-500 mt-2">سجل دخولك لبدء الاختبار اليومي</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
            <input
              required
              type="text"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="محمد أحمد..."
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الكود الخاص (ID)</label>
            <input
              required
              type="text"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="ST-2024-..."
              value={formData.studentId}
              onChange={e => setFormData({...formData, studentId: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المدرسة</label>
                <input
                required
                type="text"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                value={formData.schoolName}
                onChange={e => setFormData({...formData, schoolName: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الصف الدراسي</label>
                <select
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                  value={formData.grade}
                  onChange={e => setFormData({...formData, grade: e.target.value})}
                >
                    <option value="">اختر الصف</option>
                    <option value="الصف السابع">الصف السابع</option>
                    <option value="الصف الثامن">الصف الثامن</option>
                    <option value="الصف التاسع">الصف التاسع</option>
                    <option value="الصف العاشر">الصف العاشر</option>
                </select>
            </div>
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الشعبة / الفصل</label>
            <input
              required
              type="text"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="أ"
              value={formData.section}
              onChange={e => setFormData({...formData, section: e.target.value})}
            />
          </div>

          <Button type="submit" className="w-full mt-6" size="lg">
            <UserCircle2 className="w-5 h-5" />
            بدء الاختبار
          </Button>
        </form>
      </Card>
    </div>
  );
};