import prisma from "../lib/prisma.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    // Get all follow records where current user is the follower
    const followRecords = await prisma.follow.findMany({
      where: { followerId: currentUserId },
    });

    // Build a map of followingId → status
    const followMap = {};
    for (const record of followRecords) {
      followMap[record.followingId] = record.status;
    }

    // Gather all user IDs for batch counting
    const userIds = users.map((u) => u.id);

    // Batch count followers (ACCEPTED) for all users
    const followerCounts = await prisma.follow.groupBy({
      by: ["followingId"],
      where: {
        followingId: { in: userIds },
        status: "ACCEPTED",
      },
      _count: { id: true },
    });

    const followerCountMap = {};
    for (const entry of followerCounts) {
      followerCountMap[entry.followingId] = entry._count.id;
    }

    // Batch count followings (ACCEPTED) for all users
    const followingCounts = await prisma.follow.groupBy({
      by: ["followerId"],
      where: {
        followerId: { in: userIds },
        status: "ACCEPTED",
      },
      _count: { id: true },
    });

    const followingCountMap = {};
    for (const entry of followingCounts) {
      followingCountMap[entry.followerId] = entry._count.id;
    }

    const usersWithStatus = users.map((user) => {
      const status = followMap[user.id];
      let followStatus = "none";
      if (status === "ACCEPTED") followStatus = "following";
      else if (status === "PENDING") followStatus = "pending";

      return {
        ...user,
        followStatus,
        followerCount: followerCountMap[user.id] || 0,
        followingCount: followingCountMap[user.id] || 0,
      };
    });

    res.json(usersWithStatus);
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
        tees: {
          where: { published: true },
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
            user: {
              select: {
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get follower and following counts (ACCEPTED only)
    const followerCount = await prisma.follow.count({
      where: { followingId: userId, status: "ACCEPTED" },
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: userId, status: "ACCEPTED" },
    });

    // Determine follow status relative to current user
    let followStatus = "none";
    if (currentUserId !== userId) {
      const followRecord = await prisma.follow.findFirst({
        where: { followerId: currentUserId, followingId: userId },
      });
      if (followRecord) {
        if (followRecord.status === "ACCEPTED") followStatus = "following";
        else if (followRecord.status === "PENDING") followStatus = "pending";
      }
    }

    res.json({
      ...user,
      followerCount,
      followingCount,
      followStatus,
      isOwnProfile: currentUserId === userId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, profilePicture } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (profilePicture !== undefined) data.profilePicture = profilePicture;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
        tees: {
          include: {
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
    });

    const followerCount = await prisma.follow.count({
      where: { followingId: req.user.id, status: "ACCEPTED" },
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: req.user.id, status: "ACCEPTED" },
    });

    res.json({
      ...user,
      followerCount,
      followingCount,
    });
  } catch (error) {
    next(error);
  }
};
