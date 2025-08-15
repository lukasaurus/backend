const express = require('express');
const database = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get player's game data
router.get('/data', verifyToken, async (req, res) => {
    try {
        const playerId = req.user.playerId;

        // Update online status
        await database.setPlayerOnline(playerId);

        // Get player game data
        const playerData = await database.getPlayerData(playerId);

        if (!playerData) {
            // No character created yet
            return res.json({
                success: true,
                hasCharacter: false,
                data: null
            });
        }

        res.json({
            success: true,
            hasCharacter: true,
            data: {
                name: playerData.character_name,
                class: playerData.character_class,
                level: playerData.level,
                experience: playerData.experience,
                health: playerData.health,
                max_health: playerData.max_health,
                sanity: playerData.sanity,
                max_sanity: playerData.max_sanity,
                gold: playerData.gold,
                bank_gold: playerData.bank_gold,
                turns: playerData.turns,
                delivery_rank: playerData.delivery_rank,
                delivery_streak: playerData.delivery_streak,
                deliveries_completed: playerData.deliveries_completed,
                inventory: playerData.inventory,
                weapon: playerData.weapon,
                armor: playerData.armor,
                current_package: playerData.current_package
            }
        });

    } catch (error) {
        console.error('Get player data error:', error);
        res.status(500).json({ error: 'Failed to get player data' });
    }
});

// Save player's game data
router.put('/data', verifyToken, async (req, res) => {
    try {
        const playerId = req.user.playerId;
        const gameData = req.body;

        // Validate required fields
        if (!gameData.name || !gameData.class) {
            return res.status(400).json({ error: 'Character name and class are required' });
        }

        // Update online status
        await database.setPlayerOnline(playerId);

        // Check if player data exists
        const existingData = await database.getPlayerData(playerId);

        if (!existingData) {
            // Create new character data
            await database.createPlayerData(playerId, gameData.name, gameData.class);
        }

        // Update player data
        await database.updatePlayerData(playerId, gameData);

        res.json({
            success: true,
            message: 'Game data saved successfully'
        });

    } catch (error) {
        console.error('Save player data error:', error);
        res.status(500).json({ error: 'Failed to save player data' });
    }
});

// Get online players list
router.get('/online', verifyToken, async (req, res) => {
    try {
        // Update current player's online status
        await database.setPlayerOnline(req.user.playerId);

        // Clean up old entries
        await database.cleanup();

        // Get online players
        const onlinePlayers = await database.getOnlinePlayers();

        res.json({
            success: true,
            count: onlinePlayers.length,
            players: onlinePlayers.map(player => ({
                username: player.username,
                character_name: player.character_name,
                level: player.level || 1,
                last_seen: player.last_seen
            }))
        });

    } catch (error) {
        console.error('Get online players error:', error);
        res.status(500).json({ error: 'Failed to get online players' });
    }
});

// Heartbeat endpoint to keep player online
router.post('/heartbeat', verifyToken, async (req, res) => {
    try {
        await database.setPlayerOnline(req.user.playerId);
        res.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Heartbeat failed' });
    }
});

module.exports = router;