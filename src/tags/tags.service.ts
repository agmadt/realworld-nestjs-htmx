import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const result = await this.tagRepository.query(
      `SELECT t.*, COUNT(at.tag_id) as articleCount
       FROM tags t
       INNER JOIN article_tag at ON at.tag_id = t.id
       GROUP BY t.id
       ORDER BY articleCount DESC
       LIMIT ?`,
      [limit],
    );

    return result;
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find();
  }

  async findByName(name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({ where: { name } });
  }
}
