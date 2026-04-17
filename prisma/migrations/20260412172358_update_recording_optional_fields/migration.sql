-- AlterTable
ALTER TABLE "recordings" ALTER COLUMN "transcript_url" DROP NOT NULL,
ALTER COLUMN "duration_seconds" DROP NOT NULL;
