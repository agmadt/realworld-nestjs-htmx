import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class GuestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;

    if (userId) {
      const response = context.switchToHttp().getResponse<Response>();
      const isHtmx = request.headers['hx-request'] === 'true';

      if (isHtmx) {
        response.setHeader('HX-Redirect', '/');
        response.status(401).send('');
      } else {
        response.redirect('/');
      }
      return false;
    }

    return true;
  }
}
