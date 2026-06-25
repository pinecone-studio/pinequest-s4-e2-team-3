import { api } from "./api";

export interface GuideQueryPayload {
  message: string;
  placeId?: string;
  coordinates?: { latitude: number; longitude: number };
  language?: "en" | "mn";
}

export interface GuideResponse {
  reply: string;
  audioUrl?: string;
}

export const aiService = {
  askGuide: (payload: GuideQueryPayload, token: string) =>
    api.post<GuideResponse>("/api/v1/guide/ask", payload, token),

  speechToText: (audioBase64: string, language: "en" | "mn" = "mn") =>
    api.post<{ transcript: string }>("/api/v1/guide/stt", { audioBase64, language }),
};
