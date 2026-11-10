const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Registration must use the validated, password-hashing authentication route.
router.post("/", authenticateToken, (req, res) => {
    res.status(403).json({ error: "Use /api/auth/register to register" });
});

module.exports = router;
