const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'terminal_terrors_cosmic_horror_secret_key_change_in_production';

function generateToken(playerId, username) {
    return jwt.sign(
        { playerId, username },
        JWT_SECRET,
        { expiresIn: '7d' }  // Token expires in 7 days
    );
}

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        req.user = decoded;
        next();
    });
}

module.exports = {
    generateToken,
    verifyToken,
    JWT_SECRET
};