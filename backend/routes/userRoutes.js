const express = require("express");
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");
const router = express.Router();
router.get("/", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json(user ? [{ id: user.id, name: user.name, email: user.email }] : []);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// Registration must use the validated, password-hashing authentication route.
router.post("/", authenticateToken, (req, res) => {
    res.status(403).json({ error: "Use /api/auth/register to register" });
});
module.exports = router;
