
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, Quiz } from "../types";

// Initialize AI safely. If key is missing, we don't crash immediately, 
// but requests will fail gracefully in the try/catch blocks.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

// Helper to handle AI responses that might include Markdown code blocks
const cleanAndParseJSON = (text: string) => {
  try {
    // Remove ```json and ``` fences if they exist
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    // Fallback: try to extract the first JSON object found in text
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
       try {
         return JSON.parse(text.substring(start, end + 1));
       } catch (innerE) {
         throw e;
       }
    }
    throw e;
  }
};

export const generateDailyQuiz = async (dateStr: string): Promise<Quiz> => {
  try {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing");
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
    throw new Error("Empty response");
  } catch (error) {
    console.error("Daily Quiz Generation Failed (Using Fallback):", error);
    // Return reliable fallback data if API fails or key is invalid
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
    try {
      if (!process.env.API_KEY) {
          throw new Error("مفتاح API غير موجود. يرجى التحقق من الإعدادات.");
      }

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
      throw new Error("فشل في استلام رد من الذكاء الاصطناعي");
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      // Propagate a clean error message
      if (error.message?.includes("API key")) {
         throw new Error("مفتاح API غير صالح أو مفقود.");
      }
      throw error;
    }
  };
