const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, 'terminal_terrors.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async initializeTables() {
        return new Promise((resolve, reject) => {
            const createTables = `
                -- Players table
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                );

                -- Player game data table
                CREATE TABLE IF NOT EXISTS player_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER UNIQUE REFERENCES players(id),
                    character_name TEXT,
                    character_class TEXT,
                    level INTEGER DEFAULT 1,
                    experience INTEGER DEFAULT 0,
                    health INTEGER DEFAULT 100,
                    max_health INTEGER DEFAULT 100,
                    sanity INTEGER DEFAULT 100,
                    max_sanity INTEGER DEFAULT 100,
                    gold INTEGER DEFAULT 50,
                    bank_gold INTEGER DEFAULT 0,
                    turns INTEGER DEFAULT 20,
                    delivery_rank INTEGER DEFAULT 0,
                    delivery_streak INTEGER DEFAULT 0,
                    deliveries_completed INTEGER DEFAULT 0,
                    inventory TEXT DEFAULT '[]',
                    weapon TEXT DEFAULT 'null',
                    armor TEXT DEFAULT 'null',
                    current_package TEXT DEFAULT 'null',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Online players table
                CREATE TABLE IF NOT EXISTS online_players (
                    player_id INTEGER PRIMARY KEY REFERENCES players(id),
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'online'
                );
            `;

            this.db.exec(createTables, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('Database tables initialized');
                    resolve();
                }
            });
        });
    }

    // Player authentication methods
    async createPlayer(username, email, passwordHash) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO players (username, email, password_hash) VALUES (?, ?, ?)`;
            this.db.run(sql, [username, email, passwordHash], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getPlayerByUsername(username) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM players WHERE username = ?`;
            this.db.get(sql, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateLastLogin(playerId) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE players SET last_login = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, [playerId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Player data methods
    async getPlayerData(playerId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM player_data WHERE player_id = ?`;
            this.db.get(sql, [playerId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        // Parse JSON fields
                        row.inventory = JSON.parse(row.inventory);
                        row.weapon = JSON.parse(row.weapon);
                        row.armor = JSON.parse(row.armor);
                        row.current_package = JSON.parse(row.current_package);
                    }
                    resolve(row);
                }
            });
        });
    }

    async createPlayerData(playerId, characterName, characterClass) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO player_data (player_id, character_name, character_class) 
                VALUES (?, ?, ?)
            `;
            this.db.run(sql, [playerId, characterName, characterClass], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async updatePlayerData(playerId, gameData) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE player_data SET 
                    character_name = ?,
                    character_class = ?,
                    level = ?,
                    experience = ?,
                    health = ?,
                    max_health = ?,
                    sanity = ?,
                    max_sanity = ?,
                    gold = ?,
                    bank_gold = ?,
                    turns = ?,
                    delivery_rank = ?,
                    delivery_streak = ?,
                    deliveries_completed = ?,
                    inventory = ?,
                    weapon = ?,
                    armor = ?,
                    current_package = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE player_id = ?
            `;

            const params = [
                gameData.name,
                gameData.class,
                gameData.level,
                gameData.experience,
                gameData.health,
                gameData.max_health,
                gameData.sanity,
                gameData.max_sanity,
                gameData.gold,
                gameData.bank_gold,
                gameData.turns,
                gameData.delivery_rank,
                gameData.delivery_streak,
                gameData.deliveries_completed,
                JSON.stringify(gameData.inventory),
                JSON.stringify(gameData.weapon),
                JSON.stringify(gameData.armor),
                JSON.stringify(gameData.current_package),
                playerId
            ];

            this.db.run(sql, params, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Online players methods
    async setPlayerOnline(playerId) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO online_players (player_id, last_seen, status) 
                VALUES (?, CURRENT_TIMESTAMP, 'online')
            `;
            this.db.run(sql, [playerId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async setPlayerOffline(playerId) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM online_players WHERE player_id = ?`;
            this.db.run(sql, [playerId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getOnlinePlayers() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.username, p.id, op.last_seen, pd.character_name, pd.level
                FROM online_players op
                JOIN players p ON op.player_id = p.id
                LEFT JOIN player_data pd ON p.id = pd.player_id
                WHERE op.last_seen > datetime('now', '-5 minutes')
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async cleanup() {
        // Remove offline players older than 5 minutes
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM online_players WHERE last_seen < datetime('now', '-5 minutes')`;
            this.db.run(sql, [], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = new Database();