const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Middleware for parsing JSON requests
app.use(express.json());

// RESTful API route for health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Import and use Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Start Express Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
