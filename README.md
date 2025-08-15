# Terminal Terrors Backend

Backend API for the Terminal Terrors BBS game, built with Node.js, Express, and SQLite.

## Quick Deploy to Railway

### 1. Create GitHub Repository
```bash
# In the backend folder
git init
git add .
git commit -m "Initial backend setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/terminal-terrors-backend.git
git push -u origin main
```

### 2. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `terminal-terrors-backend` repository
5. Railway will automatically detect Node.js and deploy

### 3. Configure Environment Variables
In Railway dashboard, go to your project → Variables tab and add:
```
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 4. Get Your API URL
After deployment, Railway will give you a URL like:
```
https://terminal-terrors-backend-production.up.railway.app
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Login existing player  
- `POST /api/auth/logout` - Logout player
- `GET /api/auth/verify` - Verify JWT token

### Player Data
- `GET /api/player/data` - Get player's game data
- `PUT /api/player/data` - Save player's game data
- `GET /api/player/online` - Get list of online players
- `POST /api/player/heartbeat` - Keep player online

### Utility
- `GET /health` - Health check
- `GET /` - API documentation

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## Database

Uses SQLite with the following tables:
- `players` - User accounts and authentication
- `player_data` - Game progress and character data  
- `online_players` - Currently online players

Database file: `terminal_terrors.db` (created automatically)

## Security Features

- bcrypt password hashing
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- CORS configured for itch.io domains
- Helmet.js security headers
- Input validation and sanitization

## CORS Configuration

Configured to work with:
- itch.io web hosting (`v6p9d9t4.ssl.hwcdn.net`, `itch.zone`)
- Local development (`localhost:8080`)
- Desktop game exports (`null` origin)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | (generated) |

## Error Handling

All endpoints return JSON with consistent error format:
```json
{
  "error": "Error message",
  "success": false
}
```

Success responses include:
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```