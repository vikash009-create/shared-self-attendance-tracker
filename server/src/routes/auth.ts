// server/src/routes/auth.ts
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthenticatedRequest, requireAuth, generateToken } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Please provide a valid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  defaultTargetPercentage: z.number().min(50).max(100).optional().default(75)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  defaultTargetPercentage: z.number().min(50).max(100)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, email, password, defaultTargetPercentage } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    db.run(
      `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name.trim(), normalizedEmail, passwordHash, defaultTargetPercentage]
    );

    const user = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      default_target_percentage: defaultTargetPercentage
    };

    const token = generateToken(user);
    res.status(201).json({ user, token, message: 'Account created successfully.' });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account due to internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = db.get<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      default_target_percentage: number;
    }>(
      'SELECT id, name, email, password_hash, default_target_percentage FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      default_target_percentage: user.default_target_percentage
    };

    const token = generateToken(authUser);
    res.json({ user: authUser, token, message: 'Login successful.' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate due to internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, defaultTargetPercentage } = parseResult.data;
    const userId = req.user!.id;

    db.run(
      `UPDATE users SET name = ?, default_target_percentage = ?, updated_at = datetime('now') WHERE id = ?`,
      [name.trim(), defaultTargetPercentage, userId]
    );

    const updatedUser = {
      id: userId,
      name: name.trim(),
      email: req.user!.email,
      default_target_percentage: defaultTargetPercentage
    };

    const token = generateToken(updatedUser);
    res.json({ user: updatedUser, token, message: 'Profile updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;
    const userId = req.user!.id;

    const user = db.get<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.run(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      [newHash, userId]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
