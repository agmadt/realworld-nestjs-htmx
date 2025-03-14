import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { create } from 'express-handlebars';
import * as session from 'express-session';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'realworld-nestjs-htmx-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      },
    }),
  );

  const viewsDir = join(process.cwd(), 'views');
  const publicDir = join(process.cwd(), 'public');

  const hbs = create({
    extname: '.hbs',
    defaultLayout: 'app',
    layoutsDir: join(viewsDir, 'layouts'),
    partialsDir: join(viewsDir, 'partials'),
    helpers: {
      eq: function (a: any, b: any) {
        return a === b;
      },
      formatDate: function (date: any) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      paginationIterate: function (total: number, options: any) {
        let result = '';
        for (let i = 1; i <= total; i++) {
          result += options.fn(i);
        }
        return result;
      },
      json: function (context: any) {
        return JSON.stringify(context);
      },
    },
  });

  app.engine('hbs', hbs.engine);
  app.set('views', viewsDir);
  app.set('view engine', 'hbs');

  app.useStaticAssets(publicDir);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
