import { Response } from 'express';
import { Notification } from '../models/Notification.js';
import protect from '../middleware/authMiddleware.js';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types/express.js';

export const getMyNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const notifications = await Notification.find({ recipientUserId: userId })
      .populate('actorUserId', 'email profile.displayName profile.profilePictureUrl')
      .populate('projectId', 'name')
      .populate('taskId', 'title status')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

export const getUnreadNotificationCount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const count = await Notification.countDocuments({
      recipientUserId: userId,
      isRead: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('getUnreadNotificationCount error:', error);
    res.status(500).json({ message: 'Failed to fetch unread notification count.' });
  }
};

export const markNotificationRead = async (
  req: AuthenticatedRequest & { params: { notificationId: string } },
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { notificationId } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({ message: 'Invalid notification id.' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientUserId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    res.status(200).json({ notification });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
};

export const markAllNotificationsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read.' });
  }
};