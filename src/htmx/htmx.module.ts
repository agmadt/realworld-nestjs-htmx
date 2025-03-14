import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Comment } from '../articles/entities/comment.entity';
import { Tag } from '../tags/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesModule } from '../articles/articles.module';
import { UsersModule } from '../users/users.module';
import { TagsModule } from '../tags/tags.module';
import { AuthModule } from '../auth/auth.module';
import { HtmxHomeController } from './htmx-home.controller';
import { HtmxAuthController } from './htmx-auth.controller';
import { HtmxArticleController } from './htmx-article.controller';
import { HtmxUserController } from './htmx-user.controller';
import { HtmxEditorController } from './htmx-editor.controller';
import { HtmxSettingsController } from './htmx-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Comment, Tag, User]),
    ArticlesModule,
    UsersModule,
    TagsModule,
    AuthModule,
  ],
  controllers: [
    HtmxHomeController,
    HtmxAuthController,
    HtmxArticleController,
    HtmxUserController,
    HtmxEditorController,
    HtmxSettingsController,
  ],
})
export class HtmxModule {}
