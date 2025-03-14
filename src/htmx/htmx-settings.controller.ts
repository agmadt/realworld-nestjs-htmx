import { Controller, Get, Post, Body, Session, Res } from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../users/users.service';

@Controller('/htmx/settings')
export class HtmxSettingsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async index(@Session() session: Record<string, any>, @Res() res: Response) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const currentUser = await this.usersService.findById(userId);

    return res.render('settings/index', {
      layout: 'app-htmx',
      user: currentUser,
      navbarActive: 'settings',
      errors: {},
      success: null,
    });
  }

  @Post()
  async update(
    @Body() body: { name: string; email: string; bio: string; image: string; password: string },
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const userId = session.userId;
    if (!userId) {
      res.setHeader('HX-Redirect', '/sign-in');
      return res.status(401).send('');
    }

    const currentUser = await this.usersService.findById(userId);
    if (!currentUser) return res.status(404).send('');

    try {
      await this.usersService.updateUser(userId, {
        name: body.name || undefined,
        email: body.email || undefined,
        bio: body.bio || undefined,
        image: body.image || undefined,
        password: body.password || undefined,
      });

      const updatedUser = await this.usersService.findById(userId);

      res.setHeader('HX-Retarget', '#settings-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/form-message', {
        layout: 'app-htmx',
        success: 'Settings updated successfully.',
      });
    } catch (error: any) {
      res.setHeader('HX-Retarget', '#settings-form-messages');
      res.setHeader('HX-Reswap', 'innerHTML show:top');
      return res.render('partials/error-message', {
        layout: 'app-htmx',
        errors: [error.message || 'Failed to update settings.'],
      });
    }
  }
}
