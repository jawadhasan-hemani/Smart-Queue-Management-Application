const express = require('express');
const cors = require('cors');
const path = require('path');

const servicesRouter = require('./routes/services');
const queueRouter = require('./routes/queue');
const notificationsRouter = require('./routes/notifications');
const historyRouter = require('./routes/history');
const chatRouter = require('./routes/chat');
const reportsRouter = require('./routes/reports');

const app = express();

app.use(cors());

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/services', servicesRouter);

app.use('/api/queue', queueRouter);

app.use('/api/notifications', notificationsRouter);

app.use('/api/history', historyRouter);

app.use('/api/chat', chatRouter);

app.use('/api/admin/reports', reportsRouter);

const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
