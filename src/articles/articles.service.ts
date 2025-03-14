import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { Comment } from './entities/comment.entity';
import { Tag } from '../tags/entities/tag.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async findBySlug(slug: string): Promise<Article | null> {
    return this.articleRepository.findOne({
      where: { slug },
      relations: ['user', 'tags'],
    });
  }

  async getGlobalFeed(page: number = 1, limit: number = 10): Promise<[Article[], number]> {
    const [articles, total] = await this.articleRepository.findAndCount({
      relations: ['user', 'tags'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return [articles, total];
  }

  async getYourFeed(userId: number, page: number = 1, limit: number = 10): Promise<[Article[], number]> {
    const result = await this.articleRepository.query(
      `SELECT DISTINCT a.* FROM articles a
       INNER JOIN user_follower uf ON uf.user_id = a.user_id
       WHERE uf.follower_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, (page - 1) * limit],
    );

    const countResult = await this.articleRepository.query(
      `SELECT COUNT(DISTINCT a.id) as count FROM articles a
       INNER JOIN user_follower uf ON uf.user_id = a.user_id
       WHERE uf.follower_id = ?`,
      [userId],
    );

    const total = countResult[0]?.count || 0;

    return [result, total];
  }

  async getTagFeed(tagName: string, page: number = 1, limit: number = 10): Promise<[Article[], number]> {
    const result = await this.articleRepository.query(
      `SELECT DISTINCT a.* FROM articles a
       INNER JOIN article_tag at ON at.article_id = a.id
       INNER JOIN tags t ON t.id = at.tag_id
       WHERE t.name = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [tagName, limit, (page - 1) * limit],
    );

    const countResult = await this.articleRepository.query(
      `SELECT COUNT(DISTINCT a.id) as count FROM articles a
       INNER JOIN article_tag at ON at.article_id = a.id
       INNER JOIN tags t ON t.id = at.tag_id
       WHERE t.name = ?`,
      [tagName],
    );

    const total = countResult[0]?.count || 0;

    return [result, total];
  }

  async getFavoriteCount(articleId: number): Promise<number> {
    const result = await this.articleRepository.query(
      'SELECT COUNT(*) as count FROM article_favorite WHERE article_id = ?',
      [articleId],
    );
    return result[0]?.count || 0;
  }

  async getComments(articleId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { article_id: articleId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async createComment(articleId: number, userId: number, body: string): Promise<Comment> {
    const comment = this.commentRepository.create({
      article_id: articleId,
      user_id: userId,
      body,
    });
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.commentRepository.delete(commentId);
  }

  async createArticle(
    userId: number,
    data: { title: string; description: string; body: string; tagList: string[] },
  ): Promise<Article> {
    const slug = this.slugify(data.title) + '-' + Math.random().toString(36).substring(2, 8);

    const article = this.articleRepository.create({
      user_id: userId,
      slug,
      title: data.title,
      description: data.description,
      body: data.body,
    });

    const savedArticle = await this.articleRepository.save(article);

    if (data.tagList && data.tagList.length > 0) {
      for (const tagName of data.tagList) {
        let tag = await this.tagRepository.findOne({ where: { name: tagName.trim() } });
        if (!tag) {
          tag = this.tagRepository.create({ name: tagName.trim() });
          tag = await this.tagRepository.save(tag);
        }
        await this.articleRepository.query(
          'INSERT INTO article_tag (article_id, tag_id) VALUES (?, ?)',
          [savedArticle.id, tag.id],
        );
      }
    }

    return savedArticle;
  }

  async updateArticle(
    slug: string,
    userId: number,
    data: { title?: string; description?: string; body?: string; tagList?: string[] },
  ): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { slug, user_id: userId } });
    if (!article) throw new Error('Article not found');

    if (data.title !== undefined) {
      article.title = data.title;
      article.slug = this.slugify(data.title) + '-' + Math.random().toString(36).substring(2, 8);
    }
    if (data.description !== undefined) article.description = data.description;
    if (data.body !== undefined) article.body = data.body;

    const savedArticle = await this.articleRepository.save(article);

    if (data.tagList !== undefined) {
      await this.articleRepository.query(
        'DELETE FROM article_tag WHERE article_id = ?',
        [savedArticle.id],
      );

      for (const tagName of data.tagList) {
        let tag = await this.tagRepository.findOne({ where: { name: tagName.trim() } });
        if (!tag) {
          tag = this.tagRepository.create({ name: tagName.trim() });
          tag = await this.tagRepository.save(tag);
        }
        await this.articleRepository.query(
          'INSERT INTO article_tag (article_id, tag_id) VALUES (?, ?)',
          [savedArticle.id, tag.id],
        );
      }
    }

    return savedArticle;
  }

  async deleteArticle(slug: string, userId: number): Promise<boolean> {
    const article = await this.articleRepository.findOne({ where: { slug, user_id: userId } });
    if (!article) return false;

    await this.articleRepository.remove(article);
    return true;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
}
