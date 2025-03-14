import { Controller, Get, Post, Param, Session, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from '../articles/articles.service';
import { UsersService } from '../users/users.service';

@Controller('/htmx/editor')
export class HtmxEditorController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly usersService: UsersService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  async create(@Session() session: Record<string, any>, @Res() res: Response) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const currentUser = await this.usersService.findById(userId);

    return res.render('editor/form', {
      layout: 'app-htmx',
      user: currentUser,
      article: null,
      navbarActive: 'editor',
    });
  }

  @Post()
  async store(
    @Body() body: { title: string; description: string; body: string; tagList: string },
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    if (!body.title) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Title is required.'],
      });
    }
    if (!body.description) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Description is required.'],
      });
    }
    if (!body.body) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Body is required.'],
      });
    }

    let tagListArray: string[] = [];
    try {
      tagListArray = JSON.parse(body.tagList || '[]').map((t: any) => t.value || t);
    } catch (e) {
      tagListArray = (body.tagList || '').split(',').map((t) => t.trim()).filter(Boolean);
    }

    const article = await this.articlesService.createArticle(userId, {
      title: body.title,
      description: body.description,
      body: body.body,
      tagList: tagListArray,
    });

    res.setHeader('HX-Redirect', `/articles/${article.slug}`);
    return res.status(200).send('');
  }

  @Get('/:slug')
  async edit(
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
      relations: ['tags'],
    });

    if (!article) return res.status(404).send('Article not found.');

    const currentUser = await this.usersService.findById(userId);
    const tagList = (article.tags || []).map((t) => t.name).join(', ');

    return res.render('editor/form', {
      layout: 'app-htmx',
      user: currentUser,
      article: { ...article, tagList },
      navbarActive: 'editor',
    });
  }

  @Post('/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() body: { title: string; description: string; body: string; tagList: string },
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    if (!body.title) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Title is required.'],
      });
    }
    if (!body.description) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Description is required.'],
      });
    }
    if (!body.body) {
      res.setHeader('HX-Retarget', '#editor-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: ['Body is required.'],
      });
    }

    let tagListArray: string[] = [];
    try {
      tagListArray = JSON.parse(body.tagList || '[]').map((t: any) => t.value || t);
    } catch (e) {
      tagListArray = (body.tagList || '').split(',').map((t) => t.trim()).filter(Boolean);
    }

    const article = await this.articlesService.updateArticle(slug, userId, {
      title: body.title,
      description: body.description,
      body: body.body,
      tagList: tagListArray,
    });

    res.setHeader('HX-Redirect', `/articles/${article.slug}`);
    return res.status(200).send('');
  }
}
