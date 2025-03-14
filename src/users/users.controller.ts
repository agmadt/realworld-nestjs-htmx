import {
  Controller,
  Get,
  Post,
  Render,
  Param,
  Req,
  Session,
  Res,
  Body,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Article } from '../articles/entities/article.entity';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  @Get('/users/:username')
  @Render('users/show')
  async show(@Param('username') username: string, @Session() session: Record<string, any>) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['articles', 'articles.tags', 'articles.user'],
    });

    if (!user) throw new Error('User not found');

    const userId = session.userId || null;
    const isSelf = userId === user.id;
    let isFollowing = false;

    if (userId && !isSelf) {
      isFollowing = await this.usersService.isFollowing(userId, user.id);
    }

    const articles = (user as any).articles || [];
    const articlesWithData = await Promise.all(
      articles.map(async (article: Article) => {
        let isFavorited = false;
        let favoriteCount = 0;

        const countResult = await this.articleRepository.query(
          'SELECT COUNT(*) as count FROM article_favorite WHERE article_id = ?',
          [article.id],
        );
        favoriteCount = countResult[0]?.count || 0;

        if (userId) {
          const favResult = await this.articleRepository.query(
            'SELECT 1 FROM article_favorite WHERE article_id = ? AND user_id = ?',
            [article.id, userId],
          );
          isFavorited = favResult.length > 0;
        }

        return { ...article, isFavorited, favoriteCount };
      }),
    );

    return {
      user: userId ? await this.usersService.findById(userId) : null,
      profile: user,
      articles: articlesWithData,
      isSelf,
      isFollowing,
      loadFavorites: false,
      navbarActive: isSelf ? 'profile' : null,
      activeTab: 'articles',
    };
  }

  @Get('/users/:username/favorites')
  @Render('users/show')
  async favorites(@Param('username') username: string, @Session() session: Record<string, any>) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new Error('User not found');

    const userId = session.userId || null;
    const isSelf = userId === user.id;
    let isFollowing = false;

    if (userId && !isSelf) {
      isFollowing = await this.usersService.isFollowing(userId, user.id);
    }

    const articles = await this.articleRepository.query(
      `SELECT a.* FROM articles a
       INNER JOIN article_favorite af ON af.article_id = a.id
       WHERE af.user_id = ? ORDER BY a.created_at DESC`,
      [user.id],
    );

    const articlesWithData = await Promise.all(
      articles.map(async (article: any) => {
        const articleUser = await this.userRepository.findOne({ where: { id: article.user_id } });
        const countResult = await this.articleRepository.query(
          'SELECT COUNT(*) as count FROM article_favorite WHERE article_id = ?',
          [article.id],
        );
        let isFavorited = false;
        if (userId) {
          const favResult = await this.articleRepository.query(
            'SELECT 1 FROM article_favorite WHERE article_id = ? AND user_id = ?',
            [article.id, userId],
          );
          isFavorited = favResult.length > 0;
        }
        return {
          ...article,
          user: articleUser,
          isFavorited,
          favoriteCount: countResult[0]?.count || 0,
          tags: [],
        };
      }),
    );

    return {
      user: userId ? await this.usersService.findById(userId) : null,
      profile: user,
      articles: articlesWithData,
      isSelf,
      isFollowing,
      loadFavorites: true,
      navbarActive: isSelf ? 'profile' : null,
      activeTab: 'favorites',
    };
  }
}
