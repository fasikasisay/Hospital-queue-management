import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getQueue, servePatient, completePatient } from "../api";
import { useAuth } from "../context/AuthContext";

function formatMinutes(mins) {
  if (mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
}

export default function StaffDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [queueData, setQueueData] = useState(null);
  const [queueError, setQueueError] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

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

  const handleServe = async (patientId) => {
    setActionLoading((prev) => ({ ...prev, [patientId]: "serving" }));
    try {
      await servePatient(patientId);
    } catch (err) {
      alert(err.message || "Failed to serve patient");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[patientId];
        return next;
      });
    }
  };

  const handleComplete = async (patientId) => {
    setActionLoading((prev) => ({ ...prev, [patientId]: "completing" }));
    try {
      await completePatient(patientId);
    } catch (err) {
      alert(err.message || "Failed to complete patient");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[patientId];
        return next;
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/staff", { replace: true });
  };

  const nowServing = queueData?.nowServing || null;
  const queue = queueData?.queue || [];
  const completed = queueData?.completed || [];

  return (
    <div className="app">
      <header className="app-header app-header--staff" style={{ marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0, textAlign: "left", fontSize: 22 }}>
          Staff Dashboard
        </h1>
        <div className="header-actions">
          <span className="header-user">Logged in as <strong>{user?.name ?? user?.username}</strong></span>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
          <Link to="/" className="link-back link-back--header">Patient page</Link>
        </div>
      </header>

      <main className="content content--staff">
        <section className="main-card">
          {loadingQueue && !queueData && <p>Loading queue…</p>}
          {queueError && <p className="error">{queueError}</p>}

          <div className="staff-section">
            <div className="now-serving-staff">
              <h3>Currently Serving</h3>
              {nowServing ? (
                <div className="now-serving-card-staff">
                  <div className="token-large">{nowServing.token}</div>
                  <div className="now-serving-info">
                    <div className="name">{nowServing.name}</div>
                    <div className={`badge badge--${nowServing.urgency}`}>
                      {nowServing.urgency.toUpperCase()}
                    </div>
                    {nowServing.reason && (
                      <div className="reason-text">{nowServing.reason}</div>
                    )}
                  </div>
                  <button
                    className="staff-btn staff-btn--complete"
                    onClick={() => handleComplete(nowServing.id)}
                    disabled={actionLoading[nowServing.id]}
                  >
                    {actionLoading[nowServing.id] === "completing" ? "Completing..." : "Mark Complete"}
                  </button>
                </div>
              ) : (
                <p className="muted-text">No patient is currently being served.</p>
              )}
            </div>

            <div className="queue-table-wrapper-staff">
              <h3>Waiting Queue ({queue.length})</h3>
              {queue.length === 0 ? (
                <p className="muted-text">No patients waiting.</p>
              ) : (
                <table className="queue-table-staff">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Token</th>
                      <th>Name</th>
                      <th>Urgency</th>
                      <th>Reason</th>
                      <th>Est. Wait</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.position}</td>
                        <td className="token-cell">{patient.token}</td>
                        <td>{patient.name}</td>
                        <td>
                          <span className={`badge badge--${patient.urgency}`}>
                            {patient.urgency.toUpperCase()}
                          </span>
                        </td>
                        <td className="reason-cell">{patient.reason || "-"}</td>
                        <td>{formatMinutes(patient.estimatedWaitMinutes)}</td>
                        <td>
                          <button
                            className="staff-btn staff-btn--serve"
                            onClick={() => handleServe(patient.id)}
                            disabled={actionLoading[patient.id]}
                          >
                            {actionLoading[patient.id] === "serving" ? "Calling..." : "Call Patient"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {completed.length > 0 && (
              <div className="completed-section">
                <h3>Recently Completed ({completed.length})</h3>
                <div className="completed-list">
                  {completed.map((patient) => (
                    <div key={patient.id} className="completed-item">
                      <span className="token-small">{patient.token}</span>
                      <span className="completed-name">{patient.name}</span>
                      <span className={`badge badge--${patient.urgency}`}>
                        {patient.urgency.toUpperCase()}
                      </span>
                      <span className="completed-time">
                        {patient.completedAt
                          ? new Date(patient.completedAt).toLocaleTimeString()
                          : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Staff dashboard · Auto-refresh every 3 seconds</span>
      </footer>
    </div>
  );
}
