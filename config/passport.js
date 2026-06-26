import 'dotenv/config'
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import prisma from '../lib/prisma.js';

export default (passport) => {
  // Required for session support
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // JWT Strategy for API authentication
  const jwtOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(jwtOpts, async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    })
  );

  // GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/api/auth/github/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists via their GitHub ID or email/username
          let user = await prisma.user.findUnique({
            where: { username: profile.username.toLowerCase() }
          });

          if (!user) {
            // Create a new user account if it's their first time logging in
            user = await prisma.user.create({
              data: {
                name: profile.displayName || profile.username,
                username: profile.username.toLowerCase(),
                password: "OAUTH_USER_EXTERNAL", // Dummy password since they use GitHub
                bio: profile._json.bio || "",
                profilePicture: profile.photos?.[0]?.value || null
              }
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  )
}