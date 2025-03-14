import { Controller, Get, Render, Param, Session, UseGuards } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service';
import { UsersService } from '../users/users.service';
import { TagsService } from '../tags/tags.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { User } from '../users/entities/user.entity';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller()
export class HomeController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('/')
  @Render('home/index')
  async index(@Session() session: Record<string, any>) {
    const userId = session.userId || null;
    const currentUser = userId ? await this.usersService.findById(userId) : null;

    const [articles, total] = await this.articlesService.getGlobalFeed(1, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);

    return {
      user: currentUser,
      articles: articlesWithData,
      totalPagination: Math.ceil(total / 10),
      currentPage: 1,
      pageTitle: 'Global Feed',
      tagName: null,
      navbarActive: 'home',
      activeTab: 'global',
    };
  }

  @Get('/your-feed')
  @UseGuards(AuthGuard)
  @Render('home/index')
  async yourFeed(@Session() session: Record<string, any>) {
    const userId = session.userId;
    const currentUser = await this.usersService.findById(userId);
    const [articles, total] = await this.articlesService.getYourFeed(userId!, 1, 10);

    const articlesWithData = await this.enrichArticles(articles, userId!);

    return {
      user: currentUser,
      articles: articlesWithData,
      totalPagination: Math.ceil(total / 10),
      currentPage: 1,
      pageTitle: 'Your Feed',
      tagName: null,
      navbarActive: 'home',
      activeTab: 'your',
    };
  }

  @Get('/tag-feed/:tag')
  @Render('home/index')
  async tagFeed(@Param('tag') tagName: string, @Session() session: Record<string, any>) {
    const userId = session.userId || null;
    const currentUser = userId ? await this.usersService.findById(userId) : null;

    const [articles, total] = await this.articlesService.getTagFeed(tagName, 1, 10);
    const articlesWithData = await this.enrichArticles(articles, userId);

    return {
      user: currentUser,
      articles: articlesWithData,
      totalPagination: Math.ceil(total / 10),
      currentPage: 1,
      pageTitle: `#${tagName}`,
      tagName,
      navbarActive: 'home',
      activeTab: 'tag',
    };
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
}
