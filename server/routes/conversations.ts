import { Router } from 'express';
import { conversationController } from '../controllers/conversationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/conversations — list all conversations
router.get('/', authenticateToken, (req, res) =>
  conversationController.getConversations(req, res)
);

// GET /api/conversations/unread-count — unread message count
router.get('/unread-count', authenticateToken, (req, res) =>
  conversationController.getUnreadCount(req, res)
);

// POST /api/conversations — create new conversation
router.post('/', authenticateToken, (req, res) =>
  conversationController.createConversation(req, res)
);

// GET /api/conversations/:id/messages — get messages
router.get('/:id/messages', authenticateToken, (req, res) =>
  conversationController.getMessages(req, res)
);

// POST /api/conversations/:id/messages — send message
router.post('/:id/messages', authenticateToken, (req, res) =>
  conversationController.sendMessage(req, res)
);

export default router;
