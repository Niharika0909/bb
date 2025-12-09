require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const aws = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');

const prisma = new PrismaClient();
const app = express();

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION || 'ap-south-1',
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

// ============================================
// MIDDLEWARE: JWT Authentication
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  jwt.verify(token, JWT_SECRET, (err, researcher) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.researcher = researcher;
    next();
  });
};

// ============================================
// ENDPOINT 1: POST /api/auth/login
// ============================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, apiKey } = req.body;

    if (!email || !apiKey) {
      return res.status(400).json({ error: 'Missing email or apiKey' });
    }

    const researcher = await prisma.researcher.findFirst({
      where: {
        email: email,
        apiKey: apiKey,
      },
    });

    if (!researcher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: researcher.id, email: researcher.email, name: researcher.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      researcher: {
        id: researcher.id,
        email: researcher.email,
        name: researcher.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ENDPOINT 2: GET /api/researcher/me
// ============================================
app.get('/api/researcher/me', authenticateToken, async (req, res) => {
  try {
    const researcher = await prisma.researcher.findUnique({
      where: { id: req.researcher.id },
      select: {
        id: true,
        email: true,
        name: true,
        _count: { select: { captures: true } },
      },
    });

    if (!researcher) {
      return res.status(404).json({ error: 'Researcher not found' });
    }

    res.json({
      id: researcher.id,
      email: researcher.email,
      name: researcher.name,
      capture_count: researcher._count.captures,
    });
  } catch (error) {
    console.error('Get researcher error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ENDPOINT 3: POST /api/screenshots (Upload)
// ============================================
app.post('/api/screenshots', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PNG and JPEG images allowed' });
    }

    let imageBuffer = req.file.buffer;
    let compressed = false;

    if (req.file.size > 500000) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      compressed = true;
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const key = `mrm-captures/${filename}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();

    res.json({
      url: result.Location,
      size: imageBuffer.length,
      compressed: compressed,
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// ============================================
// ENDPOINT 4: POST /api/captures (Save Capture)
// ============================================
app.post('/api/captures', authenticateToken, async (req, res) => {
  try {
    const {
      prompt,
      screenshotUrl,
      notes,
      sector,
      theme,
      findingType,
      sourceUrl,
      sourceTabTitle
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Missing required field: prompt' });
    if (!sector) return res.status(400).json({ error: 'Missing required field: sector' });
    if (!theme) return res.status(400).json({ error: 'Missing required field: theme' });
    if (!findingType) return res.status(400).json({ error: 'Missing required field: findingType' });

    const capture = await prisma.capture.create({
      data: {
        researcherId: req.researcher.id,
        prompt,
        screenshotUrl: screenshotUrl || null,
        notes: notes || null,
        sector,
        theme,
        findingType,
        sourceUrl: sourceUrl || null,
        sourceTabTitle: sourceTabTitle || null,
      },
    });

    res.status(201).json({
      id: capture.id,
      researcher_id: capture.researcherId,
      created_at: capture.createdAt,
      prompt: capture.prompt,
      status: 'saved',
    });
  } catch (error) {
    console.error('Create capture error:', error);
    res.status(500).json({ error: 'Failed to save capture' });
  }
});

// ============================================
// ENDPOINT 5: GET /api/captures
// ============================================
app.get('/api/captures', authenticateToken, async (req, res) => {
  try {
    const captures = await prisma.capture.findMany({
      where: { researcherId: req.researcher.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(captures);
  } catch (error) {
    console.error('Get captures error:', error);
    res.status(500).json({ error: 'Failed to fetch captures' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MRM Capture API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
