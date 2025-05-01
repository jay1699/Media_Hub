const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
require('dotenv').config();

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error('❌ Missing required environment variables (JWT_SECRET, MONGO_URI)');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;
const SECRET_KEY = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Log all incoming requests (for debugging)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  if (req.body && Object.keys(req.body).length) {
    console.log('Request Body:', req.body);
  }
  next();
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

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
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const User = require('./models/User');
const SearchHistory = require('./models/SearchHistory');

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

// Routes

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hash = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hash });
  await newUser.save();
  res.status(201).json({ message: 'User registered successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Image Search (Authenticated)
app.get('/api/search', auth, async (req, res) => {
  const axios = require('axios');
  const { q, page = 1 } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }

  try {
    const result = await axios.get('https://api.openverse.engineering/v1/images', {
      params: { q, license: 'cc0', page }
    });

    if (result.data.results.length === 0) {
      return res.status(404).json({ message: 'No images found' });
    }

    res.json({ results: result.data.results });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Save Search History (Authenticated)
app.post('/api/history', auth, async (req, res) => {
  const { term } = req.body;
  if (!term || term.trim() === '') {
    return res.status(400).json({ message: 'Search term is required' });
  }
  await new SearchHistory({ username: req.user.username, term }).save();
  res.json({ message: 'Search history saved' });
});

// Get Search History (Authenticated)
app.get('/api/history', auth, async (req, res) => {
  const data = await SearchHistory.find({ username: req.user.username })
    .sort({ timestamp: -1 })
    .limit(10);
  res.json(data);
});

// Delete Search History (Authenticated)
app.delete('/api/history', auth, async (req, res) => {
  await SearchHistory.deleteMany({ username: req.user.username });
  res.json({ message: 'Search history cleared' });
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
