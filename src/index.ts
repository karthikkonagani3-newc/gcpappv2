import express from "express";
import sqlite3 from "sqlite3";

const app = express();
app.use(express.json());

// Cloud Run uses PORT env var. Default to 8080 for local and container.
const PORT = Number(process.env.PORT) || 8080;

// SQLite path: local uses ./data.db, Cloud Run can use /tmp/app.db
const DB_PATH = process.env.SQLITE_PATH || "./data.db";

const db = new sqlite3.Database(DB_PATH);

// Create table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )
  `);
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET all users
app.get("/users", (_req, res) => {
  db.all("SELECT * FROM users ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST create user
app.post("/users", (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "name and email are required" });

  db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, email });
  });
});

// PUT update user
app.put("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "name and email are required" });

  db_provider_run("UPDATE users SET name=?, email=? WHERE id=?", [name, email, id], res);
});

// DELETE user
app.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  db_provider_run("DELETE FROM users WHERE id=?", [id], res);
});

function db_provider_run(sql: string, params: any[], res: express.Response) {
  db.run(sql, params, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ changes: this.changes });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`DB: ${DB_PATH}`);
});
