const express = require("express");
const { body } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();


// ========================================
// REGISTER VALIDATION
// ========================================

const registerValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ max: 100 })
        .withMessage("Name must not exceed 100 characters"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
];


// ========================================
// LOGIN VALIDATION
// ========================================

const loginValidation = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];


// ========================================
// REGISTER
// ========================================

router.post(
    "/register",
    registerValidation,
    validate,
    async (req, res) => {
        try {
            const {
                name,
                email,
                password
            } = req.body;

            // Check if user already exists
            const existingUser = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    error: "Email already registered"
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const result = await pool.query(
                `INSERT INTO users (name, email, password)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, email`,
                [
                    name,
                    email,
                    hashedPassword
                ]
            );

            res.status(201).json({
                message: "User registered successfully",
                user: result.rows[0]
            });

        } catch (error) {
            console.error("Registration error:", error);

            res.status(500).json({
                error: "Registration failed"
            });
        }
    }
);


// ========================================
// LOGIN
// ========================================

router.post(
    "/login",
    loginValidation,
    validate,
    async (req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            // Find user by email
            const result = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    error: "Invalid email or password"
                });
            }

            const user = result.rows[0];

            // Compare password
            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    error: "Invalid email or password"
                });
            }

            // Create JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            res.json({
                message: "Login successful",
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            console.error("Login error:", error);

            res.status(500).json({
                error: "Login failed"
            });
        }
    }
);


module.exports = router;