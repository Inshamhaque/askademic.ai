import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

export const signup = async (name: string, email: string, password: string) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id
      }
    });

    return {
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      sessionToken: session.id
    };
  } catch (error: any) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

export const signin = async (email: string, password: string) => {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id
      }
    });

    return {
      message: "Sign in successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      sessionToken: session.id
    };
  } catch (error: any) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }
};

export const signout = async (sessionToken: string) => {
  try {
    if (!sessionToken) {
      throw new Error("Session token is required");
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionToken }
    });

    return {
      message: "Sign out successful"
    };
  } catch (error: any) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
};
