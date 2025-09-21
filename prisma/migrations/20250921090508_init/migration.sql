-- CreateEnum
CREATE TYPE "public"."SurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UploadState" AS ENUM ('PREPARED', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "public"."SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "registeredUserId" TEXT,
    "anonymousEmail" TEXT,
    "audioUrl" TEXT,
    "uploadState" "public"."UploadState" NOT NULL DEFAULT 'PREPARED',
    "transcription" TEXT,
    "transcriptionStatus" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "analysis" JSONB,
    "analysisStatus" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Survey_ownerId_idx" ON "public"."Survey"("ownerId");

-- CreateIndex
CREATE INDEX "Survey_status_idx" ON "public"."Survey"("status");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "public"."SurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyResponse_registeredUserId_idx" ON "public"."SurveyResponse"("registeredUserId");

-- CreateIndex
CREATE INDEX "SurveyResponse_uploadState_idx" ON "public"."SurveyResponse"("uploadState");

-- CreateIndex
CREATE INDEX "SurveyResponse_transcriptionStatus_idx" ON "public"."SurveyResponse"("transcriptionStatus");

-- CreateIndex
CREATE INDEX "SurveyResponse_analysisStatus_idx" ON "public"."SurveyResponse"("analysisStatus");

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
