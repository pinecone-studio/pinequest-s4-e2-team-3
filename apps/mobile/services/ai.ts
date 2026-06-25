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
  // TODO: implement after backend guide endpoint is ready
  askGuide: (payload: GuideQueryPayload, token: string) =>
    api.post<GuideResponse>("/guide/ask", payload, token),

  // TODO: integrate Chimege STT endpoint
  speechToText: (audioBase64: string, language: "en" | "mn" = "mn") =>
    api.post<{ transcript: string }>("/guide/stt", { audioBase64, language }),
};
