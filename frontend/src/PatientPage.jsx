import React, { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("patient");

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
  const queue = queueData?.queue || [];
  const totalWaiting = queueData?.totalWaiting ?? 0;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Hospital Queue Management</h1>
          <p className="subtitle">
            Digital tokens, urgency-based priority, and live status.
          </p>
        </div>
        <div className="header-right">
          <div className="header-badge">
            {queueData ? (
              <span>Total waiting: <strong>{totalWaiting}</strong></span>
            ) : (
              <span>Loading queue…</span>
            )}
          </div>
          <Link to="/staff" className="link-staff">
            Staff login
          </Link>
        </div>
      </header>

      <div className="tabs">
        <button
          className={activeTab === "patient" ? "tab active" : "tab"}
          onClick={() => setActiveTab("patient")}
        >
          I am a Patient
        </button>
        <button
          className={activeTab === "overview" ? "tab active" : "tab"}
          onClick={() => setActiveTab("overview")}
        >
          Queue Overview
        </button>
      </div>

      <main className="content">
        {activeTab === "patient" && (
          <section className="panel panel--left">
            <h2>Get Your Digital Queue Token</h2>
            <p className="panel-description">
              Enter your details to receive a token and estimated waiting time.
            </p>
            <form onSubmit={handleSubmit} className="form">
              <label className="field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
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
                <span>Reason for Visit (optional)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Short description helps triage."
                  rows={3}
                />
              </label>
              {submitError && <p className="error">{submitError}</p>}
              <button className="primary-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Get Token"}
              </button>
              {successToken && (
                <div className="success-card">
                  <h3>Your Token</h3>
                  <p className="token">{successToken}</p>
                  {queueData && (
                    <p className="success-sub">
                      You will be called based on urgency and arrival time.
                      Watch the queue screen for token <strong>{successToken}</strong>.
                    </p>
                  )}
                </div>
              )}
            </form>
          </section>
        )}

        <section className="panel panel--right">
          <h2>Live Queue Status</h2>
          <p className="panel-description">
            Updated automatically every few seconds to reduce waiting time confusion.
          </p>
          {loadingQueue && !queueData && <p>Loading queue…</p>}
          {queueError && <p className="error">{queueError}</p>}
          <div className="now-serving">
            <h3>Now Serving</h3>
            {nowServing ? (
              <div className="now-serving-card">
                <div className="token-large">{nowServing.token}</div>
                <div className="now-serving-info">
                  <div className="name">{nowServing.name}</div>
                  <div className={`badge badge--${nowServing.urgency}`}>
                    {nowServing.urgency.toUpperCase()}
                  </div>
                </div>
              </div>
            ) : (
              <p>No patient is currently being served.</p>
            )}
          </div>
          <div className="queue-table-wrapper">
            <h3>Waiting Queue</h3>
            {queue.length === 0 ? (
              <p>No patients waiting.</p>
            ) : (
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Token</th>
                    <th>Name</th>
                    <th>Urgency</th>
                    <th>Est. Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((patient) => (
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
        </section>
      </main>

      <footer className="footer">
        <span>
          Backend: <code>http://localhost:4000</code> · Frontend auto-refresh every 3 seconds.
        </span>
      </footer>
    </div>
  );
}
