import { Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from '../models/Notification.js';

interface CreateNotificationInput {
  recipientUserId: Types.ObjectId | string;
  actorUserId?: Types.ObjectId | string | null;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: Types.ObjectId | string | null;
  taskId?: Types.ObjectId | string | null;
  projectMemberId?: Types.ObjectId | string | null;
  link?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return Notification.create({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    projectMemberId: input.projectMemberId ?? null,
    link: input.link ?? null,
  });
}

export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<NotificationDocument[]> {
  if (inputs.length === 0) return [] as NotificationDocument[];

  const notifications = await Notification.insertMany(
    inputs.map((input) => ({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      projectMemberId: input.projectMemberId ?? null,
      link: input.link ?? null,
    }))
  );

  return notifications as NotificationDocument[];
}