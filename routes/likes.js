import { Router } from "express";
import passport from "passport";
import { likeT, getTLikes } from "../controllers/likesController.js";

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false });

router.post("/:id/like", requireAuth, likeT);
router.get("/:id/likes", getTLikes);

export default router;
