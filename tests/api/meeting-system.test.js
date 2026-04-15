const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.LIVEKIT_API_KEY = 'lk_test_key';
process.env.LIVEKIT_API_SECRET = 'lk_test_secret';
process.env.LIVEKIT_URL = 'http://localhost:7880';
process.env.PORT = '5000';
process.env.APP_BASE_URL = 'http://localhost:5000';

const prisma = require('../../dist/src/lib/prisma').default;
const { clientes } = require('../../dist/src/helpers/s3');
const app = require('../../dist/src/app').default;

const hostUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Host User',
  email: 'host@example.com',
  role: 'USER',
  avatarUrl: null,
};

const guestUser = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Guest User',
  email: 'guest@example.com',
  role: 'USER',
  avatarUrl: null,
};

const state = {
  users: [hostUser, guestUser],
  meetings: [],
  participants: [],
  screenShares: [],
  recordings: [],
  egressCounter: 0,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeId = (_prefix, list) => `00000000-0000-4000-8000-${String(list.length + 1).padStart(12, '0')}`;

const attachMeetingInclude = (meeting, include) => {
  if (!meeting) {
    return null;
  }

  const result = { ...meeting };

  if (include?.meetingParticipants) {
    const includeUser = include.meetingParticipants.include?.user;
    result.meetingParticipants = state.participants
      .filter((participant) => participant.meeting_id === meeting.id)
      .map((participant) => {
        const participantResult = { ...participant };
        if (includeUser) {
          const user = state.users.find((candidate) => candidate.id === participant.user_id);
          participantResult.user = user
            ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
            : null;
        }
        return participantResult;
      });
  }

  if (include?.screenShares) {
    result.screenShares = state.screenShares
      .filter((screenShare) => screenShare.meeting_id === meeting.id)
      .map((screenShare) => ({
        ...screenShare,
        user: state.users.find((candidate) => candidate.id === screenShare.user_id) || null,
      }));
  }

  return result;
};

const matchesWhere = (item, where = {}) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if ('not' in value) {
      return item[key] !== value.not;
    }
    return matchesWhere(item[key], value);
  }

  return item[key] === value;
});

prisma.user.findUnique = async ({ where }) => {
  if (where.id) {
    return clone(state.users.find((user) => user.id === where.id) || null);
  }

  if (where.email) {
    return clone(state.users.find((user) => user.email === where.email) || null);
  }

  return null;
};

prisma.meeting.findUnique = async ({ where, include, select } = {}) => {
  const meeting = state.meetings.find((candidate) => (
    (where?.id && candidate.id === where.id) ||
    (where?.join_code && candidate.join_code === where.join_code) ||
    (where?.livekit_room_name && candidate.livekit_room_name === where.livekit_room_name)
  )) || null;

  if (!meeting) {
    return null;
  }

  if (select?.id) {
    return { id: meeting.id };
  }

  return clone(attachMeetingInclude(meeting, include));
};

prisma.meeting.create = async ({ data }) => {
  const meeting = {
    id: makeId('meeting', state.meetings),
    title: data.title,
    join_code: data.join_code,
    host_id: data.host_id,
    livekit_room_name: data.livekit_room_name,
    status: 'waiting',
    type: data.type,
    scheduled_at: data.scheduled_at || null,
    started_at: null,
    ended_at: null,
    waiting_room_on: data.waiting_room_on,
    password_hash: null,
    max_participants: data.max_participants,
    allow_screenshare: data.allow_screenshare,
    screenshare_needs_approval: data.screenshare_needs_approval,
    is_recorded: data.is_recorded,
    created_at: new Date().toISOString(),
  };

  state.meetings.push(meeting);
  return clone(meeting);
};

prisma.meeting.update = async ({ where, data }) => {
  const meeting = state.meetings.find((candidate) => candidate.id === where.id || candidate.join_code === where.join_code);
  Object.assign(meeting, data);
  return clone(meeting);
};

prisma.meeting.delete = async ({ where }) => {
  const index = state.meetings.findIndex((candidate) => candidate.id === where.id || candidate.join_code === where.join_code);
  const [deleted] = state.meetings.splice(index, 1);
  return clone(deleted);
};

prisma.meetingParticipant.findFirst = async ({ where } = {}) => clone(
  state.participants.find((participant) => matchesWhere(participant, where)) || null
);

prisma.meetingParticipant.findMany = async ({ where, include } = {}) => clone(
  state.participants
    .filter((participant) => matchesWhere(participant, where))
    .map((participant) => {
      if (!include?.user) {
        return participant;
      }

      const user = state.users.find((candidate) => candidate.id === participant.user_id);
      return {
        ...participant,
        user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
      };
    })
);

prisma.meetingParticipant.count = async ({ where } = {}) => (
  state.participants.filter((participant) => matchesWhere(participant, where)).length
);

prisma.meetingParticipant.create = async ({ data }) => {
  const participant = {
    id: makeId('participant', state.participants),
    meeting_id: data.meeting_id,
    user_id: data.user_id,
    role: data.role || 'guest',
    status: data.status || 'waiting',
    livekit_token: data.livekit_token || null,
    is_muted: data.is_muted || false,
    is_video_off: false,
    is_screen_sharing: data.is_screen_sharing || false,
    hand_raised: false,
    joined_at: data.joined_at || null,
    left_at: data.left_at || null,
  };

  state.participants.push(participant);
  return clone(participant);
};

prisma.meetingParticipant.update = async ({ where, data }) => {
  const participant = state.participants.find((candidate) => candidate.id === where.id);
  Object.assign(participant, data);
  return clone(participant);
};

prisma.meetingParticipant.updateMany = async ({ where, data }) => {
  let count = 0;
  state.participants.forEach((participant) => {
    if (matchesWhere(participant, where)) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          participant[key] = value;
        }
      });
      count += 1;
    }
  });

  return { count };
};

prisma.meetingParticipant.deleteMany = async ({ where } = {}) => {
  const remaining = [];
  let count = 0;

  state.participants.forEach((participant) => {
    if (matchesWhere(participant, where)) {
      count += 1;
      return;
    }
    remaining.push(participant);
  });

  state.participants = remaining;
  return { count };
};

prisma.screenShare.findFirst = async ({ where } = {}) => {
  const screenShare = state.screenShares.find((candidate) => matchesWhere(candidate, where)) || null;
  if (!screenShare) {
    return null;
  }

  const user = state.users.find((candidate) => candidate.id === screenShare.user_id);
  return clone({
    ...screenShare,
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
  });
};

prisma.screenShare.upsert = async ({ where, create }) => {
  const match = state.screenShares.find((screenShare) => (
    screenShare.meeting_id === where.meeting_id_user_id.meeting_id &&
    screenShare.user_id === where.meeting_id_user_id.user_id
  ));

  if (match) {
    return clone(match);
  }

  const screenShare = {
    id: makeId('screenshare', state.screenShares),
    meeting_id: create.meeting_id,
    user_id: create.user_id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.screenShares.push(screenShare);
  return clone(screenShare);
};

prisma.screenShare.deleteMany = async ({ where } = {}) => {
  const remaining = [];
  let count = 0;

  state.screenShares.forEach((screenShare) => {
    if (matchesWhere(screenShare, where)) {
      count += 1;
      return;
    }
    remaining.push(screenShare);
  });

  state.screenShares = remaining;
  return { count };
};

prisma.recording.findFirst = async ({ where } = {}) => clone(
  state.recordings.find((recording) => matchesWhere(recording, where)) || null
);

prisma.recording.findMany = async ({ where } = {}) => clone(
  state.recordings.filter((recording) => matchesWhere(recording, where))
);

prisma.recording.findUnique = async ({ where }) => clone(
  state.recordings.find((recording) => recording.id === where.id) || null
);

prisma.recording.create = async ({ data }) => {
  const recording = {
    id: makeId('recording', state.recordings),
    meeting_id: data.meeting_id,
    egress_id: data.egress_id,
    s3_key: data.s3_key,
    transcript_url: data.transcript_url || null,
    status: data.status,
    duration_seconds: data.duration_seconds || null,
    started_at: new Date().toISOString(),
    ended_at: data.ended_at || null,
    created_at: new Date().toISOString(),
  };

  state.recordings.push(recording);
  return clone(recording);
};

prisma.recording.update = async ({ where, data }) => {
  const recording = state.recordings.find((candidate) => candidate.id === where.id);
  Object.assign(recording, data);
  return clone(recording);
};

prisma.recording.deleteMany = async ({ where } = {}) => {
  state.recordings = state.recordings.filter((recording) => !matchesWhere(recording, where));
  return { count: 0 };
};

prisma.recording.delete = async ({ where }) => {
  const index = state.recordings.findIndex((candidate) => candidate.id === where.id);
  const [deleted] = state.recordings.splice(index, 1);
  return clone(deleted);
};

clientes.roomServiceClient.createRoom = async ({ name }) => ({ name });
clientes.roomServiceClient.deleteRoom = async () => undefined;
clientes.roomServiceClient.removeParticipant = async () => undefined;
clientes.egressClient.startRoomCompositeEgress = async () => {
  state.egressCounter += 1;
  return { egressId: `egress-${state.egressCounter}` };
};
clientes.egressClient.stopEgress = async () => undefined;
clientes.webhookReceiver.receive = async (body) => JSON.parse(body);

const makeAuthHeader = (user) => {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  return { Authorization: `Bearer ${token}` };
};

const request = async (server, path, options = {}) => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
};

test('meeting APIs cover create, join, token, screen share, and recording flow', async () => {
  const server = app.listen(0);

  try {
    const createMeetingResponse = await request(server, '/api/v1/meetings/create', {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({
        title: 'Daily Sync',
        type: 'instant',
        waiting_room_on: true,
        screenshare_needs_approval: true,
        allow_screenshare: true,
        is_recorded: true,
        max_participants: 10,
      }),
    });

    assert.equal(createMeetingResponse.status, 201);
    assert.equal(createMeetingResponse.body.success, true);
    assert.ok(createMeetingResponse.body.data.livekitToken);

    const joinCode = createMeetingResponse.body.data.meeting.join_code;
    const meetingId = createMeetingResponse.body.data.meeting.id;

    const joinMeetingResponse = await request(server, '/api/v1/meetings/join', {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
      body: JSON.stringify({ joinCode }),
    });

    assert.equal(joinMeetingResponse.status, 200);
    assert.equal(joinMeetingResponse.body.data.participant.status, 'waiting');
    assert.equal(joinMeetingResponse.body.data.livekitToken, null);

    const admitResponse = await request(server, `/api/v1/meetings/${joinCode}/admit/${guestUser.id}`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(admitResponse.status, 200);
    assert.ok(admitResponse.body.data.livekitToken);

    const tokenResponse = await request(server, '/api/v1/livekit/token', {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
      body: JSON.stringify({ joinCode }),
    });

    assert.equal(tokenResponse.status, 200);
    assert.equal(tokenResponse.body.data.roomName, createMeetingResponse.body.data.meeting.livekit_room_name);
    assert.ok(tokenResponse.body.data.token);

    const startShareResponse = await request(server, `/api/v1/screen-share/${joinCode}/screenshare/start`, {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(startShareResponse.status, 200);
    assert.equal(startShareResponse.body.data.status, 'pending_approval');

    const approveShareResponse = await request(server, `/api/v1/screen-share/${joinCode}/screenshare/approve/${guestUser.id}`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(approveShareResponse.status, 200);
    assert.equal(approveShareResponse.body.data.is_screen_sharing, true);

    const shareStatusResponse = await request(server, `/api/v1/screen-share/${joinCode}/screenshare/status`, {
      method: 'GET',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(shareStatusResponse.status, 200);
    assert.equal(shareStatusResponse.body.data.total_sharing, 1);
    assert.equal(shareStatusResponse.body.data.participant.user.id, guestUser.id);

    const startRecordingResponse = await request(server, `/api/v1/recordings/${joinCode}/start`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(startRecordingResponse.status, 200);
    assert.equal(startRecordingResponse.body.data.status, 'recording');

    const stopRecordingResponse = await request(server, `/api/v1/recordings/${joinCode}/stop`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(stopRecordingResponse.status, 200);
    assert.equal(stopRecordingResponse.body.data.status, 'completed');

    const listRecordingsResponse = await request(server, `/api/v1/recordings/${meetingId}`, {
      method: 'GET',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(listRecordingsResponse.status, 200);
    assert.equal(listRecordingsResponse.body.data.length, 1);

    const recordingId = listRecordingsResponse.body.data[0].id;
    const downloadResponse = await request(server, `/api/v1/recordings/${recordingId}/download`, {
      method: 'GET',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.body.data.url, /recordings/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
