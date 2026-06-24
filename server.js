import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

const app = express();
app.use(cors());
app.use(express.json());

// Read data
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { menuItems: [], orders: [] };
  }
}

// Write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Initialize with defaults if empty
function ensureData() {
  const data = readData();
  if (data.menuItems.length === 0) {
    const defaults = JSON.parse(
      fs.readFileSync(path.join(__dirname, "default-menu.json"), "utf-8")
    );
    data.menuItems = defaults;
    writeData(data);
  }
  return data;
}

// ===== MENU API =====

// Get all menu items
app.get("/api/menu", (req, res) => {
  const data = ensureData();
  res.json(data.menuItems);
});

// Update a menu item
app.put("/api/menu/:id", (req, res) => {
  const data = ensureData();
  const idx = data.menuItems.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  data.menuItems[idx] = { ...data.menuItems[idx], ...req.body };
  writeData(data);
  res.json(data.menuItems[idx]);
});

// Reset menu to defaults
app.post("/api/menu/reset", (req, res) => {
  const defaults = JSON.parse(
    fs.readFileSync(path.join(__dirname, "default-menu.json"), "utf-8")
  );
  const data = readData();
  data.menuItems = defaults;
  writeData(data);
  res.json(data.menuItems);
});

// ===== ORDERS API =====

// Get all orders
app.get("/api/orders", (req, res) => {
  const data = ensureData();
  res.json(data.orders);
});

// Get order by ID
app.get("/api/orders/:id", (req, res) => {
  const data = ensureData();
  const order = data.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
});

// Create new order
app.post("/api/orders", (req, res) => {
  const data = ensureData();
  const order = {
    ...req.body,
    status: req.body.status || "pending",
    createdAt: req.body.createdAt || new Date().toISOString(),
  };
  data.orders.unshift(order);
  writeData(data);
  res.status(201).json(order);
});

// Update order status
app.patch("/api/orders/:id/status", (req, res) => {
  const data = ensureData();
  const idx = data.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  data.orders[idx].status = req.body.status;
  data.orders[idx].updatedAt = new Date().toISOString();
  writeData(data);
  res.json(data.orders[idx]);
});

// Delete order
app.delete("/api/orders/:id", (req, res) => {
  const data = ensureData();
  data.orders = data.orders.filter((o) => o.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// ===== AUTH API (simple demo) =====

const usersFile = path.join(__dirname, "users.json");

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");
}

// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, password } = req.body;
  const users = readUsers();
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }
  const user = { id: `user-${Date.now()}`, name, email, phone, password };
  users.push(user);
  writeUsers(users);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});

// Admin login
app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body;
  if (password === "sushimon2024") {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Wrong password" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  ensureData();
  console.log(`SUSHI MON API Server running on http://localhost:${PORT}`);
});
