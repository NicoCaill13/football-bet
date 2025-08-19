import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle("SportsBot API")
    .setDescription("Football 1N2 decision engine")
    .setVersion("0.1.0")
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/docs", app, doc);

  const port = process.env.PORT || 3000;
  await app.listen(port as number);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();