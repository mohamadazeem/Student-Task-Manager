const express = require("express");
const { body } = require("express-validator");
const Task = require("../models/Task");
const { isObjectIdOrHexString } = require("mongoose");
const authenticateToken = require("../middleware/authMiddleware");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authenticateToken);
router.param("id", (req, res, next, id) => {
    if (!isObjectIdOrHexString(id)) return res.status(400).json({ error: "Invalid task ID" });
    next();
});


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

router.get("/", async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.userId }).sort({ createdAt: -1 });

        res.json(tasks);

    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch tasks"
        });
    }
});


// ========================================
// GET ONE TASK - LOGGED IN USER ONLY
// ========================================

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findOne({ _id: id, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json(task);

    } catch (error) {
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

            const task = await Task.create({ userId, title, description, deadline, priority, status });

            res.status(201).json(task);

        } catch (error) {
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

            const task = await Task.findOneAndUpdate(
                { _id: id, userId: req.user.userId },
                { $set: {
                    title,
                    description: description ?? "",
                    deadline: deadline ?? null,
                    priority: priority ?? "Medium",
                    status: status ?? "Pending"
                } },
                { new: true, runValidators: true }
            );

            if (!task) {
                return res.status(404).json({
                    error: "Task not found"
                });
            }

            res.json(task);

        } catch (error) {
            res.status(500).json({
                error: "Failed to update task"
            });
        }
    }
);


// ========================================
// DELETE TASK
// ========================================

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findOneAndDelete({ _id: id, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully",
            task: task
        });

    } catch (error) {
        res.status(500).json({
            error: "Failed to delete task"
        });
    }
});


module.exports = router;