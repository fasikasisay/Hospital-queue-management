import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPatient, getQueue } from "../api";

const URGENCY_OPTIONS = [
  { value: "critical", label: "Critical (highest priority)" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low (least urgent)" }
];

function formatMinutes(mins) {
  if (mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
}

export default function PatientPage() {
  const [name, setName] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successToken, setSuccessToken] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [queueError, setQueueError] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  useEffect(() => {
    let intervalId;
    const loadQueue = async () => {
      try {
        setLoadingQueue(true);
        const data = await getQueue();
        setQueueData(data);
        setQueueError("");
      } catch (err) {
        setQueueError(err.message || "Failed to load queue");
      } finally {
        setLoadingQueue(false);
      }
    };
    loadQueue();
    intervalId = setInterval(loadQueue, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSuccessToken(null);
    try {
      const result = await createPatient({ name, urgency, reason });
      setSuccessToken(result.token);
      setName("");
      setUrgency("normal");
      setReason("");
    } catch (err) {
      setSubmitError(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const nowServing = queueData?.nowServing || null;
  const rawQueue = queueData?.queue || [];
  const totalWaiting = queueData?.totalWaiting ?? 0;

  const filteredQueue = useMemo(() => {
    let list = rawQueue;
    if (urgencyFilter !== "all") {
      list = list.filter((p) => p.urgency === urgencyFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.token.toLowerCase().includes(q) ||
          (p.reason && p.reason.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rawQueue, urgencyFilter, search]);

  return (
    <div className="app">
      <h1 className="page-title">Hospital Queue</h1>

      <div className="main-card">
        <header className="app-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Get your queue token</h2>
            <p className="subtitle" style={{ margin: "4px 0 0" }}>
              Enter your details to receive a token and estimated wait time.
            </p>
          </div>
          <div className="header-right">
            <div className="header-badge">
              {queueData ? (
                <span>Waiting: <strong>{totalWaiting}</strong></span>
              ) : (
                <span>Loading…</span>
              )}
            </div>
            <Link to="/staff" className="btn-accent">
              Staff login
            </Link>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </label>
          <label className="field">
            <span>Urgency</span>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {URGENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Note / Reason for visit (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief description helps triage"
              rows={2}
            />
          </label>
          {submitError && <p className="error">{submitError}</p>}
          <button type="submit" className="primary-btn" disabled={submitting} style={{ alignSelf: "center" }}>
            {submitting ? "Submitting…" : "Get Token"}
          </button>
          {successToken && (
            <div className="success-card">
              <h3>Your token</h3>
              <p className="token">{successToken}</p>
              <p className="success-sub">
                Watch the queue screen for token <strong>{successToken}</strong>. You will be called by urgency and arrival time.
              </p>
            </div>
          )}
        </form>

        <div className="filter-row">
          <input
            type="text"
            className="search-input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="all">All urgencies</option>
            {URGENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <h2 className="section-heading">Queue Status</h2>
        {loadingQueue && !queueData && <p className="muted-text">Loading queue…</p>}
        {queueError && <p className="error">{queueError}</p>}

        <div className="now-serving">
          <h3>Now serving</h3>
          {nowServing ? (
            <div className="now-serving-card">
              <div className="token-large">{nowServing.token}</div>
              <div className="now-serving-info">
                <div className="name">{nowServing.name}</div>
                <span className={`badge badge--${nowServing.urgency}`}>
                  {nowServing.urgency.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted-text">No patient is currently being served.</p>
          )}
        </div>

        <div className="table-wrapper">
          {filteredQueue.length === 0 ? (
            <p className="muted-text">No patients in queue.</p>
          ) : (
            <table className="queue-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>Name</th>
                  <th>Urgency</th>
                  <th>Est. wait</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.position}</td>
                    <td>{patient.token}</td>
                    <td>{patient.name}</td>
                    <td>
                      <span className={`badge badge--${patient.urgency}`}>
                        {patient.urgency.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatMinutes(patient.estimatedWaitMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className="footer">
        <span>Queue updates every 3 seconds</span>
      </footer>
    </div>
  );
}
