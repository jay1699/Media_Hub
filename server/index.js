const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Swagger Setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'OpenMediaHub API',
      version: '1.0.0',
      description: 'API documentation for OpenMediaHub user authentication and search history management',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: 'http://localhost:5000' }],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const User = require('./models/User');
const SearchHistory = require('./models/SearchHistory');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and search history management
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: User already exists
 */
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const userExists = await User.findOne({ username });
  if (userExists) return res.status(400).json({ message: 'User exists' });

  const hash = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hash });
  await newUser.save();
  res.status(201).json({ message: 'User registered' });
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login with JWT token
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Authentication Middleware
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search for images (authenticated)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Search term
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         description: Page number
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results
 *       500:
 *         description: Search failed
 */
app.get('/api/search', auth, async (req, res) => {
  const axios = require('axios');
  const { q, page = 1 } = req.query;
  try {
    const result = await axios.get('https://api.openverse.engineering/v1/images', {
      params: { q, license: 'cc0', page }
    });
    res.json({ results: result.data.results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * @swagger
 * /api/history:
 *   post:
 *     summary: Save search history (authenticated)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               term:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History saved successfully
 */
app.post('/api/history', auth, async (req, res) => {
  const { term } = req.body;
  await new SearchHistory({ username: req.user.username, term }).save();
  res.json({ message: 'Saved' });
});

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get search history (authenticated)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of search history
 */
app.get('/api/history', auth, async (req, res) => {
  const data = await SearchHistory.find({ username: req.user.username })
                                  .sort({ timestamp: -1 })
                                  .limit(10);
  res.json(data);
});

/**
 * @swagger
 * /api/history:
 *   delete:
 *     summary: Clear search history (authenticated)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History cleared successfully
 */
app.delete('/api/history', auth, async (req, res) => {
  await SearchHistory.deleteMany({ username: req.user.username });
  res.json({ message: 'Cleared' });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));