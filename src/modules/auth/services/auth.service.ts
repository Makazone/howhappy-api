import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { loginInputSchema, registerInputSchema, type LoginInput, type RegisterInput } from '../schema.js';
import { AppError, ConflictError, UnauthorizedError } from '@shared/errors/app-error.js';
import { signUserAccessToken } from '@shared/security/jwt.js';

export interface AuthServiceDeps {
  users?: UserRepository;
  passwordSaltRounds?: number;
}

export interface AuthTokens {
  token: string;
}

export class AuthService {
  private users: UserRepository;
  private saltRounds: number;

  constructor({ users = userRepository, passwordSaltRounds = 12 }: AuthServiceDeps = {}) {
    this.users = users;
    this.saltRounds = passwordSaltRounds;
  }

  async register(input: RegisterInput): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = registerInputSchema.parse(input);
    const existing = await this.users.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await bcrypt.hash(payload.password, this.saltRounds);
    const user = await this.users.create({
      email: payload.email,
      passwordHash,
      displayName: payload.displayName ?? null,
    });

    const token = signUserAccessToken(user.id);
    return { user, tokens: { token } };
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = loginInputSchema.parse(input);
    const user = await this.users.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const matches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signUserAccessToken(user.id);
    return { user, tokens: { token } };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
}

export const authService = new AuthService();
