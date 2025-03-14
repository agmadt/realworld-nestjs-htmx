import { Controller, Get, Param, Render, Session, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller()
export class EditorController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  @Get('/editor')
  @UseGuards(AuthGuard)
  @Render('editor/form')
  async create(@Session() session: Record<string, any>) {
    const userId = session.userId;
    const user = await this.usersService.findById(userId);
    return {
      user,
      article: null,
      navbarActive: 'editor',
    };
  }

  @Get('/editor/:slug')
  @UseGuards(AuthGuard)
  @Render('editor/form')
  async edit(@Param('slug') slug: string, @Session() session: Record<string, any>) {
    const userId = session.userId;
    const user = await this.usersService.findById(userId);

    const article = await this.articleRepository.findOne({
      where: { slug, user_id: userId },
      relations: ['tags'],
    });

    if (!article) throw new Error('Article not found');

    const tagList = (article.tags || []).map((t) => t.name).join(', ');

    return {
      user,
      article: { ...article, tagList },
      navbarActive: 'editor',
    };
  }
}
