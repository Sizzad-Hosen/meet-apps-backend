// src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import prisma from '../../../lib/prisma';
import ApiError from '../../errors/ApiError';
import config from '../../config';
import { generateToken } from '../../../helpers/jwtHelpers';

const registerUser = async (payload: any) => {

  // 1. Email exists check
  const existingUser = await prisma.user.findUnique({
    where:  { email: payload.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already in use');
  }

  // 2. password → passwordHash
  const passwordHash = await bcrypt.hash(
    payload.password,
    Number(config.salt_round) 
  );

  // 3. User create
  const newUser = await prisma.user.create({
    data: {
      name:  payload.name,
      email: payload.email,
      passwordHash,
    },
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      avatarUrl:  true,
      isVerified: true,
      createdAt:  true,
    },
  });

  // 4. Token payload
  const tokenPayload = {
    userId: newUser.id,
    email:  newUser.email,
    role:   newUser.role,
  };

  // 5. accessToken + refreshToken generate
  const accessToken = generateToken(
    tokenPayload,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const refreshToken = generateToken(
    tokenPayload,
    config.jwt.refresh_token_secret as string,
    config.jwt.refresh_token_expires_in as string
  );

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

// Login
const loginUser = async (payload: any) => {

  // 1. User exists check
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!existingUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  // 2. OAuth user
  if (!existingUser.passwordHash) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Please login with Google');
  }

  // 3. Password compare
  const isMatch = await bcrypt.compare(
    payload.password,
    existingUser.passwordHash
  );

  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  // 4. Token payload
  const tokenPayload = {
    userId: existingUser.id,
    email:  existingUser.email,
    role:   existingUser.role,
  };

  // 5. Token generate
  const accessToken = generateToken(
    tokenPayload,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const refreshToken = generateToken(
    tokenPayload,
    config.jwt.refresh_token_secret as string,
    config.jwt.refresh_token_expires_in as string
  );
  // 6. passwordHash 
  const { passwordHash: _, ...safeUser } = existingUser;

  return {
    user: safeUser,
    accessToken,
    refreshToken,
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
};