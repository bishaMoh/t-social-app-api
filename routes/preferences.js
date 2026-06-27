import { Router } from 'express';
import passport from 'passport';
import { getPreferences, updatePreferences } from '../controllers/preferencesController.js';

const router = Router();
const auth = passport.authenticate('jwt', { session: false });

router.use(auth);

router.get('/', getPreferences);
router.put('/', updatePreferences);

export default router;
