const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    dbName: process.env.DB_NAME || "student_task_manager",
  });

  console.log("MongoDB Atlas connected successfully!");
}

module.exports = connectDB;