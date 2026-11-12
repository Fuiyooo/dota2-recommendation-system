import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export const ADMIN_COOKIE = "dota_admin_session";
export const ADMIN_SESSION_HOURS = 8;

export interface AdminSession {
  sub: number;
  username: string;
}

export interface AdminRequest extends Request {
  admin?: AdminSession;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = request.cookies?.[ADMIN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException("Sesi admin tidak ditemukan.");
    }
    try {
      request.admin = await this.jwt.verifyAsync<AdminSession>(token);
      return true;
    } catch {
      throw new UnauthorizedException(
        "Sesi admin tidak valid atau sudah kedaluwarsa.",
      );
    }
  }
}
