import { Controller, Get, Post, Param, Session, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ArticlesService } from '../articles/articles.service';

@Controller('/htmx/users')
export class HtmxUserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly articlesService: ArticlesService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('/:username')
  async show(
    @Param('username') username: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['articles', 'articles.tags', 'articles.user'],
    });

    if (!user) return res.status(404).send('User not found.');

    const userId = session.userId || null;
    const isSelf = userId === user.id;
    let isFollowing = false;

    if (userId && !isSelf) {
      isFollowing = await this.usersService.isFollowing(userId, user.id);
    }

    const articles = (user as any).articles || [];
    const articlesWithData = await this.enrichArticles(articles, userId);

    return res.render('users/show', {
      layout: 'app-htmx',
      user: userId ? await this.usersService.findById(userId) : null,
      profile: user,
      articles: articlesWithData,
      isSelf,
      isFollowing,
      loadFavorites: false,
      navbarActive: isSelf ? 'profile' : null,
      activeTab: 'articles',
    });
  }

  @Get('/:username/articles')
  async articles(
    @Param('username') username: string,
    @Session() session: Record<string, any>,
    @Query('page') page: string,
    @Res() res: Response,
  ) {
    const pageNum = parseInt(page) || 1;
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) return res.status(404).send('');

    const userId = session.userId || null;

    const articlesData = await this.articleRepository.find({
      where: { user_id: user.id },
      relations: ['user', 'tags'],
      order: { created_at: 'DESC' },
      skip: (pageNum - 1) * 5,
      take: 5,
    });

    const articlesWithData = await this.enrichArticles(articlesData, userId);

    const postsHtml = await this.renderTemplate(res, 'partials/post-preview', {
      articles: articlesWithData,
    });
    const feedNavHtml = await this.renderTemplate(res, 'users/htmx-articles', {
      profile: user,
      activeTab: 'articles',
    });

    return res.send(feedNavHtml + postsHtml);
  }

  @Get('/:username/favorites')
  async favoriteArticles(
    @Param('username') username: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) return res.status(404).send('');

    const userId = session.userId || null;

    const articles = await this.articleRepository.query(
      `SELECT a.* FROM articles a
       INNER JOIN article_favorite af ON af.article_id = a.id
       WHERE af.user_id = ? ORDER BY a.created_at DESC`,
      [user.id],
    );

    const articlesWithData = await this.enrichArticles(articles, userId);

    const postsHtml = await this.renderTemplate(res, 'partials/post-preview', {
      articles: articlesWithData,
    });
    const feedNavHtml = await this.renderTemplate(res, 'users/htmx-articles', {
      profile: user,
      activeTab: 'favorites',
    });

    return res.send(feedNavHtml + postsHtml);
  }

  @Post('/:username/follow')
  async follow(
    @Param('username') username: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const profileUser = await this.userRepository.findOne({ where: { username } });
    if (!profileUser) return res.status(404).send('');

    const isNowFollowing = await this.usersService.toggleFollow(userId, profileUser.id);

    return res.render('partials/follow-button', {
      layout: false,
      profile: profileUser,
      isFollowing: isNowFollowing,
      oobSwap: true,
    });
  }

  @Post('/articles/:slug/favorite')
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

    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['user'],
    });
    if (!article) return res.status(404).send('');

    const isNowFavorited = await this.usersService.toggleFavoriteArticle(userId, article.id);
    const favoriteCount = await this.articlesService.getFavoriteCount(article.id);

    return res.render('partials/article-favorite-button', {
      layout: false,
      article: { slug: article.slug, isFavorited: isNowFavorited, favoriteCount },
      oobSwap: true,
    });
  }

  private async enrichArticles(articles: any[], userId: number | null): Promise<any[]> {
    return Promise.all(
      articles.map(async (article: any) => {
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

        let tags = [];
        if (article.id) {
          tags = await this.articleRepository.query(
            `SELECT t.* FROM tags t
             INNER JOIN article_tag at ON at.tag_id = t.id
             WHERE at.article_id = ?`,
            [article.id],
          );
        }

        let user = article.user;
        if (!user && article.user_id) {
          user = await this.userRepository.findOne({ where: { id: article.user_id } });
        }

        return { ...article, user, tags, isFavorited, favoriteCount };
      }),
    );
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
