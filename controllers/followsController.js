import prisma from "../lib/prisma.js";

export const sendFollowRequest = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({ error: "Follow request already exists." });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: userId,
        status: "PENDING",
      },
    });

    return res.status(201).json(follow);
  } catch (err) {
    next(err);
  }
};

export const acceptFollowRequest = async (req, res, next) => {
  try {
    const followId = parseInt(req.params.followId);
    const currentUserId = req.user.id;

    const follow = await prisma.follow.findUnique({
      where: { id: followId },
    });

    if (!follow) {
      return res.status(404).json({ error: "Follow request not found." });
    }

    if (follow.followingId !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to accept this request." });
    }

    const updatedFollow = await prisma.follow.update({
      where: { id: followId },
      data: { status: "ACCEPTED" },
    });

    return res.status(200).json(updatedFollow);
  } catch (err) {
    next(err);
  }
};

export const rejectFollowRequest = async (req, res, next) => {
  try {
    const followId = parseInt(req.params.followId);
    const currentUserId = req.user.id;

    const follow = await prisma.follow.findUnique({
      where: { id: followId },
    });

    if (!follow) {
      return res.status(404).json({ error: "Follow request not found." });
    }

    if (follow.followingId !== currentUserId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to reject this request." });
    }

    await prisma.follow.delete({
      where: { id: followId },
    });

    return res.status(200).json({ message: "Follow request rejected." });
  } catch (err) {
    next(err);
  }
};

export const unfollow = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user.id;

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    return res.status(200).json({ message: "Unfollowed successfully." });
  } catch (err) {
    next(err);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId
      ? parseInt(req.params.userId)
      : req.user.id;

    const followers = await prisma.follow.findMany({
      where: {
        followingId: targetUserId,
        status: "ACCEPTED",
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    return res.status(200).json(followers);
  } catch (err) {
    next(err);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId
      ? parseInt(req.params.userId)
      : req.user.id;

    const following = await prisma.follow.findMany({
      where: {
        followerId: targetUserId,
        status: "ACCEPTED",
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    return res.status(200).json(following);
  } catch (err) {
    next(err);
  }
};

export const getPendingRequests = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const pendingRequests = await prisma.follow.findMany({
      where: {
        followingId: currentUserId,
        status: "PENDING",
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    return res.status(200).json(pendingRequests);
  } catch (err) {
    next(err);
  }
};
