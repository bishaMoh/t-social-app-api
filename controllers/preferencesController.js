import prisma from '../lib/prisma.js';

const defaultPreferences = {
  feedMode: 'following',
  interests: [],
  showTrending: true,
  compactFeed: false,
  notifyMessages: true,
};

export async function getPreferences(req, res, next) {
  try {
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: { userId: req.user.id, ...defaultPreferences },
      });
    }

    res.json(preferences);
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const { feedMode, interests, showTrending, compactFeed, notifyMessages } = req.body;

    if (feedMode && !['following', 'foryou'].includes(feedMode)) {
      return res.status(400).json({ error: 'Invalid feed mode' });
    }

    const data = {};
    if (feedMode !== undefined) data.feedMode = feedMode;
    if (interests !== undefined) data.interests = interests;
    if (showTrending !== undefined) data.showTrending = showTrending;
    if (compactFeed !== undefined) data.compactFeed = compactFeed;
    if (notifyMessages !== undefined) data.notifyMessages = notifyMessages;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...defaultPreferences, ...data },
      update: data,
    });

    res.json(preferences);
  } catch (error) {
    next(error);
  }
}

export async function getSuggestions(req, res, next) {
  try {
    const currentUserId = req.user.id;

    const following = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const excludeIds = [currentUserId, ...following.map((f) => f.followingId)];

    const users = await prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
      },
      take: 5,
    });

    const userIds = users.map((u) => u.id);
    const followerCounts = await prisma.follow.groupBy({
      by: ['followingId'],
      where: { followingId: { in: userIds }, status: 'ACCEPTED' },
      _count: { id: true },
    });

    const countMap = Object.fromEntries(
      followerCounts.map((entry) => [entry.followingId, entry._count.id]),
    );

    const suggestions = users
      .map((user) => ({
        ...user,
        followerCount: countMap[user.id] || 0,
        followStatus: 'none',
      }))
      .sort((a, b) => b.followerCount - a.followerCount);

    res.json(suggestions);
  } catch (error) {
    next(error);
  }
}
