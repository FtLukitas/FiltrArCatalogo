import { jwtVerify, SignJWT } from 'jose';

const COOKIE_NAME = 'admin_session';

function getAdminSecret(): Uint8Array {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET variable de entorno no configurada en .env.local');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(username: string): Promise<string> {
  const secret = getAdminSecret();
  return new SignJWT({ user: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = getAdminSecret();
    const { payload } = await jwtVerify(token, secret);
    return Boolean(payload && payload.role === 'admin');
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
