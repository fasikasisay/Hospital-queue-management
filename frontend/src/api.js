const API_BASE = "http://localhost:4000";

function getAuthHeaders() {
  const token = localStorage.getItem("staffToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

export async function createPatient(payload) {
  const res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create patient");
  }
  return res.json();
}

export async function getQueue() {
  const res = await fetch(`${API_BASE}/api/queue`);
  if (!res.ok) throw new Error("Failed to fetch queue");
  return res.json();
}

export async function servePatient(patientId) {
  const res = await fetch(`${API_BASE}/api/patients/${patientId}/serve`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to serve patient");
  }
  return res.json();
}

export async function completePatient(patientId) {
  const res = await fetch(`${API_BASE}/api/patients/${patientId}/complete`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to complete patient");
  }
  return res.json();
}

// Auth
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Login failed");
  }
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export async function logout() {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders()
  }).catch(() => {});
  localStorage.removeItem("staffToken");
  localStorage.removeItem("staffUser");
}
