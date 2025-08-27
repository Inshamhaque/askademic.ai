import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';

interface SignupData {
  name: string;
  email: string;
  password: string;
}

interface SigninData {
  email: string;
  password: string;
}

interface AuthResult {
  error?: string;
  sessionToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const signup = async (data: SignupData): Promise<AuthResult> => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return { error: 'User with this email already exists' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashedPassword }
    });

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      sessionToken: session.token,
      user: { id: user.id, name: user.name ?? '', email: user.email }
    };
  } catch (error: any) {
    console.error('Signup service error:', error);
    return { error: error?.message || 'Failed to create user' };
  }
};

export const signin = async (data: SigninData): Promise<AuthResult> => {
  try {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password' };
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      sessionToken: session.token,
      user: { id: user.id, name: user.name ?? '', email: user.email }
    };
  } catch (error: any) {
    console.error('Signin service error:', error);
    return { error: error?.message || 'Failed to authenticate user' };
  }
};

export const signout = async (sessionToken: string): Promise<void> => {
  try {
    await prisma.session.delete({ where: { token: sessionToken } });
  } catch (error) {
    console.error('Signout service error:', error);
    throw new Error('Failed to sign out');
  }
};

export const validateSession = async (sessionToken: string): Promise<{ userId: string; user: any } | null> => {
  try {
    const session = await prisma.session.findUnique({ where: { token: sessionToken }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return {
      userId: session.userId,
      user: { id: session.user.id, name: session.user.name ?? '', email: session.user.email }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
};
