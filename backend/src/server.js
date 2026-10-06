const express = require("express");
const cors = require("cors");

const pool = require("../config/db");

const userRoutes = require("../routes/userRoutes");
const taskRoutes = require("../routes/taskRoutes");
const authRoutes = require("../routes/authRoutes");

const errorHandler = require("../middleware/errorMiddleware");

const app = express();


// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(express.json());


// ========================================
// ROUTES
// ========================================

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);


// ========================================
// ERROR HANDLER
// ========================================

app.use(errorHandler);


// ========================================
// SERVER
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// ========================================
// DATABASE CONNECTION TEST
// ========================================

pool.query("SELECT NOW()")
    .then(() => {
        console.log("PostgreSQL connected successfully!");
    })
    .catch((error) => {
        console.error("PostgreSQL connection failed:", error);
    });