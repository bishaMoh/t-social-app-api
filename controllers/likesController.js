import prisma from "../lib/prisma.js";

export const likeT = async (req, res, next) => {
  try {
    const teeId = parseInt(req.params.id);
    const userId = req.user.id;

    const existingLike = await prisma.likes.findUnique({
      where: {
        userId_tId: {
          userId,
          tId: teeId,
        },
      },
    });

    if (existingLike) {
      await prisma.likes.delete({
        where: {
          userId_tId: {
            userId,
            tId: teeId,
          },
        },
      });
      return res.status(200).json({ liked: false });
    }

    await prisma.likes.create({
      data: {
        userId,
        tId: teeId,
      },
    });

    return res.status(200).json({ liked: true });
  } catch (error) {
    next(error);
  }
};

export const getTLikes = async (req, res, next) => {
  try {
    const teeId = parseInt(req.params.id);

    const likes = await prisma.likes.findMany({
      where: {
        tId: teeId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    return res.status(200).json(likes);
  } catch (error) {
    next(error);
  }
};
