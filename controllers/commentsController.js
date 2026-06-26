import prisma from "../lib/prisma.js";

export const createComment = async (req, res, next) => {
  try {
    const teeId = parseInt(req.params.id);
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        userId: req.user.id,
        teeId,
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

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const teeId = parseInt(req.params.id);

    const comments = await prisma.comment.findMany({
      where: { teeId },
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
      orderBy: { createdAt: "desc" },
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.commentId);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: "You are not authorized to delete this comment" });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
