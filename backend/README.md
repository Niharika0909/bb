# MRM Capture API

Backend API server for MRM Research Capture Extension.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed test data
npm run prisma:seed

# Start server
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and API key

### Researcher
- `GET /api/researcher/me` - Get current researcher info (auth required)

### Captures
- `POST /api/screenshots` - Upload screenshot (auth required)
- `POST /api/captures` - Save capture (auth required)
- `GET /api/captures` - List researcher's captures (auth required)

### Health
- `GET /api/health` - Health check

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mrm_captures
JWT_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=development
API_PORT=3000
AWS_S3_BUCKET=mrm-captures
AWS_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your AWS key>
AWS_SECRET_ACCESS_KEY=<your AWS secret>
```

## Database Management

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database
npm run prisma:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Railway.app

1. Create Railway project
2. Add PostgreSQL database
3. Set environment variables
4. Deploy: `git push railway main`
5. Run migrations: `railway run npx prisma migrate deploy`
6. Seed: `railway run npm run prisma:seed`

### Render.com

1. Create Web Service
2. Add PostgreSQL database
3. Set environment variables
4. Build command: `npm install && npx prisma generate`
5. Start command: `npm start`
6. Run migrations manually via shell

## Development

```bash
# Watch mode
npm run dev

# Check logs
# Logs are output to console

# Database GUI
npx prisma studio
# Opens at http://localhost:5555
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (min 32 chars)
- [ ] Configure production PostgreSQL database
- [ ] Set up AWS S3 bucket with proper CORS
- [ ] Enable HTTPS
- [ ] Set appropriate CORS origins
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed production researchers (change API keys!)
- [ ] Monitor logs and errors
- [ ] Set up database backups

## Security Notes

- JWT tokens expire in 30 days
- API keys are stored in plaintext (consider hashing for production)
- S3 uploads are public-read (screenshots accessible via URL)
- CORS is currently open (restrict in production)
- No rate limiting (add for production)

## Troubleshooting

### Database connection fails
- Check `DATABASE_URL` format
- Verify PostgreSQL is running
- Check firewall/network access

### S3 upload fails
- Verify AWS credentials
- Check S3 bucket exists
- Verify bucket region matches `AWS_S3_REGION`
- Check bucket CORS configuration

### JWT errors
- Ensure `JWT_SECRET` is set
- Check token expiry (30 days)
- Verify Authorization header format: `Bearer <token>`

## Architecture

```
Client Request
    ↓
CORS Middleware
    ↓
JSON Body Parser
    ↓
Route Handler
    ↓
JWT Auth Middleware (if protected route)
    ↓
Business Logic
    ↓
Prisma Client
    ↓
PostgreSQL
```

## File Structure

```
backend/
├── src/
│   └── index.js          # Main Express server
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Seed script
├── package.json
├── .env.example
└── README.md
```

## Support

For issues, check:
1. Server logs (`npm run dev` output)
2. Database connectivity (`npx prisma studio`)
3. Environment variables (`.env` file)
4. API health endpoint: `curl http://localhost:3000/api/health`
