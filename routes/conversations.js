import { Router } from 'express';
import passport from 'passport';
import {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadCount,
} from '../controllers/conversationsController.js';

const router = Router();
const auth = passport.authenticate('jwt', { session: false });

router.use(auth);

router.get('/', listConversations);
router.get('/unread-count', getUnreadCount);
router.post('/', startConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.patch('/:id/read', markConversationRead);

export default router;
