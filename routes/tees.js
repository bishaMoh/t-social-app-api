import { Router } from "express";
import passport from "passport";
import {
    getAllTees,
    getPublishedTees,
    newT,
    editT,
    deleteT
} from "../controllers/teescontroller.js"

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false})

router.get("/all", getAllTees)
router.get("/", getPublishedTees)
router.post("/newt", requireAuth, newT)
router.put("/:id", requireAuth, editT)
router.delete("/:id", requireAuth, deleteT)

export default router;