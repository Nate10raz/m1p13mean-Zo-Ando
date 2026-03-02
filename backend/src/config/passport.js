import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV } from './env.js';
import User from '../models/User.js';
import Panier from '../models/Panier.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      callbackURL: `${ENV.BACKEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error('No email from Google'), null);

        // Cherche un user existant
        let user = await User.findOne({ email });

        if (user) {
          // Met à jour le googleId si pas encore enregistré
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Crée un nouveau user client via Google
        user = await User.create({
          email,
          googleId: profile.id,
          nom: profile.name?.familyName || '',
          prenom: profile.name?.givenName || '',
          avatar: profile.photos?.[0]?.value || '',
          role: 'client',
          isActive: true,
          status: 'active',
          isEmailVerified: true,
          passwordHash: 'GOOGLE_OAUTH', // pas de mot de passe
        });

        // Crée le panier associé
        const panier = await Panier.create({ clientId: user._id });
        user.panierId = panier._id;
        await user.save();

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

export default passport;
