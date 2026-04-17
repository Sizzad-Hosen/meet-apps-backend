-- Performance indexes for hot meeting/poll queries
CREATE INDEX IF NOT EXISTS "meetings_host_id_status_idx" ON "meetings"("host_id", "status");
CREATE INDEX IF NOT EXISTS "meetings_status_created_at_idx" ON "meetings"("status", "created_at");

CREATE INDEX IF NOT EXISTS "meeting_participants_meeting_id_status_idx" ON "meeting_participants"("meeting_id", "status");
CREATE INDEX IF NOT EXISTS "meeting_participants_user_id_meeting_id_idx" ON "meeting_participants"("user_id", "meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_participants_breakout_room_id_idx" ON "meeting_participants"("breakout_room_id");

CREATE INDEX IF NOT EXISTS "breakout_rooms_meeting_id_status_idx" ON "breakout_rooms"("meeting_id", "status");
CREATE INDEX IF NOT EXISTS "breakout_messages_meeting_id_created_at_idx" ON "breakout_messages"("meeting_id", "created_at");
CREATE INDEX IF NOT EXISTS "breakout_messages_breakout_room_id_created_at_idx" ON "breakout_messages"("breakout_room_id", "created_at");

CREATE INDEX IF NOT EXISTS "polls_meeting_id_created_at_idx" ON "polls"("meeting_id", "created_at");
CREATE INDEX IF NOT EXISTS "poll_options_poll_id_idx" ON "poll_options"("poll_id");
CREATE INDEX IF NOT EXISTS "poll_votes_option_id_idx" ON "poll_votes"("option_id");
