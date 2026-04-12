export type NotificationType =
  | 'project_invitation'
  | 'invitation_accepted'
  | 'task_assigned'
  | 'task_status_changed'
  | 'project_status_changed'
  | 'join_request_received'
  | 'join_request_approved'
  | 'join_request_denied';


export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  link?: string | null;
  createdAt: string;

  actorUserId?: {
    _id: string;
    email: string;
    profile?: {
      displayName?: string;
      profilePictureUrl?: string;
    };
  } | null;

  projectId?: {
    _id: string;
    name: string;
  } | null;

  taskId?: {
    _id: string;
    title: string;
    status: string;
  } | null;
}