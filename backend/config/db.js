const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "student_task_manager",
      user: process.env.DB_USER || "student_user",
      password: process.env.DB_PASSWORD || "AZMazm123@",
    };

const pool = new Pool(poolConfig);

async function connectDB() {
  await pool.query("SELECT NOW()");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      priority VARCHAR(20) DEFAULT 'Medium',
      status VARCHAR(20) DEFAULT 'Pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("PostgreSQL connected successfully!");
}

pool.connectDB = connectDB;
module.exports = pool;
module.exports.pool = pool;
module.exports.connectDB = connectDB;
