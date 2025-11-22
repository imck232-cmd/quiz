
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, Quiz } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyQuiz = async (dateStr: string): Promise<Quiz> => {
  // Keeping existing logic for daily quiz fallback
  try {
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
      const data = JSON.parse(response.text);
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
    console.error(error);
    return {
        id: dateStr,
        date: dateStr,
        title: "اختبار تجريبي",
        subject: "عام",
        term: "1",
        gradeLevel: "All",
        durationMinutes: 5,
        isActive: true,
        questions: []
    }
  }
};

export const generateQuizFromContent = async (
    content: string,
    questionTypes: QuestionType[],
    metadata: { title: string; grade: string; subject: string }
  ): Promise<Question[]> => {
    try {
      const model = "gemini-2.5-flash";
      
      const prompt = `
      Act as a professional teacher. Create a quiz in Arabic based on the provided content.
      
      Context Content:
      """${content.substring(0, 10000)}"""
      
      Requirements:
      1. Subject: ${metadata.subject}
      2. Grade Level: ${metadata.grade}
      3. Generate questions ONLY of the following types: ${questionTypes.join(", ")}. Use the exact type names provided.
      4. For each question, provide the question text, type, options (REQUIRED for MCQ AND TRUE_FALSE), and a model answer.
      5. Assign a default point value (e.g., 5 or 10).
      6. Ensure the output is valid JSON.
      `;
  
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
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
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for MCQ and TRUE_FALSE (e.g. ['صواب', 'خطأ'])" },
                    correctAnswer: { type: Type.STRING, description: "The correct answer or model answer" },
                    explanation: { type: Type.STRING, description: "Explanation if needed" },
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
        const data = JSON.parse(response.text);
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
      throw new Error("Failed to generate questions");
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw error;
    }
  };
