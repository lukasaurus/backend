const express = require('express');
const bcrypt = require('bcryptjs');
const database = require('../database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register new player
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username already exists
        const existingPlayer = await database.getPlayerByUsername(username);
        if (existingPlayer) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create player
        const playerId = await database.createPlayer(username, email, passwordHash);

        // Generate JWT token
        const token = generateToken(playerId, username);

        // Set player online
        await database.setPlayerOnline(playerId);

        res.status(201).json({
            success: true,
            message: 'Player registered successfully',
            token,
            player: {
                id: playerId,
                username,
                email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register player' });
    }
});

// Login existing player
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find player
        const player = await database.getPlayerByUsername(username);
        if (!player) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, player.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        await database.updateLastLogin(player.id);

        // Generate JWT token
        const token = generateToken(player.id, player.username);

        // Set player online
        await database.setPlayerOnline(player.id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            player: {
                id: player.id,
                username: player.username,
                email: player.email,
                last_login: player.last_login
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout (set player offline)
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET } = require('../middleware/auth');
            
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                await database.setPlayerOffline(decoded.playerId);
            } catch (err) {
                // Token invalid, but that's okay for logout
            }
        }

        res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Verify token (check if still valid)
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Update player online status
        await database.setPlayerOnline(decoded.playerId);

        res.json({
            success: true,
            valid: true,
            player: {
                id: decoded.playerId,
                username: decoded.username
            }
        });

    } catch (error) {
        res.status(401).json({ 
            success: false, 
            valid: false, 
            error: 'Invalid token' 
        });
    }
});

module.exports = router;