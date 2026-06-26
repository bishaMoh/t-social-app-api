export const verifySession = (req, res, next) => {
    // Passport automatically adds req.isAuthenticated() helper method to incoming requests
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: "Unauthorized. Please login via GitHub." });
};