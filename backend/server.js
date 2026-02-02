const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory store (for demo). In production, replace with DB.
let patients = [];
let lastTokenNumber = 0;

// Higher score = higher priority
const URGENCY_SCORES = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

// Average handling time per patient (minutes)
const AVG_SERVICE_MINUTES = 10;

function sortQueue() {
  patients.sort((a, b) => {
    const scoreDiff = URGENCY_SCORES[b.urgency] - URGENCY_SCORES[a.urgency];
    if (scoreDiff !== 0) return scoreDiff;
    // Earlier arrival first if same urgency
    return a.arrivalTime - b.arrivalTime;
  });
}

function buildQueueResponse() {
  sortQueue();

  const activePatients = patients.filter(p => p.status === "waiting");
  const nowServing = patients.find(p => p.status === "serving") || null;

  // Assign positions and estimated wait
  const queueWithEstimates = activePatients.map((p, index) => ({
    ...p,
    position: index + 1,
    estimatedWaitMinutes: index * AVG_SERVICE_MINUTES
  }));

  return {
    nowServing,
    queue: queueWithEstimates,
    avgServiceMinutes: AVG_SERVICE_MINUTES,
    totalWaiting: activePatients.length,
    generatedAt: Date.now()
  };
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create a new patient and issue digital token
app.post("/api/patients", (req, res) => {
  const { name, urgency, reason } = req.body || {};

  if (!name || !urgency) {
    return res.status(400).json({ error: "Name and urgency are required." });
  }

  if (!URGENCY_SCORES[urgency]) {
    return res.status(400).json({ error: "Invalid urgency level." });
  }

  lastTokenNumber += 1;
  const token = String(lastTokenNumber).padStart(3, "0");
  const arrivalTime = Date.now();

  const newPatient = {
    id: `${arrivalTime}-${lastTokenNumber}`,
    name,
    urgency,
    reason: reason || "",
    token,
    arrivalTime,
    status: "waiting" // waiting | serving | done
  };

  patients.push(newPatient);
  sortQueue();

  res.status(201).json({
    message: "Patient added to queue",
    token: newPatient.token,
    patient: newPatient
  });
});

// Get current queue (live status)
app.get("/api/queue", (req, res) => {
  const data = buildQueueResponse();
  res.json(data);
});

// Reset queue (for testing/demo)
app.post("/api/queue/reset", (req, res) => {
  patients = [];
  lastTokenNumber = 0;
  res.json({ message: "Queue reset" });
});

// ----- Auth (demo: in-memory tokens) -----
const STAFF_USERS = [
  { username: "staff", password: "staff123", name: "Staff User" },
  { username: "admin", password: "admin123", name: "Admin" }
];
const validTokens = new Map(); // token -> { username, name }

function generateToken() {
  return "tk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 12);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  req.staff = validTokens.get(token);
  next();
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = STAFF_USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  const token = generateToken();
  validTokens.set(token, { username: user.username, name: user.name });
  res.json({ token, user: { username: user.username, name: user.name } });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.staff });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) validTokens.delete(token);
  res.json({ message: "Logged out" });
});

// Protect staff-only actions
app.patch("/api/patients/:id/serve", authMiddleware, (req, res) => {
  const { id } = req.params;
  const patient = patients.find(p => p.id === id);

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  patient.status = "serving";

  // All others with serving status -> waiting
  patients.forEach(p => {
    if (p.id !== id && p.status === "serving") {
      p.status = "waiting";
    }
  });

  res.json({ message: "Patient is now being served", patient });
});

// Mark a patient as "done" (staff action)
app.patch("/api/patients/:id/complete", (req, res) => {
  const { id } = req.params;
  const patient = patients.find(p => p.id === id);

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  patient.status = "done";
  patient.completedAt = Date.now();

  res.json({ message: "Patient marked as done", patient });
});

// Reset queue (for testing/demo)
app.post("/api/queue/reset", (req, res) => {
  patients = [];
  lastTokenNumber = 0;
  res.json({ message: "Queue reset" });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});