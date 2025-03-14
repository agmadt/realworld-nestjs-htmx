import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const result = await this.userRepository.query(
      'SELECT 1 FROM user_follower WHERE user_id = ? AND follower_id = ?',
      [followingId, followerId],
    );
    return result.length > 0;
  }

  async toggleFollow(followerId: number, followingId: number): Promise<boolean> {
    const isFollowing = await this.isFollowing(followerId, followingId);

    if (isFollowing) {
      await this.userRepository.query(
        'DELETE FROM user_follower WHERE user_id = ? AND follower_id = ?',
        [followingId, followerId],
      );
      return false;
    } else {
      await this.userRepository.query(
        'INSERT INTO user_follower (user_id, follower_id) VALUES (?, ?)',
        [followingId, followerId],
      );
      return true;
    }
  }

  async getFollowerCount(userId: number): Promise<number> {
    const result = await this.userRepository.query(
      'SELECT COUNT(*) as count FROM user_follower WHERE user_id = ?',
      [userId],
    );
    return result[0]?.count || 0;
  }

  async isFavoritedArticle(userId: number, articleId: number): Promise<boolean> {
    const result = await this.userRepository.query(
      'SELECT 1 FROM article_favorite WHERE article_id = ? AND user_id = ?',
      [articleId, userId],
    );
    return result.length > 0;
  }

  async toggleFavoriteArticle(userId: number, articleId: number): Promise<boolean> {
    const isFav = await this.isFavoritedArticle(userId, articleId);

    if (isFav) {
      await this.userRepository.query(
        'DELETE FROM article_favorite WHERE article_id = ? AND user_id = ?',
        [articleId, userId],
      );
      return false;
    } else {
      await this.userRepository.query(
        'INSERT INTO article_favorite (article_id, user_id) VALUES (?, ?)',
        [articleId, userId],
      );
      return true;
    }
  }

  async updateUser(
    userId: number,
    data: { name?: string; email?: string; bio?: string; image?: string; password?: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.image !== undefined) user.image = data.image;

    if (data.password) {
      const bcrypt = require('bcryptjs');
      user.password = bcrypt.hashSync(data.password, 10);
    }

    return this.userRepository.save(user);
  }
}
