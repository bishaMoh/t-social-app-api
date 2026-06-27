import { Router } from "express";
import passport from "passport";
import {
  getAllUsers,
  getUserProfile,
  updateProfile,
  getCurrentUser,
} from "../controllers/usersController.js";
import { getSuggestions } from "../controllers/preferencesController.js";

const router = Router();

const auth = passport.authenticate("jwt", { session: false });

// All routes require authentication
router.use(auth);

// /me routes MUST come before /:id to avoid 'me' being parsed as an id param
router.get("/me", getCurrentUser);
router.put("/me", updateProfile);
router.get("/suggestions", getSuggestions);

router.get("/", getAllUsers);
router.get("/:id", getUserProfile);

export default router;
