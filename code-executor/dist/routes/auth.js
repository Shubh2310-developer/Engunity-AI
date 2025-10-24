"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../config/logger");
const router = express_1.default.Router();
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Check if user exists
        const existingUser = await User_1.default.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Create user
        const user = await User_1.default.create({
            username,
            email,
            passwordHash: password, // Will be hashed by pre-save hook
        });
        // Generate token
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
        const options = { expiresIn: '7d' };
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, jwtSecret, options);
        logger_1.logger.info('User registered', { userId: user._id, username });
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Registration failed', { error: error.message });
        res.status(500).json({ error: 'Registration failed' });
    }
});
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
        const options = { expiresIn: '7d' };
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, jwtSecret, options);
        logger_1.logger.info('User logged in', { userId: user._id });
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login failed', { error: error.message });
        res.status(500).json({ error: 'Login failed' });
    }
});
/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.userId).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch user', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map