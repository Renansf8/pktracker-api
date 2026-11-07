import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { env } from './shared/config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalGuards();
  app.enableCors({ origin: '*' });

  // Security headers: HSTS, nosniff, frame denial, no X-Powered-By. The CSP
  // only gets in the way of the Swagger UI, so it's off when /docs is on.
  app.use(
    helmet({
      contentSecurityPolicy: env.enableSwagger ? false : undefined,
    }),
  );

  if (env.enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('PkTracker API')
      .setDescription('Poker tournament tracker REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req, res) =>
    res.status(200).json({ status: 'ok' }),
  );

  await app.listen(port, '0.0.0.0');
}
bootstrap();
