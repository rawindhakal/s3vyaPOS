import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface RequestUser {
  userId: string;
  shopId: string;
  role: Role;
  email: string;
}

// Pulls the authenticated user (set by JwtStrategy) off the request.
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as RequestUser;
    return data ? user[data] : user;
  },
);
