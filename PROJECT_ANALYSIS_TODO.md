# Meeting App Analysis And TODO

## Scope Verified

- Repository currently contains an Express + Prisma backend with LiveKit server SDK integration.
- Current checked out branch is `feature/record`.
- Available branches already present in git:
  - `feature/authentication`
  - `feature/meetings`
  - `feature/record`
  - `feature/ss`
  - `dev`
  - `main`
- The current workspace does not contain a visible Next.js App Router frontend. If it exists, it is not in this repository snapshot.
- LiveKit-related backend modules found:
  - `src/helpers/livekitToken.ts`
  - `src/helpers/s3.ts`
  - `src/app/modules/Meetings/*`
  - `src/app/modules/ScreenShare/*`
  - `src/app/modules/Record/*`

## High Priority Findings

### 1. Build is currently broken

- `npm run build` fails immediately.
- Root cause: syntax error in `src/helpers/s3.ts`.
- The exported `roomServiceClient` property is malformed as `roomServiceCli  ent`.
- This means the recording flow cannot be trusted at runtime until the helper is fixed.

### 2. Recording service is out of sync with the Prisma schema

- Prisma `Recording` model contains `s3_key`.
- `src/app/modules/Record/record.service.ts` writes `file_path`, which does not exist in the schema.
- The service later reads `recording.s3_key`, so start and download/delete flows disagree on storage shape.
- This is a hard functional bug, not just cleanup.

### 3. No dedicated production-safe LiveKit join/token API contract

- Token generation exists only as an internal helper in `src/helpers/livekitToken.ts`.
- There is no standalone token route for secure refresh/rejoin/reconnect handling.
- Join flow mixes participant creation, waiting room state, and token issuance in one service method.
- There is no explicit API for reconnect token refresh after token expiry or transport reconnect.

### 4. Meeting join/leave lifecycle is incomplete

- There is no leave endpoint for participants.
- There is no disconnect cleanup endpoint or webhook handler for LiveKit room events.
- There is no reconnect handling path.
- `joined_at` and `left_at` are not consistently maintained across all flows.
- Room state can easily drift from actual LiveKit presence.

### 5. Screen share backend state is not authoritative

- `ScreenShare` Prisma model exists, but `src/app/modules/ScreenShare/screenShare.service.ts` does not use it.
- Screen sharing is tracked only by `meetingParticipant.is_screen_sharing`.
- No mechanism guarantees only one active screen share per meeting.
- No pending approval state exists, even though `screenshare_needs_approval` exists in `Meeting`.
- No cleanup is tied to disconnect, leave, or room termination.

### 6. Validation layer is mostly missing

- `src/app/modules/Auth/auth.validation.ts` is empty.
- `src/app/modules/Meetings/meetings.validation.ts` is empty.
- `src/app/modules/Record/record.validation.ts` is empty.
- `src/app/modules/ScreenShare/screenShare.validation.ts` is empty.
- Several routes have `validateRequest(...)` commented out.
- Input validation is currently not production-safe.

## Meeting Module Findings

### Functional bugs

- `denyParticipant` and `kickParticipant` are implemented incorrectly.
- Controllers read only `code`, not a target participant identifier.
- Services use `currentUserId` when looking up the participant to deny/kick.
- Result: host actions target the host entry instead of the intended participant.

### Missing business rules

- No `max_participants` enforcement during join.
- No guard against joining ended meetings.
- No guard against rejoining after `denied`.
- No clear rejoin policy for participants whose status is `left`.
- No room password verification even though `password_hash` exists in schema.
- No explicit host/cohost permission helper, so authorization logic is repeated and inconsistent.

### LiveKit consistency gaps

- `createMeetings` does not create a LiveKit room.
- `getMeetingByJoinCode` may return token for host or immediate join for guests when waiting room is off, but it does not persist `joined_at` for those successful direct joins.
- `status` is not updated to `active` when the room actually starts.
- `endMeeting` updates DB state only and does not terminate or clean the LiveKit room.
- `livekit_token` is stored in DB but there is no lifecycle strategy for expiry, refresh, or invalidation.

### API consistency issues

- Controllers mix `sendResponse(...)` with manual `res.status(...).json(...)`.
- Most controller methods manually wrap `try/catch` even though `catchAsync` already exists.
- Error status codes collapse to `500` for expected business errors.

## Screen Share Findings

### Functional gaps

- Starting screen share does not ensure there is only one active sharer per meeting.
- Approval flow sets `is_screen_sharing` directly, but there is no request state to approve.
- `getScreenShareStatus` returns all current sharers, which reveals multi-share is possible even if product intent is single-share.
- There is no host auto-stop of a previous sharer when a new sharer starts.

### Architecture gaps

- `ScreenShare` table is unused, so an intended normalized state model is currently dead code.
- No event/webhook path syncs DB state with actual LiveKit track publication/unpublication.
- No handling for browser tab stop, track ended, or user disconnect beyond manual API calls.

## Recording Module Findings

### Functional bugs

- `src/helpers/s3.ts` compile failure blocks the helper import.
- `record.service.ts` imports unused or mismatched LiveKit types.
- `startRecording` stores `file_path`, but schema expects `s3_key`.
- `getDownloadUrl` uses hardcoded `http://localhost:5000/...`, which is not production-safe.
- `deleteRecording` deletes `recording.s3_key` as if it were a local file path, which conflicts with the `s3_key` field name.

### LiveKit recording gaps

- Recording is not bound to a LiveKit room SID, only to meeting DB ID.
- No egress status webhook or polling exists.
- No transition handling for failed egress jobs.
- `duration_seconds` is never populated.
- `transcript_url` is unused.
- No guarantee the LiveKit room actually has participants before recording starts.

### Storage gaps

- The helper name `s3.ts` suggests cloud storage, but the implementation currently attempts local file output.
- Static file serving exists at `/recordings`, but DB contract still refers to `s3_key`.
- Storage strategy is inconsistent across schema, service, and route behavior.

## Auth And Shared Infrastructure Findings

### Auth issues that affect the meeting system

- `generateToken` ignores the passed `expiresIn` argument and always uses `30d`.
- `logout` controller exists, but no logout route is registered.
- Meeting/auth APIs rely on `req.user`, but there is no central role/permission helper for host/cohost checks.

### Shared response/error issues

- `sendResponse` includes `statusCode` in the JSON body, which is okay if intentional, but not all routes use it consistently.
- Global error handler format does not match the requested API contract exactly.
- Standard target contract should be:

```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```

- Current error responses may include `errorSources`, `stack`, and other shapes depending on code path.

## Testing Findings

- No automated test suite is present in `package.json`.
- No API integration test framework is configured.
- No verification scripts exist for:
  - token generation
  - join flow
  - waiting room admit flow
  - screen share lifecycle
  - recording start/stop lifecycle

## Branching Recommendation Before Implementation

- `feature/api-fix`
  - Fix helper/build issues
  - Standardize API responses and validation
  - Add token/join/leave/reconnect/webhook APIs
- `feature/meeting-fix`
  - Fix participant lifecycle, duplicate joins, waiting room, host actions
- `feature/ss`
  - Normalize screen share state and enforce single active sharer
- `feature/record`
  - Fix recording schema/service mismatches and egress lifecycle

## Completed Analysis Checklist

- [x] Scanned project structure
- [x] Confirmed active branch and available feature branches
- [x] Inspected Prisma schema and migrations
- [x] Inspected meeting routes/controllers/services
- [x] Inspected screen share routes/controllers/services
- [x] Inspected recording routes/controllers/services
- [x] Inspected auth middleware and shared helpers
- [x] Ran TypeScript build to detect compile-level failures
- [x] Identified missing APIs and broken LiveKit-related flows

## TODO For Implementation

### Branch: `feature/api-fix`

- [ ] Fix `src/helpers/s3.ts` syntax and naming.
- [ ] Create shared API response helper contract for success and error shapes.
- [ ] Add zod schemas for auth, meetings, screen share, and recording APIs.
- [ ] Wire `validateRequest(...)` into routes.
- [ ] Add dedicated LiveKit token endpoint for join/rejoin/reconnect.
- [ ] Add participant leave endpoint.
- [ ] Add LiveKit webhook endpoint for participant disconnect and room state sync.
- [ ] Add shared permission helpers for host/cohost actions.

### Branch: `feature/meeting-fix`

- [ ] Fix deny/kick participant APIs to target the correct participant.
- [ ] Enforce `max_participants`.
- [ ] Block join on ended meetings.
- [ ] Define rejoin behavior for `left` and `denied` users.
- [ ] Persist `joined_at` and `left_at` consistently.
- [ ] Mark meeting `active` when first participant joins or host starts.
- [ ] End LiveKit room when meeting ends.
- [ ] Prevent duplicate participant state drift.

### Branch: `feature/ss`

- [ ] Use `ScreenShare` model or remove it in favor of one clear source of truth.
- [ ] Enforce one active screen share per meeting.
- [ ] Add screen share request/pending/approved/denied state flow.
- [ ] Stop active screen share on leave/disconnect/webhook sync.
- [ ] Return authoritative screen share status API for frontend polling or subscription.

### Branch: `feature/record`

- [ ] Align Prisma schema and recording service field names.
- [ ] Decide storage mode: local disk or S3.
- [ ] Bind recording session to LiveKit room identity/SID.
- [ ] Track egress state transitions.
- [ ] Add failure handling and retry-safe stop logic.
- [ ] Generate production-safe download URLs.
- [ ] Populate `duration_seconds` and finalize recording metadata.

### Testing

- [ ] Add API test tooling.
- [ ] Add tests for token generation.
- [ ] Add tests for join/admit/leave flows.
- [ ] Add tests for screen share start/stop/approval flows.
- [ ] Add tests for recording start/stop/download flows.

## Notes

- The attached PDF can be used as behavior/reference guidance, but the current codebase needs concrete backend stabilization first.
- Because the current repo is already on `feature/record`, I have not created or switched branches during analysis-only work.
- Next implementation step should be to start on `feature/api-fix`, because build failure and API contract drift currently block every other feature area.
