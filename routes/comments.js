import { Router } from "express";
import passport from "passport";
import { createComment, getComments, deleteComment } from "../controllers/commentsController.js";

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.post("/:id/comments", requireAuth, createComment);
router.get("/:id/comments", getComments);
router.delete("/:teeId/comments/:commentId", requireAuth, deleteComment);

export default router;
