import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { EditorController } from './editor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article, User]), UsersModule],
  controllers: [EditorController],
})
export class EditorModule {}
