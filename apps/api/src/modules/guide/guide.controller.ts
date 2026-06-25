import { Controller, Post, Body } from "@nestjs/common";
import { GuideService } from "./guide.service";

class AskGuideDto {
  message!: string;
  placeId?: string;
  coordinates?: { latitude: number; longitude: number };
  language?: "en" | "mn";
}

class SttDto {
  audioBase64!: string;
  language?: "en" | "mn";
}

@Controller("guide")
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Post("ask")
  ask(@Body() dto: AskGuideDto) {
    return this.guideService.ask(dto);
  }

  @Post("stt")
  speechToText(@Body() dto: SttDto) {
    return this.guideService.speechToText(dto.audioBase64, dto.language ?? "mn");
  }
}
