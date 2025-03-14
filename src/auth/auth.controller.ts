import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  UseGuards,
  Session,
  Render,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { GuestGuard } from '../common/guards/guest.guard';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('/sign-in')
  @UseGuards(GuestGuard)
  @Render('auth/sign-in')
  signInPage(@Req() req: Request) {
    return {
      user: null,
      errors: [],
      values: {},
      navbarActive: 'sign-in',
    };
  }

  @Post('/sign-in')
  @UseGuards(GuestGuard)
  async signIn(
    @Body() body: { email: string; password: string },
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const isHtmx = req.headers['hx-request'] === 'true';

    if (!body.email || !body.password) {
      if (isHtmx) {
        res.setHeader('HX-Retarget', '#sign-in-form-messages');
        res.setHeader('HX-Reswap', 'innerHTML show:top');
        return res.render('partials/error-message', {
          layout: 'app-htmx',
          errors: ['Email and password are required.'],
        });
      }
      return res.render('auth/sign-in', {
        layout: 'app',
        user: null,
        errors: ['Email and password are required.'],
        values: body,
        navbarActive: 'sign-in',
      });
    }

    const user = await this.authService.validateUser(body.email, body.password);

    if (!user) {
      if (isHtmx) {
        res.setHeader('HX-Retarget', '#sign-in-form-messages');
        res.setHeader('HX-Reswap', 'innerHTML show:top');
        return res.render('partials/error-message', {
          layout: 'app-htmx',
          errors: ['Invalid email or password.'],
        });
      }
      return res.render('auth/sign-in', {
        layout: 'app',
        user: null,
        errors: ['Invalid email or password.'],
        values: body,
        navbarActive: 'sign-in',
      });
    }

    session.userId = user.id;

    if (isHtmx) {
      res.setHeader('HX-Redirect', '/');
      return res.status(200).send('');
    }
    return res.redirect('/');
  }

  @Post('/logout')
  async logout(@Session() session: Record<string, any>, @Req() req: Request, @Res() res: Response) {
    session.userId = null;
    session.destroy(() => {});

    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      res.setHeader('HX-Redirect', '/');
      return res.status(200).send('');
    }
    return res.redirect('/');
  }

  @Get('/sign-up')
  @UseGuards(GuestGuard)
  @Render('auth/sign-up')
  signUpPage(@Req() req: Request) {
    return {
      user: null,
      errors: [],
      values: {},
      navbarActive: 'sign-up',
    };
  }

  @Post('/sign-up')
  @UseGuards(GuestGuard)
  async signUp(
    @Body() body: { username: string; email: string; password: string },
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const isHtmx = req.headers['hx-request'] === 'true';

    const errors: string[] = [];

    if (!body.username) errors.push('Username is required.');
    if (!body.email) errors.push('Email is required.');
    if (!body.password) errors.push('Password is required.');

    if (body.email) {
      const existingEmail = await this.userRepository.findOne({ where: { email: body.email } });
      if (existingEmail) errors.push('Email already exists.');
    }

    if (body.username) {
      const existingUsername = await this.userRepository.findOne({ where: { username: body.username } });
      if (existingUsername) errors.push('Username already exists.');
    }

    if (errors.length > 0) {
      if (isHtmx) {
        res.setHeader('HX-Retarget', '#sign-up-form-messages');
        res.setHeader('HX-Reswap', 'innerHTML show:top');
        return res.render('partials/error-message', {
          layout: 'app-htmx',
          errors,
        });
      }
      return res.render('auth/sign-up', {
        layout: 'app',
        user: null,
        errors,
        values: body,
        navbarActive: 'sign-up',
      });
    }

    const hashedPassword = bcrypt.hashSync(body.password, 10);

    const user = this.userRepository.create({
      username: body.username,
      email: body.email,
      password: hashedPassword,
      name: body.username,
    });
    await this.userRepository.save(user);

    session.userId = user.id;

    if (isHtmx) {
      res.setHeader('HX-Redirect', '/');
      return res.status(200).send('');
    }
    return res.redirect('/');
  }
}
