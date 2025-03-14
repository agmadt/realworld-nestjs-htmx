import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { TagsModule } from './tags/tags.module';
import { HomeModule } from './home/home.module';
import { AuthModule } from './auth/auth.module';
import { HtmxModule } from './htmx/htmx.module';
import { SettingsModule } from './settings/settings.module';
import { EditorModule } from './editor/editor.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || join(process.cwd(), 'database', 'conduit.sqlite'),
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      synchronize: true,
    }),
    UsersModule,
    ArticlesModule,
    TagsModule,
    HomeModule,
    AuthModule,
    HtmxModule,
    SettingsModule,
    EditorModule,
  ],
})
export class AppModule {}
