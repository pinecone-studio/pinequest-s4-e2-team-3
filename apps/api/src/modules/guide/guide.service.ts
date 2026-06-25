import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

interface AskPayload {
  message: string;
  placeId?: string;
  coordinates?: { latitude: number; longitude: number };
  language?: "en" | "mn";
}

@Injectable()
export class GuideService {
  private openai: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("openai.apiKey");
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async ask(payload: AskPayload) {
    if (!this.openai) return { reply: "AI guide is not configured." };
    // TODO: add context (place info, user location, history) to system prompt
    const completion = await this.openai.chat.completions.create({
      model: this.config.get("openai.model") ?? "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable travel guide. Answer questions about places, culture, and travel tips.",
        },
        { role: "user", content: payload.message },
      ],
    });

    return {
      reply: completion.choices[0]?.message.content ?? "",
    };
  }

  async speechToText(audioBase64: string, language: "en" | "mn") {
    // TODO: integrate Chimege API for Mongolian STT
    // For English, use OpenAI Whisper
    return { transcript: "" };
  }
}
