import 'dotenv/config'; // Make sure this is still at line 1 if not loaded globally!
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import configurePassport from './config/passport.js'; 
import authRouter from './routes/auth.js';
import teesRouter from './routes/tees.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(session({ 
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

// 🛠️ FIX: Removed the space inside 'user:email'
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/login-failed' }),
    (req, res) => {
        res.redirect('http://localhost:3000/');
    }
);

// routes
app.use('/api/users', authRouter);
app.use('/api/tees', teesRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));