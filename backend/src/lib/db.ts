import 'dotenv/config';
import { PrismaClient } from '../../dist/generated/prisma/index.js';

export const prisma = new PrismaClient();
