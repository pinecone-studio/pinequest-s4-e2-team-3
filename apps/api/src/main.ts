import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Explicit origins always win. Without ALLOWED_ORIGINS set, stay permissive
  // in dev (so local tooling keeps working) but closed in production, rather
  // than silently serving every origin on a live deployment.
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");
  app.enableCors({
    origin: allowedOrigins ?? (process.env.NODE_ENV === "production" ? false : "*"),
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
