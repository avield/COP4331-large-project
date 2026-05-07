import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { WebSocketServer, type WebSocket } from 'ws';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import ProjectChatMessage from '../models/ProjectChatMessage.js';
import { createNotifications } from './notificationService.js';

interface AccessTokenPayload extends jwt.JwtPayload {
  id: string;
  type?: string;
  tokenVersion?: number;
}

type ChatSocket = WebSocket & {
  projectId?: string;
  userId?: string;
};

type IncomingChatPayload = {
  type?: string;
  content?: unknown;
  mentionedUserIds?: unknown;
};

const socketsByProject = new Map<string, Set<ChatSocket>>();

function sendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastToProject(projectId: string, payload: unknown) {
  const sockets = socketsByProject.get(projectId);
  if (!sockets) return;

  for (const socket of sockets) {
    sendJson(socket, payload);
  }
}

function getProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:api\/)?ws\/projects\/([^/]+)\/chat$/);
  return match?.[1] ?? null;
}

async function authenticateToken(token: string | null) {
  if (!token) return null;

  const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'string') return null;

    const payload = decoded as AccessTokenPayload;
    if (!payload.id || (payload.type && payload.type !== 'access')) return null;

    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user || !user.isEmailVerified) return null;

    if (payload.tokenVersion !== undefined && (user.tokenVersion ?? 0) !== payload.tokenVersion) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('WebSocket auth error:', error);
    return null;
  }
}

function normalizeMentionIds(rawMentionIds: unknown): string[] {
  if (!Array.isArray(rawMentionIds)) return [];

  return Array.from(
    new Set(
      rawMentionIds
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  );
}

export function setupProjectChatWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const host = request.headers.host ?? 'localhost';
    const url = new URL(request.url ?? '/', `http://${host}`);
    const projectId = getProjectIdFromPath(url.pathname);

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      socket.destroy();
      return;
    }

    const user = await authenticateToken(url.searchParams.get('token'));
    if (!user) {
      socket.destroy();
      return;
    }

    const membership = await ProjectMember.findOne({
      projectId,
      userId: user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const chatSocket = ws as ChatSocket;
      chatSocket.projectId = projectId;
      chatSocket.userId = user._id.toString();
      wss.emit('connection', chatSocket);
    });
  });

  wss.on('connection', (socket: ChatSocket) => {
    const { projectId, userId } = socket;
    if (!projectId || !userId) {
      socket.close();
      return;
    }

    const projectSockets = socketsByProject.get(projectId) ?? new Set<ChatSocket>();
    projectSockets.add(socket);
    socketsByProject.set(projectId, projectSockets);

    sendJson(socket, { type: 'chat:ready', projectId });

    socket.on('message', async (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString()) as IncomingChatPayload;
        if (payload.type !== 'chat:message') return;

        const content = typeof payload.content === 'string' ? payload.content.trim() : '';
        if (!content || content.length > 2000) {
          sendJson(socket, {
            type: 'chat:error',
            message: 'Messages must be between 1 and 2000 characters.'
          });
          return;
        }

        const activeMentionIds = await ProjectMember.find({
          projectId,
          userId: { $in: normalizeMentionIds(payload.mentionedUserIds), $ne: userId },
          membershipStatus: 'active'
        }).distinct('userId');

        const message = await ProjectChatMessage.create({
          projectId,
          senderId: userId,
          content,
          mentionedUserIds: activeMentionIds
        });

        const populatedMessage = await ProjectChatMessage.findById(message._id)
          .populate('senderId', 'email profile.displayName profile.profilePictureUrl')
          .populate('mentionedUserIds', 'email profile.displayName profile.profilePictureUrl')
          .lean();

        if (!populatedMessage) return;

        broadcastToProject(projectId, {
          type: 'chat:message',
          message: populatedMessage
        });

        if (activeMentionIds.length > 0) {
          const [project, sender] = await Promise.all([
            Project.findById(projectId).select('name'),
            User.findById(userId).select('email profile.displayName')
          ]);

          const senderName = sender?.profile?.displayName ?? sender?.email ?? 'A teammate';
          await createNotifications(
            activeMentionIds.map((mentionedUserId) => ({
              recipientUserId: mentionedUserId.toString(),
              actorUserId: userId,
              type: 'project_chat_mention',
              title: 'You were mentioned in chat',
              message: `${senderName} mentioned you in ${project?.name ?? 'a project'} chat.`,
              projectId,
              link: `/projects/${projectId}`
            }))
          );
        }
      } catch (error) {
        console.error('Project chat socket message error:', error);
        sendJson(socket, {
          type: 'chat:error',
          message: 'Unable to send message.'
        });
      }
    });

    socket.on('close', () => {
      const sockets = socketsByProject.get(projectId);
      if (!sockets) return;

      sockets.delete(socket);
      if (sockets.size === 0) {
        socketsByProject.delete(projectId);
      }
    });
  });
}
