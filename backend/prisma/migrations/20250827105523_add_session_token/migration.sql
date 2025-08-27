/*
  Initial schema creation (safe, idempotent where possible) to fix missing base tables.
*/

-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create User table
CREATE TABLE IF NOT EXISTS "public"."User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Create Session table
CREATE TABLE IF NOT EXISTS "public"."Session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" TEXT NOT NULL UNIQUE,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create AgentRun table
CREATE TABLE IF NOT EXISTS "public"."AgentRun" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "AgentRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "public"."Session" ("userId");
CREATE INDEX IF NOT EXISTS "AgentRun_sessionId_idx" ON "public"."AgentRun" ("sessionId");
