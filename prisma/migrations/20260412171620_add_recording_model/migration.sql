-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('recording', 'completed', 'failed');

-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "egress_id" TEXT NOT NULL,
    "s3_key" TEXT,
    "transcript_url" TEXT,
    "status" "RecordingStatus" NOT NULL DEFAULT 'recording',
    "duration_seconds" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recordings"
ADD CONSTRAINT "recordings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "recordings_meeting_id_idx" ON "recordings"("meeting_id");
CREATE INDEX "recordings_egress_id_idx" ON "recordings"("egress_id");
CREATE INDEX "recordings_status_idx" ON "recordings"("status");