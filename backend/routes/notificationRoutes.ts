import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);
router.delete('/:notificationId', protect, deleteNotification);
router.delete('/', protect, clearAllNotifications);

export default router;