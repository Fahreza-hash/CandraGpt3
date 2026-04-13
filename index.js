const express = require('express');
const cors = require('cors');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const chatRoutes = require('./chat');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/ping', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

module.exports = app;
