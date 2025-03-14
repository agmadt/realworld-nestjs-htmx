import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UsersModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
