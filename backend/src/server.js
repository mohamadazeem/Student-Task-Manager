const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const express = require("express");
const cors = require("cors");
const connectDB = require("../config/db");
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", require("../routes/userRoutes"));
app.use("/api/tasks", require("../routes/taskRoutes"));
app.use("/api/auth", require("../routes/authRoutes"));
app.use(require("../middleware/errorMiddleware"));
const PORT = process.env.PORT || 5000;
async function startServer() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  await connectDB();
  return app.listen(PORT, () => console.log("Server running on port " + PORT));
}
if (require.main === module) {
  startServer().catch(() => {
    console.error("Startup failed. Check database access, MONGODB_URI and JWT_SECRET configuration.");
    process.exit(1);
  });
}
module.exports = { app, startServer };
