import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Tag } from '../tags/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { Comment } from '../articles/entities/comment.entity';
import { ArticlesModule } from '../articles/articles.module';
import { UsersModule } from '../users/users.module';
import { TagsModule } from '../tags/tags.module';
import { HomeController } from './home.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Tag, User, Comment]),
    ArticlesModule,
    UsersModule,
    TagsModule,
  ],
  controllers: [HomeController],
})
export class HomeModule {}
