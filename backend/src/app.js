const express = require('express');
const cors = require('cors');

const servicesRouter = require('./routes/services');
const queueRouter = require('./routes/queue');

const app = express();

app.use(cors());

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/services', servicesRouter);

app.use('/api/queue', queueRouter);

const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;