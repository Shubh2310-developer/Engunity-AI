/**
 * Authentication Helper Functions
 * Location: frontend/src/lib/auth/auth-helpers.ts
 *
 * Purpose: Utility functions for password hashing, JWT generation, and session management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser, IUserSession } from '../database/models/User';
import { getDatabase } from '../database/mongodb';
import { Collection, ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

// ================================
// Password Utilities
// ================================

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ================================
// JWT Utilities
// ================================

/**
 * Generate a JWT token for a user session
 */
export function generateToken(session: IUserSession): string {
  const secretStatus = JWT_SECRET
    ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}`
    : 'NOT_SET';
  console.log('[JWT] Generating token with secret:', secretStatus);
  console.log('[JWT] Session data:', { userId: session.userId, email: session.email });

  const token = jwt.sign(
    session,
    JWT_SECRET,
    { expiresIn: '7d' } // Token valid for 7 days
  );

  console.log('[JWT] Token generated (first 20 chars):', token.substring(0, 20) + '...');
  return token;
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): IUserSession | null {
  try {
    // Log JWT_SECRET status for debugging (only first/last 4 chars for security)
    const secretStatus = JWT_SECRET
      ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}`
      : 'NOT_SET';
    console.log('[JWT] Verifying token with secret:', secretStatus);

    const decoded = jwt.verify(token, JWT_SECRET) as IUserSession;
    console.log('[JWT] Token verified successfully for user:', decoded.userId);
    return decoded;
  } catch (error: any) {
    console.error('[JWT] Verification failed:', error.message);
    console.error('[JWT] Token (first 20 chars):', token.substring(0, 20) + '...');
    console.error('[JWT] Secret being used:', JWT_SECRET ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}` : 'NOT_SET');
    return null;
  }
}

// ================================
// User Database Utilities
// ================================

/**
 * Get users collection from MongoDB
 */
export async function getUsersCollection(): Promise<Collection<IUser>> {
  const db = await getDatabase();
  return db.collection<IUser>('users');
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<IUser | null> {
  const users = await getUsersCollection();
  return users.findOne({ email: email.toLowerCase() });
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<IUser | null> {
  const users = await getUsersCollection();

  // Check if userId is a valid ObjectId
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  return users.findOne({ _id: new ObjectId(userId) });
}

/**
 * Create a new user in the database
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<IUser> {
  const users = await getUsersCollection();

  // Check if user already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create user object
  const newUser: IUser = {
    email: email.toLowerCase(),
    password: hashedPassword,
    name: name || email.split('@')[0],
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    role: 'user'
  };

  // Insert into database
  const result = await users.insertOne(newUser);

  return {
    ...newUser,
    _id: result.insertedId
  };
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const users = await getUsersCollection();

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: string): Promise<void> {
  const users = await getUsersCollection();

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        emailVerified: true,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const users = await getUsersCollection();
  const hashedPassword = await hashPassword(newPassword);

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<IUser | null> {
  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  // Update last login
  if (user._id) {
    await updateLastLogin(user._id.toString());
  }

  return user;
}
