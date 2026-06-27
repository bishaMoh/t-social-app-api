import prisma from '../lib/prisma.js';

const userSelect = {
  id: true,
  name: true,
  username: true,
  profilePicture: true,
};

function directKeyFor(userIdA, userIdB) {
  const [a, b] = [userIdA, userIdB].sort((x, y) => x - y);
  return `${a}:${b}`;
}

async function assertParticipant(conversationId, userId) {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!participant) {
    const error = new Error('Not a participant in this conversation');
    error.status = 403;
    throw error;
  }
  return participant;
}

async function canMessageUser(senderId, recipientId) {
  if (senderId === recipientId) return false;

  const follow = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: senderId, followingId: recipientId, status: 'ACCEPTED' },
        { followerId: recipientId, followingId: senderId, status: 'ACCEPTED' },
      ],
    },
  });

  return !!follow;
}

function formatConversation(conversation, currentUserId) {
  const otherParticipant = conversation.participants.find((p) => p.userId !== currentUserId);
  const myParticipant = conversation.participants.find((p) => p.userId === currentUserId);
  const lastMessage = conversation.messages[0] || null;
  const unreadCount = lastMessage && myParticipant?.lastReadAt
    ? conversation.messages.filter(
        (m) => m.senderId !== currentUserId && new Date(m.createdAt) > new Date(myParticipant.lastReadAt),
      ).length
    : lastMessage && lastMessage.senderId !== currentUserId ? 1 : 0;

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    otherUser: otherParticipant?.user || null,
    lastMessage,
    unreadCount,
  };
}

export async function listConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: { include: { user: { select: userSelect } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: userSelect } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(conversations.map((c) => formatConversation(c, userId)));
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    let count = 0;
    for (const participant of participants) {
      const lastMessage = participant.conversation.messages[0];
      if (!lastMessage || lastMessage.senderId === userId) continue;
      if (!participant.lastReadAt || new Date(lastMessage.createdAt) > new Date(participant.lastReadAt)) {
        count += 1;
      }
    }

    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function startConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const recipientId = parseInt(req.body.userId, 10);

    if (!recipientId || Number.isNaN(recipientId)) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!(await canMessageUser(userId, recipientId))) {
      return res.status(403).json({ error: 'You can only message users you follow or who follow you' });
    }

    const directKey = directKeyFor(userId, recipientId);
    let conversation = await prisma.conversation.findUnique({
      where: { directKey },
      include: {
        participants: { include: { user: { select: userSelect } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: userSelect } },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          directKey,
          participants: {
            create: [{ userId }, { userId: recipientId }],
          },
        },
        include: {
          participants: { include: { user: { select: userSelect } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: userSelect } },
          },
        },
      });
    }

    res.status(201).json(formatConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    await assertParticipant(conversationId, userId);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: userSelect } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    await assertParticipant(conversationId, userId);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        text: text.trim(),
      },
      include: { sender: { select: userSelect } },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
    return message;
  } catch (error) {
    next(error);
  }
}

export async function markConversationRead(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = parseInt(req.params.id, 10);

    await assertParticipant(conversationId, userId);

    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export { assertParticipant, canMessageUser, formatConversation, userSelect };
