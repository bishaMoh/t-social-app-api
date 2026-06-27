import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { Server } from 'socket.io';
import configurePassport from './config/passport.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import followsRouter from './routes/follows.js';
import teesRouter from './routes/tees.js';
import preferencesRouter from './routes/preferences.js';
import conversationsRouter from './routes/conversations.js';
import { setupSocket } from './lib/socket.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

setupSocket(io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login-failed' }),
  (req, res) => {
    res.redirect('http://localhost:3000/');
  },
);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/follows', followsRouter);
app.use('/api/tees', teesRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/conversations', conversationsRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`server running on port ${PORT}`));
