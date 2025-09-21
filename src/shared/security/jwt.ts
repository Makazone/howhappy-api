import jwt from 'jsonwebtoken';
import { getEnv } from '@shared/config/env.js';
import { UnauthorizedError } from '@shared/errors/app-error.js';

const USER_TOKEN_TYPE = 'user';
const RESPONSE_TOKEN_TYPE = 'response';

export interface UserTokenPayload {
  tokenType: typeof USER_TOKEN_TYPE;
  sub: string;
}

export interface ResponseTokenPayload {
  tokenType: typeof RESPONSE_TOKEN_TYPE;
  responseId: string;
  surveyId: string;
}

export type AnyTokenPayload = UserTokenPayload | ResponseTokenPayload;

function getSecret(): string {
  const env = getEnv();
  return env.JWT_SECRET;
}

export function signUserAccessToken(userId: string): string {
  return jwt.sign(
    {
      tokenType: USER_TOKEN_TYPE,
    },
    getSecret(),
    {
      subject: userId,
      expiresIn: '1h',
    },
  );
}

export function signResponseToken(payload: { responseId: string; surveyId: string }): string {
  return jwt.sign(
    {
      tokenType: RESPONSE_TOKEN_TYPE,
      responseId: payload.responseId,
      surveyId: payload.surveyId,
    },
    getSecret(),
    {
      expiresIn: '15m',
    },
  );
}

export function verifyToken<T extends AnyTokenPayload = AnyTokenPayload>(token: string): T {
  try {
    const decoded = jwt.verify(token, getSecret());
    return decoded as T;
  } catch {
    throw new UnauthorizedError('Invalid token');
  }
}

export function isUserToken(payload: AnyTokenPayload): payload is UserTokenPayload {
  return payload.tokenType === USER_TOKEN_TYPE;
}

export function isResponseToken(payload: AnyTokenPayload): payload is ResponseTokenPayload {
  return payload.tokenType === RESPONSE_TOKEN_TYPE;
}
