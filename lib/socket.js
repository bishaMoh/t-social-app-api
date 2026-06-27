import jwt from 'jsonwebtoken';
import prisma from './prisma.js';
import { assertParticipant, userSelect } from '../controllers/conversationsController.js';

export function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token?.replace(/^Bearer\s+/i, '');
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: userSelect,
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        await assertParticipant(parseInt(conversationId, 10), socket.user.id);
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('message:send', async ({ conversationId, text }) => {
      try {
        const id = parseInt(conversationId, 10);
        await assertParticipant(id, socket.user.id);

        if (!text?.trim()) {
          socket.emit('error', { message: 'Message text is required' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            conversationId: id,
            senderId: socket.user.id,
            text: text.trim(),
          },
          include: { sender: { select: userSelect } },
        });

        await prisma.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        io.to(`conversation:${id}`).emit('message:new', { conversationId: id, message });

        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: id },
          select: { userId: true },
        });

        for (const participant of participants) {
          if (participant.userId !== socket.user.id) {
            io.to(`user:${participant.userId}`).emit('conversation:updated', { conversationId: id, message });
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        user: socket.user,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: socket.user.id,
      });
    });

    socket.on('conversation:read', async ({ conversationId }) => {
      try {
        const id = parseInt(conversationId, 10);
        await assertParticipant(id, socket.user.id);
        await prisma.conversationParticipant.updateMany({
          where: { conversationId: id, userId: socket.user.id },
          data: { lastReadAt: new Date() },
        });
        socket.to(`conversation:${id}`).emit('conversation:read', {
          conversationId: id,
          userId: socket.user.id,
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
  });
}
