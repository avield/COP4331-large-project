import { Schema, model, Types } from 'mongoose';

export type NotificationType =
  | 'project_invitation'
  | 'invitation_accepted'
  | 'task_assigned'
  | 'task_status_changed'
  | 'project_updated'
  | 'join_request_received'
  | 'join_request_approved'
  | 'join_request_denied';

export interface NotificationDocument {
  recipientUserId: Types.ObjectId;
  actorUserId?: Types.ObjectId | null;

  type: NotificationType;
  title: string;
  message: string;

  projectId?: Types.ObjectId | null;
  taskId?: Types.ObjectId | null;
  projectMemberId?: Types.ObjectId | null;

  link?: string | null;

  isRead: boolean;
  readAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    type: {
      type: String,
      enum: [
        'project_invitation',
        'invitation_accepted',
        'task_assigned',
        'task_status_changed',
        'project_updated',
        'join_request_received',
        'join_request_approved',
        'join_request_denied'
      ],
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    projectMemberId: { type: Schema.Types.ObjectId, ref: 'ProjectMember', default: null },

    link: { type: String, default: null, trim: true },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>('Notification', notificationSchema);