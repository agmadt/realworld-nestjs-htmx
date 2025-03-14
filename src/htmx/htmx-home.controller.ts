import { Controller, Get, Post, Param, Session, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from '../articles/articles.service';
import { UsersService } from '../users/users.service';
import { TagsService } from '../tags/tags.service';

@Controller('/htmx/home')
export class HtmxHomeController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  async index(@Session() session: Record<string, any>, @Res() res: Response) {
    const userId = session.userId || null;
    const currentUser = userId ? await this.usersService.findById(userId) : null;

    const [articles, total] = await this.articlesService.getGlobalFeed(1, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);
    const tags = await this.tagsService.getPopularTags(5);

    return res.render('home/index', {
      layout: 'app-htmx',
      user: currentUser,
      articles: articlesWithData,
      totalPagination: Math.ceil(total / 10),
      currentPage: 1,
      pageTitle: 'Global Feed',
      tagName: null,
      tags,
      navbarActive: 'home',
      activeTab: 'global',
    });
  }

  @Get('/global-feed')
  async globalFeed(
    @Session() session: Record<string, any>,
    @Query('page') page: string,
    @Res() res: Response,
  ) {
    const pageNum = parseInt(page) || 1;
    const userId = session.userId || null;

    const [articles, total] = await this.articlesService.getGlobalFeed(pageNum, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);

    const html = await this.renderTemplate(res, 'partials/post-preview', { articles: articlesWithData });
    const pagination = await this.renderTemplate(res, 'partials/pagination', {
      totalPagination: Math.ceil(total / 10),
      currentPage: pageNum,
      hxGet: '/htmx/home/global-feed',
    });
    const feedNav = await this.renderTemplate(res, 'partials/feed-navigation', {
      activeTab: 'global',
      tagName: null,
    });
    const head = await this.renderTemplate(res, 'partials/head', {
      pageTitle: 'Global Feed',
    });

    return res.send(html + feedNav + pagination + head);
  }

  @Get('/your-feed')
  async yourFeed(
    @Session() session: Record<string, any>,
    @Query('page') page: string,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const pageNum = parseInt(page) || 1;
    const [articles, total] = await this.articlesService.getYourFeed(userId, pageNum, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);

    const html = await this.renderTemplate(res, 'partials/post-preview', { articles: articlesWithData });
    const pagination = await this.renderTemplate(res, 'partials/pagination', {
      totalPagination: Math.ceil(total / 10),
      currentPage: pageNum,
      hxGet: '/htmx/home/your-feed',
    });
    const feedNav = await this.renderTemplate(res, 'partials/feed-navigation', {
      activeTab: 'your',
      tagName: null,
    });
    const head = await this.renderTemplate(res, 'partials/head', {
      pageTitle: 'Your Feed',
    });

    return res.send(html + feedNav + pagination + head);
  }

  @Get('/tag-feed/:tag')
  async tagFeed(
    @Param('tag') tagName: string,
    @Session() session: Record<string, any>,
    @Query('page') page: string,
    @Res() res: Response,
  ) {
    const pageNum = parseInt(page) || 1;
    const userId = session.userId || null;

    const [articles, total] = await this.articlesService.getTagFeed(tagName, pageNum, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);

    const html = await this.renderTemplate(res, 'partials/post-preview', { articles: articlesWithData });
    const pagination = await this.renderTemplate(res, 'partials/pagination', {
      totalPagination: Math.ceil(total / 10),
      currentPage: pageNum,
      hxGet: `/htmx/home/tag-feed/${tagName}`,
    });
    const feedNav = await this.renderTemplate(res, 'partials/feed-navigation', {
      activeTab: 'tag',
      tagName,
    });
    const head = await this.renderTemplate(res, 'partials/head', {
      pageTitle: `#${tagName}`,
    });

    return res.send(html + feedNav + pagination + head);
  }

  @Get('/tag-list')
  async tagList(@Res() res: Response) {
    const tags = await this.tagsService.getPopularTags(5);
    return res.render('partials/tag-item-list', {
      layout: 'app-htmx',
      tags,
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

    const article = await this.articleRepository.findOne({ where: { slug } });
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
