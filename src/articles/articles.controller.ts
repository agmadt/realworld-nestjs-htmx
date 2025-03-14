import {
  Controller,
  Get,
  Param,
  Render,
  Session,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from './articles.service';
import { UsersService } from '../users/users.service';

@Controller()
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('/articles/:slug')
  @Render('articles/show')
  async show(@Param('slug') slug: string, @Session() session: Record<string, any>) {
    const userId = session.userId || null;

    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['user', 'tags'],
    });

    if (!article) throw new Error('Article not found');

    let isFavorited = false;
    let favoriteCount = 0;
    let isFollowing = false;

    const countResult = await this.articleRepository.query(
      'SELECT COUNT(*) as count FROM article_favorite WHERE article_id = ?',
      [article.id],
    );
    favoriteCount = countResult[0]?.count || 0;

    if (userId) {
      isFavorited = await this.usersService.isFavoritedArticle(userId, article.id);
    }

    if (userId && article.user_id !== userId) {
      isFollowing = await this.usersService.isFollowing(userId, article.user_id);
    }

    const comments = await this.articlesService.getComments(article.id);

    const currentUser = userId ? await this.usersService.findById(userId) : null;

    return {
      user: currentUser,
      article: { ...article, isFavorited, favoriteCount },
      isFollowing,
      comments,
      navbarActive: null,
    };
  }
}
