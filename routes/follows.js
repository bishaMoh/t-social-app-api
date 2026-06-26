import { Router } from "express";
import passport from "passport";
import {
  sendFollowRequest,
  acceptFollowRequest,
  rejectFollowRequest,
  unfollow,
  getFollowers,
  getFollowing,
  getPendingRequests,
} from "../controllers/followsController.js";

const router = Router();

const auth = passport.authenticate("jwt", { session: false });

// Static paths before parameterized routes
router.get("/pending", auth, getPendingRequests);
router.get("/followers/:userId", auth, getFollowers);
router.get("/followers", auth, getFollowers);
router.get("/following/:userId", auth, getFollowing);
router.get("/following", auth, getFollowing);

router.post("/:userId", auth, sendFollowRequest);
router.put("/:followId/accept", auth, acceptFollowRequest);
router.put("/:followId/reject", auth, rejectFollowRequest);
router.delete("/:userId", auth, unfollow);

export default router;
