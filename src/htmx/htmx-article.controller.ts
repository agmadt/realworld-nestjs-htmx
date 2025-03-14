import { Controller, Get, Post, Param, Session, Res, Body, Delete } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { Comment } from '../articles/entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from '../articles/articles.service';
import { UsersService } from '../users/users.service';

@Controller('/htmx/articles')
export class HtmxArticleController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('/:slug')
  async show(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId || null;

    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['user', 'tags'],
    });

    if (!article) return res.status(404).send('Article not found.');

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

    const currentUser = userId ? await this.usersService.findById(userId) : null;

    return res.render('articles/show', {
      layout: 'app-htmx',
      user: currentUser,
      article: { ...article, isFavorited, favoriteCount },
      isFollowing,
      navbarActive: null,
    });
  }

  @Post('/:slug/favorite')
  async favorite(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) return res.status(404).send('');

    const isNowFavorited = await this.usersService.toggleFavoriteArticle(userId, article.id);
    const favoriteCount = await this.articlesService.getFavoriteCount(article.id);

    return res.render('partials/favorite-button', {
      layout: false,
      article: { slug: article.slug, isFavorited: isNowFavorited, favoriteCount },
      oobSwap: true,
    });
  }

  @Post('/follow-user/:slug')
  async follow(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['user'],
    });

    if (!article) return res.status(404).send('');

    const isNowFollowing = await this.usersService.toggleFollow(userId, article.user_id);

    return res.render('partials/follow-button', {
      layout: false,
      profile: article.user,
      isFollowing: isNowFollowing,
      oobSwap: true,
    });
  }

  @Get('/:slug/comments')
  async comments(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId || null;
    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) return res.status(404).send('');

    const comments = await this.commentRepository.find({
      where: { article_id: article.id },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });

    const currentUser = userId ? await this.usersService.findById(userId) : null;

    return res.render('partials/comments-wrapper', {
      layout: 'app-htmx',
      article,
      comments,
      user: currentUser,
    });
  }

  @Post('/:slug/comments')
  async postComment(
    @Param('slug') slug: string,
    @Body() body: { body: string },
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) return res.status(404).send('');

    if (!body.body) {
      res.setHeader('HX-Retarget', '#comment-form-errors');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Comment body is required.'],
      });
    }

    const comment = await this.articlesService.createComment(article.id, userId, body.body);
    const commentWithUser = await this.commentRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });

    const cardHtml = await this.renderTemplate(res, 'partials/comments-card', {
      comment: commentWithUser,
    });
    const formHtml = await this.renderTemplate(res, 'partials/comments-form', {
      article,
      user: await this.usersService.findById(userId),
    });

    res.setHeader('HX-Reswap', 'afterbegin');
    return res.send(cardHtml);
  }

  @Delete('/:slug')
  async deleteArticle(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const article = await this.articleRepository.findOne({
      where: { slug, user_id: userId },
      relations: ['user'],
    });

    if (!article) return res.status(404).send('');

    const username = article.user?.username || '';

    await this.articlesService.deleteArticle(slug, userId);

    res.setHeader('HX-Redirect', `/users/${username}`);
    return res.status(200).send('');
  }

  private async renderTemplate(res: Response, template: string, data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      res.render(template, { layout: 'app-htmx', ...data }, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });
  }
}
