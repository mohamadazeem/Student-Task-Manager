const express = require("express");
const { body } = require("express-validator");
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();


// ========================================
// TASK VALIDATION RULES
// ========================================

const taskValidation = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ max: 200 })
        .withMessage("Title must not exceed 200 characters"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be text"),

    body("deadline")
        .optional()
        .isISO8601()
        .withMessage("Deadline must be a valid date"),

    body("priority")
        .optional()
        .isIn(["Low", "Medium", "High"])
        .withMessage("Priority must be Low, Medium, or High"),

    body("status")
        .optional()
        .isIn(["Pending", "In Progress", "Completed"])
        .withMessage(
            "Status must be Pending, In Progress, or Completed"
        )
];


// ========================================
// GET ALL TASKS - LOGGED IN USER ONLY
// ========================================

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM tasks
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching tasks:", error);

        res.status(500).json({
            error: "Failed to fetch tasks"
        });
    }
});


// ========================================
// GET ONE TASK - LOGGED IN USER ONLY
// ========================================

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM tasks
             WHERE id = $1
             AND user_id = $2`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Error fetching task:", error);

        res.status(500).json({
            error: "Failed to fetch task"
        });
    }
});


// ========================================
// CREATE TASK
// ========================================

router.post(
    "/",
    authenticateToken,
    taskValidation,
    validate,
    async (req, res) => {
        try {
            const {
                title,
                description,
                deadline,
                priority,
                status
            } = req.body;

            const userId = req.user.userId;

            const result = await pool.query(
                `INSERT INTO tasks
                (user_id, title, description, deadline, priority, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    userId,
                    title,
                    description,
                    deadline,
                    priority,
                    status || "Pending"
                ]
            );

            res.status(201).json(result.rows[0]);

        } catch (error) {
            console.error("Error creating task:", error);

            res.status(500).json({
                error: "Failed to create task"
            });
        }
    }
);


// ========================================
// UPDATE TASK
// ========================================

router.put(
    "/:id",
    authenticateToken,
    taskValidation,
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            const {
                title,
                description,
                deadline,
                priority,
                status
            } = req.body;

            const result = await pool.query(
                `UPDATE tasks
                 SET title = $1,
                     description = $2,
                     deadline = $3,
                     priority = $4,
                     status = $5
                 WHERE id = $6
                 AND user_id = $7
                 RETURNING *`,
                [
                    title,
                    description,
                    deadline,
                    priority,
                    status,
                    id,
                    req.user.userId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Task not found"
                });
            }

            res.json(result.rows[0]);

        } catch (error) {
            console.error("Error updating task:", error);

            res.status(500).json({
                error: "Failed to update task"
            });
        }
    }
);


// ========================================
// DELETE TASK
// ========================================

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1
             AND user_id = $2
             RETURNING *`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error("Error deleting task:", error);

        res.status(500).json({
            error: "Failed to delete task"
        });
    }
});


module.exports = router;