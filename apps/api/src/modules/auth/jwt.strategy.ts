import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../../common/current-user.decorator';

export interface JwtPayload {
  sub: string;
  shopId: string;
  role: RequestUser['role'];
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    return {
      userId: payload.sub,
      shopId: payload.shopId,
      role: payload.role,
      email: payload.email,
    };
  }
}
