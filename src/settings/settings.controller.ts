import { Controller, Get, Render, Session, UseGuards } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller()
export class SettingsController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/settings')
  @UseGuards(AuthGuard)
  @Render('settings/index')
  async index(@Session() session: Record<string, any>) {
    const userId = session.userId;
    const user = await this.usersService.findById(userId);
    return {
      user,
      navbarActive: 'settings',
      errors: {},
      success: null,
    };
  }
}
