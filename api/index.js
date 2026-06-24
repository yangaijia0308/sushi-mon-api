import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = path.join(__dirname, "..", "data.json");
const USERS_FILE = path.join(__dirname, "..", "users.json");
const DEFAULT_MENU = path.join(__dirname, "..", "default-menu.json");

const app = express();
app.use(cors());
app.use(express.json());

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return { menuItems: [], orders: [] }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function ensureData() {
  const data = readData();
  if (data.menuItems.length === 0) {
    const defaults = JSON.parse(fs.readFileSync(DEFAULT_MENU, "utf-8"));
    data.menuItems = defaults;
    writeData(data);
  }
  return data;
}

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Menu API
app.get("/api/menu", (req, res) => { res.json(ensureData().menuItems); });
app.put("/api/menu/:id", (req, res) => {
  const data = ensureData();
  const idx = data.menuItems.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  data.menuItems[idx] = { ...data.menuItems[idx], ...req.body };
  writeData(data);
  res.json(data.menuItems[idx]);
});
app.post("/api/menu/reset", (req, res) => {
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_MENU, "utf-8"));
  const data = readData();
  data.menuItems = defaults;
  writeData(data);
  res.json(data.menuItems);
});

// Orders API
app.get("/api/orders", (req, res) => { res.json(ensureData().orders); });
app.get("/api/orders/:id", (req, res) => {
  const order = ensureData().orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
});
app.post("/api/orders", (req, res) => {
  const data = ensureData();
  const order = { ...req.body, status: req.body.status || "pending", createdAt: req.body.createdAt || new Date().toISOString() };
  data.orders.unshift(order);
  writeData(data);
  res.status(201).json(order);
});
app.patch("/api/orders/:id/status", (req, res) => {
  const data = ensureData();
  const idx = data.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  data.orders[idx].status = req.body.status;
  data.orders[idx].updatedAt = new Date().toISOString();
  writeData(data);
  res.json(data.orders[idx]);
});
app.delete("/api/orders/:id", (req, res) => {
  const data = ensureData();
  data.orders = data.orders.filter((o) => o.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Auth API
app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, password } = req.body;
  const users = readUsers();
  if (users.find((u) => u.email === email)) return res.status(400).json({ error: "Email already exists" });
  const user = { id: `user-${Date.now()}`, name, email, phone, password };
  users.push(user);
  writeUsers(users);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = readUsers().find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});
app.post("/api/auth/admin", (req, res) => {
  if (req.body.password === "sushimon2024") res.json({ success: true });
  else res.status(401).json({ error: "Wrong password" });
});

export default app;
