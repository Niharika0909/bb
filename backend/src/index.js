require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { auditMiddleware } = require('./middleware/audit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const modelRoutes = require('./routes/models');
const validationRoutes = require('./routes/validations');
const findingRoutes = require('./routes/findings');
const riskRoutes = require('./routes/risks');
const workflowRoutes = require('./routes/workflows');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// ============================================
// BODY PARSING & COMPRESSION
// ============================================

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// AUDIT & LOGGING MIDDLEWARE
// ============================================

app.use(auditMiddleware);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
  });
});

app.get('/api/health/ready', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/validations', validationRoutes);
app.use('/api/findings', findingRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ============================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Legacy researcher login
app.post('/api/legacy/auth/login', async (req, res) => {
  try {
    const { email, apiKey } = req.body;

    if (!email || !apiKey) {
      return res.status(400).json({ error: 'Missing email or apiKey' });
    }

    const researcher = await prisma.researcher.findFirst({
      where: { email, apiKey },
    });

    if (!researcher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: researcher.id, email: researcher.email, name: researcher.name },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      researcher: {
        id: researcher.id,
        email: researcher.email,
        name: researcher.name,
      },
    });
  } catch (error) {
    logger.error('Legacy login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Close database connection
  await prisma.$disconnect();

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// START SERVER
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 MRM Platform API running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.nodeEnv}`);
  logger.info(`🔐 Security: Helmet, CORS, Rate Limiting enabled`);
});

module.exports = app;
