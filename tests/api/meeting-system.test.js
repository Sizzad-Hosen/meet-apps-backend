const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-suite-1234567890';
process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-key-for-suite-123456';
process.env.LIVEKIT_API_KEY = 'lk_test_key';
process.env.LIVEKIT_API_SECRET = 'lk_test_secret';
process.env.LIVEKIT_URL = 'http://localhost:7880';
process.env.PORT = '5000';
process.env.APP_BASE_URL = 'http://localhost:5000';

const prisma = require('../../dist/src/lib/prisma').default;
const { clientes } = require('../../dist/src/helpers/livekitClients');
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
  breakoutRooms: [],
  breakoutMessages: [],
  polls: [],
  pollOptions: [],
  pollVotes: [],
  egressCounter: 0,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const resetState = () => {
  state.meetings = [];
  state.participants = [];
  state.screenShares = [];
  state.recordings = [];
  state.breakoutRooms = [];
  state.breakoutMessages = [];
  state.polls = [];
  state.pollOptions = [];
  state.pollVotes = [];
  state.egressCounter = 0;
};

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

prisma.$transaction = async (arg) => {
  if (typeof arg === 'function') {
    return arg(prisma);
  }
  return Promise.all(arg);
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
  if (!meeting) {
    throw new Error('Meeting not found for update');
  }
  Object.assign(meeting, data);
  return clone(meeting);
};

prisma.meeting.delete = async ({ where }) => {
  const index = state.meetings.findIndex((candidate) => candidate.id === where.id || candidate.join_code === where.join_code);
  if (index === -1) {
    return null;
  }
  const [deleted] = state.meetings.splice(index, 1);
  return clone(deleted);
};

prisma.meetingParticipant.findFirst = async ({ where, include } = {}) => {
  const participant = state.participants.find((candidate) => matchesWhere(candidate, where)) || null;
  if (!participant) {
    return null;
  }

  const result = { ...participant };
  if (include?.user) {
    const user = state.users.find((candidate) => candidate.id === participant.user_id);
    result.user = user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null;
  }

  if (include?.breakoutRoom) {
    result.breakoutRoom = state.breakoutRooms.find((room) => room.id === participant.breakout_room_id) || null;
  }

  return clone(result);
};

prisma.meetingParticipant.findMany = async ({ where, include } = {}) => clone(
  state.participants
    .filter((participant) => matchesWhere(participant, where))
    .map((participant) => {
      const result = { ...participant };
      if (include?.user) {
        const user = state.users.find((candidate) => candidate.id === participant.user_id);
        result.user = user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null;
      }
      return result;
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
  if (!participant) {
    throw new Error('Meeting participant not found for update');
  }
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
  if (!recording) {
    throw new Error('Recording not found for update');
  }
  Object.assign(recording, data);
  return clone(recording);
};

prisma.recording.deleteMany = async ({ where } = {}) => {
  const originalLength = state.recordings.length;
  state.recordings = state.recordings.filter((recording) => !matchesWhere(recording, where));
  const deletedCount = originalLength - state.recordings.length;
  return { count: deletedCount };
};

prisma.recording.delete = async ({ where }) => {
  const index = state.recordings.findIndex((candidate) => candidate.id === where.id);
  if (index === -1) {
    return null;
  }
  const [deleted] = state.recordings.splice(index, 1);
  return clone(deleted);
};

prisma.breakoutRoom.findMany = async ({ where, include } = {}) => {
  const rooms = state.breakoutRooms.filter((room) => matchesWhere(room, where));
  return clone(rooms.map((room) => {
    const result = { ...room };
    if (include?.participants) {
      result.participants = state.participants
        .filter((participant) => participant.breakout_room_id === room.id)
        .map((participant) => {
          const user = state.users.find((candidate) => candidate.id === participant.user_id);
          return {
            ...participant,
            user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
          };
        });
    }
    return result;
  }));
};

prisma.breakoutRoom.findFirst = async ({ where, include } = {}) => {
  const room = state.breakoutRooms.find((candidate) => matchesWhere(candidate, where)) || null;
  if (!room) {
    return null;
  }

  const result = { ...room };
  if (include?.participants) {
    result.participants = state.participants
      .filter((participant) => participant.breakout_room_id === room.id)
      .map((participant) => {
        const user = state.users.find((candidate) => candidate.id === participant.user_id);
        return {
          ...participant,
          user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
        };
      });
  }
  return clone(result);
};

prisma.breakoutRoom.findUnique = async ({ where, select } = {}) => {
  const room = state.breakoutRooms.find((candidate) => candidate.id === where.id) || null;
  if (!room) {
    return null;
  }
  if (select) {
    const selected = {};
    Object.keys(select).forEach((key) => {
      if (select[key]) {
        selected[key] = room[key];
      }
    });
    return clone(selected);
  }
  return clone(room);
};

prisma.breakoutRoom.create = async ({ data }) => {
  const room = {
    id: makeId('breakoutRoom', state.breakoutRooms),
    meeting_id: data.meeting_id,
    name: data.name,
    status: data.status || 'open',
    created_at: new Date().toISOString(),
  };

  state.breakoutRooms.push(room);
  return clone(room);
};

prisma.breakoutRoom.updateMany = async ({ where, data }) => {
  let count = 0;
  state.breakoutRooms.forEach((room) => {
    if (matchesWhere(room, where)) {
      Object.assign(room, data);
      count += 1;
    }
  });
  return { count };
};

prisma.breakoutMessage.create = async ({ data }) => {
  const message = {
    id: makeId('breakoutMessage', state.breakoutMessages),
    meeting_id: data.meeting_id,
    breakout_room_id: data.breakout_room_id || null,
    sender_id: data.sender_id,
    content: data.content,
    created_at: new Date().toISOString(),
  };

  state.breakoutMessages.push(message);
  return clone(message);
};

prisma.poll.findMany = async ({ where, include, orderBy } = {}) => {
  const polls = state.polls
    .filter((poll) => matchesWhere(poll, where))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return clone(polls.map((poll) => {
    const result = { ...poll };
    if (include?.options) {
      result.options = state.pollOptions
        .filter((option) => option.poll_id === poll.id)
        .map((option) => {
          const optionResult = { ...option };
          if (include.options.include?.votes) {
            optionResult.votes = state.pollVotes.filter((vote) => vote.option_id === option.id);
          }
          return optionResult;
        });
    }
    return result;
  }));
};

prisma.poll.findUnique = async ({ where, include } = {}) => {
  const poll = state.polls.find((candidate) => candidate.id === where.id) || null;
  if (!poll) {
    return null;
  }

  const result = { ...poll };
  if (include?.options) {
    result.options = state.pollOptions
      .filter((option) => option.poll_id === poll.id)
      .map((option) => {
        const optionResult = { ...option };
        if (include.options.include?.votes) {
          optionResult.votes = state.pollVotes.filter((vote) => vote.option_id === option.id);
        }
        return optionResult;
      });
  }
  return clone(result);
};

prisma.poll.create = async ({ data }) => {
  const poll = {
    id: makeId('poll', state.polls),
    meeting_id: data.meeting_id,
    question: data.question,
    is_closed: data.is_closed ?? false,
    created_at: new Date().toISOString(),
    closed_at: data.closed_at || null,
  };

  state.polls.push(poll);

  const options = (data.options?.create || []).map((option) => {
    const pollOption = {
      id: makeId('pollOption', state.pollOptions),
      poll_id: poll.id,
      text: option.text,
    };
    state.pollOptions.push(pollOption);
    return pollOption;
  });

  const result = { ...poll, options };
  return clone(result);
};

prisma.poll.update = async ({ where, data }) => {
  const poll = state.polls.find((candidate) => candidate.id === where.id);
  if (!poll) {
    throw new Error('Poll not found for update');
  }
  Object.assign(poll, data);
  return clone(poll);
};

prisma.pollVote.findUnique = async ({ where }) => {
  const vote = state.pollVotes.find((candidate) => (
    candidate.poll_id === where.poll_id_voter_id.poll_id &&
    candidate.voter_id === where.poll_id_voter_id.voter_id
  )) || null;
  return clone(vote);
};

prisma.pollVote.create = async ({ data }) => {
  const vote = {
    id: makeId('pollVote', state.pollVotes),
    poll_id: data.poll_id,
    option_id: data.option_id,
    voter_id: data.voter_id,
    created_at: new Date().toISOString(),
  };

  state.pollVotes.push(vote);
  return clone(vote);
};

prisma.pollVote.update = async ({ where, data }) => {
  const vote = state.pollVotes.find((candidate) => candidate.id === where.id);
  if (!vote) {
    throw new Error('Poll vote not found for update');
  }
  Object.assign(vote, data);
  return clone(vote);
};

prisma.pollVote.upsert = async ({ where, update, create }) => {
  const vote = state.pollVotes.find((candidate) => (
    candidate.poll_id === where.poll_id_voter_id.poll_id &&
    candidate.voter_id === where.poll_id_voter_id.voter_id
  ));
  if (vote) {
    Object.assign(vote, update);
    return clone(vote);
  }
  const createdVote = {
    id: makeId('pollVote', state.pollVotes),
    poll_id: create.poll_id,
    option_id: create.option_id,
    voter_id: create.voter_id,
    created_at: new Date().toISOString(),
  };
  state.pollVotes.push(createdVote);
  return clone(createdVote);
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
  resetState();
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

test('breakout APIs cover create, list, join, broadcast, and end flow', async () => {
  resetState();
  const server = app.listen(0);

  try {
    const createMeetingResponse = await request(server, '/api/v1/meetings/create', {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({
        title: 'Breakout Sprint',
        type: 'instant',
        waiting_room_on: true,
        allow_screenshare: true,
        screenshare_needs_approval: false,
        is_recorded: false,
        max_participants: 10,
      }),
    });

    assert.equal(createMeetingResponse.status, 201);
    const joinCode = createMeetingResponse.body.data.meeting.join_code;

    const joinMeetingResponse = await request(server, '/api/v1/meetings/join', {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
      body: JSON.stringify({ joinCode }),
    });
    assert.equal(joinMeetingResponse.status, 200);

    const admitResponse = await request(server, `/api/v1/meetings/${joinCode}/admit/${guestUser.id}`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });
    assert.equal(admitResponse.status, 200);

    const createBreakoutResponse = await request(server, `/api/v1/meetings/${joinCode}/breakout`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({ rooms: [{ name: 'Team A' }, { name: 'Team B' }] }),
    });

    assert.equal(createBreakoutResponse.status, 201);
    assert.equal(createBreakoutResponse.body.data.rooms.length, 2);

    const listBreakoutResponse = await request(server, `/api/v1/meetings/${joinCode}/breakout`, {
      method: 'GET',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(listBreakoutResponse.status, 200);
    assert.equal(listBreakoutResponse.body.data.rooms.length, 2);
    assert.ok(listBreakoutResponse.body.data.myAssignment);

    const roomId = listBreakoutResponse.body.data.myAssignment.roomId;
    const joinBreakoutResponse = await request(server, `/api/v1/meetings/${joinCode}/breakout/${roomId}/join`, {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(joinBreakoutResponse.status, 200);
    assert.equal(joinBreakoutResponse.body.data.roomId, roomId);

    const broadcastResponse = await request(server, `/api/v1/meetings/${joinCode}/breakout/broadcast`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({ message: 'Breakout session open' }),
    });

    assert.equal(broadcastResponse.status, 200);

    const endResponse = await request(server, `/api/v1/meetings/${joinCode}/breakout/end-all`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(endResponse.status, 200);
    assert.equal(endResponse.body.data.ended, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('poll APIs cover create, vote, results, and close flow', async () => {
  resetState();
  const server = app.listen(0);

  try {
    const createMeetingResponse = await request(server, '/api/v1/meetings/create', {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({
        title: 'Poll Review',
        type: 'instant',
        waiting_room_on: true,
        allow_screenshare: false,
        screenshare_needs_approval: false,
        is_recorded: false,
        max_participants: 10,
      }),
    });

    assert.equal(createMeetingResponse.status, 201);
    const joinCode = createMeetingResponse.body.data.meeting.join_code;

    const joinMeetingResponse = await request(server, '/api/v1/meetings/join', {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
      body: JSON.stringify({ joinCode }),
    });
    assert.equal(joinMeetingResponse.status, 200);

    const admitResponse = await request(server, `/api/v1/meetings/${joinCode}/admit/${guestUser.id}`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });
    assert.equal(admitResponse.status, 200);

    const pollResponse = await request(server, `/api/v1/meetings/${joinCode}/polls`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
      body: JSON.stringify({
        question: 'Which feature should we build next?',
        options: ['Breakout rooms', 'Recording', 'Polls'],
      }),
    });

    assert.equal(pollResponse.status, 201);
    assert.equal(pollResponse.body.data.options.length, 3);

    const pollId = pollResponse.body.data.id;
    const optionId = pollResponse.body.data.options[0].id;

    const listPollsResponse = await request(server, `/api/v1/meetings/${joinCode}/polls`, {
      method: 'GET',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(listPollsResponse.status, 200);
    assert.equal(listPollsResponse.body.data.length, 1);

    const voteResponse = await request(server, `/api/v1/meetings/${joinCode}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: makeAuthHeader(guestUser),
      body: JSON.stringify({ optionId }),
    });

    assert.equal(voteResponse.status, 200);

    const resultsResponse = await request(server, `/api/v1/meetings/${joinCode}/polls/${pollId}/results`, {
      method: 'GET',
      headers: makeAuthHeader(guestUser),
    });

    assert.equal(resultsResponse.status, 200);
    assert.equal(resultsResponse.body.data.totalVotes, 1);
    assert.equal(resultsResponse.body.data.results.find((option) => option.id === optionId).voteCount, 1);

    const closeResponse = await request(server, `/api/v1/meetings/${joinCode}/polls/${pollId}/close`, {
      method: 'POST',
      headers: makeAuthHeader(hostUser),
    });

    assert.equal(closeResponse.status, 200);
    assert.equal(closeResponse.body.data.is_closed, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
