import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — list notifications (paginated)
router.get('/', authenticateToken, (req, res) =>
  notificationController.list(req, res)
);

// GET /api/notifications/unread-count — unread count for badge
router.get('/unread-count', authenticateToken, (req, res) =>
  notificationController.unreadCount(req, res)
);

// PATCH /api/notifications/:id/read — mark single as read
router.patch('/:id/read', authenticateToken, (req, res) =>
  notificationController.markRead(req, res)
);

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticateToken, (req, res) =>
  notificationController.markAllRead(req, res)
);

export default router;
