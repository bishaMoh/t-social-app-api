import { Router } from "express";
import passport from "passport";
import {
    getAllTees,
    getPublishedTees,
    getFeed,
    getForYouFeed,
    newT,
    editT,
    deleteT
} from "../controllers/teescontroller.js"
import likesRouter from "./likes.js";
import commentsRouter from "./comments.js";

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false})

router.get("/all", getAllTees)
router.get("/", getPublishedTees)
router.get("/feed", requireAuth, getFeed)
router.get("/feed/foryou", requireAuth, getForYouFeed)
router.post("/newt", requireAuth, newT)
router.put("/:id", requireAuth, editT)
router.delete("/:id", requireAuth, deleteT)

// Nested sub-routes for likes and comments on tees
router.use("/", likesRouter);
router.use("/", commentsRouter);

export default router;