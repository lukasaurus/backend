const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Needed for Godot web exports
    contentSecurityPolicy: false     // Disable CSP for game compatibility
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration for itch.io compatibility
app.use(cors({
    origin: [
        'https://v6p9d9t4.ssl.hwcdn.net',  // itch.io game hosting domain
        'https://itch.zone',               // itch.io alternative domain
        'https://itch.io',                 // itch.io main domain
        'http://localhost:8080',           // Local development
        'http://127.0.0.1:8080',          // Local development
        'null'                             // File:// protocol for desktop exports
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'Terminal Terrors Backend',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/player', require('./routes/player'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Terminal Terrors Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                verify: 'GET /api/auth/verify'
            },
            player: {
                data: 'GET /api/player/data',
                save: 'PUT /api/player/data',
                online: 'GET /api/player/online',
                heartbeat: 'POST /api/player/heartbeat'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize server variable
let server;

// Start server
async function startServer() {
    try {
        // Initialize database
        await database.connect();
        
        // Start cleanup interval (remove offline players every 5 minutes)
        setInterval(async () => {
            try {
                await database.cleanup();
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }, 5 * 60 * 1000);

        // Start HTTP server
        server = app.listen(PORT, () => {
            console.log(`Terminal Terrors Backend running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });

        return server;

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (server) {
        server.close(() => {
            console.log('Process terminated');
        });
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    if (server) {
        server.close(() => {
            console.log('Process terminated');
        });
    }
});

module.exports = app;