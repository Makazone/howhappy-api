-- AlterTable
ALTER TABLE "public"."Survey" ADD COLUMN     "insightSummary" TEXT,
ADD COLUMN     "submits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."SurveyResponse" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "segments" JSONB;
