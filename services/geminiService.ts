
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, Quiz } from "../types";

// Initialize AI safely. The key might be empty at this stage, so we validate inside functions.
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Robust helper to clean and parse AI JSON responses
const cleanAndParseJSON = (text: string) => {
  if (!text) throw new Error("Received empty response from AI");

  try {
    // 1. Try removing markdown code blocks
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Direct JSON parse failed, attempting heuristic extraction...", e);
    // 2. Fallback: Extract content between first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
       try {
         const extracted = text.substring(start, end + 1);
         return JSON.parse(extracted);
       } catch (innerE) {
         throw new Error("Failed to parse extracted JSON content");
       }
    }
    throw new Error("Response did not contain valid JSON");
  }
};

export const generateDailyQuiz = async (dateStr: string): Promise<Quiz> => {
  try {
    if (!apiKey) {
        console.error("API Key is missing in environment variables.");
        throw new Error("MISSING_API_KEY");
    }

    const model = "gemini-2.5-flash";
    const prompt = `Generate a daily general knowledge quiz for students in Arabic. 
    The date is ${dateStr}. 
    Create 5 questions: 3 Multiple Choice, 1 True/False, 1 Short Answer.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["MCQ", "TRUE_FALSE", "FILL_BLANK"] },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    points: { type: Type.NUMBER }
                  },
                  required: ["text", "type", "correctAnswer", "points"]
                }
              }
            },
            required: ["title", "questions"]
          }
      }
    });

    if (response.text) {
      const data = cleanAndParseJSON(response.text);
      const questions: Question[] = data.questions.map((q: any, index: number) => ({
        id: `q-${index}-${Date.now()}`,
        text: q.text,
        type: q.type === "SHORT_ANSWER" ? QuestionType.FILL_BLANK : q.type as QuestionType,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        points: q.points || 10
      }));

      return {
        id: dateStr,
        date: dateStr,
        title: data.title || `اختبار اليوم - ${dateStr}`,
        subject: "عام",
        term: "يومي",
        gradeLevel: "عام",
        durationMinutes: 10,
        questions: questions,
        isActive: true
      };
    }
    throw new Error("Empty response from AI");
  } catch (error: any) {
    console.error("Daily Quiz Generation Failed:", error);
    
    // Determine if it's an API Key issue to log a specific warning
    if (error.message === "MISSING_API_KEY" || error.toString().includes("403") || error.toString().includes("API key")) {
        console.warn("CRITICAL: API Key is invalid or missing. Using offline fallback.");
    }

    // Return reliable fallback data so the app doesn't crash on start
    return {
        id: dateStr,
        date: dateStr,
        title: "اختبار تجريبي (وضع غير متصل)",
        subject: "عام",
        term: "1",
        gradeLevel: "All",
        durationMinutes: 5,
        isActive: true,
        questions: [
            {
                id: "fallback-1",
                text: "ما هي عاصمة المملكة العربية السعودية؟",
                type: QuestionType.MCQ,
                options: ["جدة", "الرياض", "الدمام", "مكة المكرمة"],
                correctAnswer: "الرياض",
                points: 10
            },
            {
                id: "fallback-2",
                text: "الماء يتكون من الهيدروجين والأكسجين.",
                type: QuestionType.TRUE_FALSE,
                options: ["صواب", "خطأ"],
                correctAnswer: "صواب",
                points: 10
            }
        ]
    }
  }
};

export const generateQuizFromContent = async (
    content: string,
    questionTypes: QuestionType[],
    metadata: { title: string; grade: string; subject: string }
  ): Promise<Question[]> => {
    
    // Explicit check before attempting request
    if (!apiKey) {
        throw new Error("مفتاح API غير موجود. يرجى التحقق من إعدادات النشر (Environment Variables).");
    }

    try {
      const model = "gemini-2.5-flash";
      
      const systemInstruction = `
      Act as a professional teacher. Create a quiz in Arabic based on the provided content.
      Subject: ${metadata.subject}
      Grade Level: ${metadata.grade}
      `;

      const prompt = `
      Content:
      """${content.substring(0, 20000)}"""
      
      Requirements:
      1. Generate questions ONLY of the following types: ${questionTypes.join(", ")}.
      2. For each question, provide the text, type, options (REQUIRED for MCQ/TRUE_FALSE), and a model answer.
      3. Assign default points.
      `;
  
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "The question text in Arabic" },
                    type: { type: Type.STRING, description: "One of the requested types" },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for MCQ and TRUE_FALSE" },
                    correctAnswer: { type: Type.STRING, description: "The correct answer" },
                    explanation: { type: Type.STRING, description: "Short explanation" },
                    points: { type: Type.NUMBER }
                  },
                  required: ["text", "type", "correctAnswer", "points"]
                }
              }
            }
          }
        }
      });
  
      if (response.text) {
        const data = cleanAndParseJSON(response.text);
        
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("تنسيق البيانات المستلمة غير صحيح");
        }

        return data.questions.map((q: any, index: number) => ({
          id: `gen-${index}-${Date.now()}`,
          text: q.text,
          type: q.type as QuestionType, 
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
          points: q.points || 5
        }));
      }
      throw new Error("فشل في استلام رد من الذكاء الاصطناعي (رد فارغ)");
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      
      // Provide user-friendly error messages
      if (error.message?.includes("API key") || error.message?.includes("403") || error.message?.includes("400")) {
         throw new Error("خطأ في مفتاح API. يرجى التأكد من صلاحية المفتاح وإعدادات المشروع.");
      }
      if (error.message?.includes("quota")) {
         throw new Error("تم تجاوز حد الاستخدام المجاني (Quota Exceeded).");
      }
      
      throw error;
    }
  };
