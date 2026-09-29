const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET all users
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email FROM users"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching users:", error);

        res.status(500).json({
            error: "Failed to fetch users"
        });
    }
});

// POST - Create a new user
router.post("/", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, password]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Error creating user:", error);

        res.status(500).json({
            error: "Failed to create user"
        });
    }
});

module.exports = router;