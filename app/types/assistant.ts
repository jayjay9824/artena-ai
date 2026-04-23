export type QuestionType =
  | "interpretation"
  | "market"
  | "comparison"
  | "recommendation"
  | "taste_profile";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  questionType?: QuestionType;
  fromSuggested?: boolean;
}

export interface SuggestedQuestion {
  text: string;
  type: QuestionType;
}
