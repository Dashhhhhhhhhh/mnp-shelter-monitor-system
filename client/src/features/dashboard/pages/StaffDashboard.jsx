import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { getObservations } from "../../observations/api/observationApi";

import { getCareRecordsByDate } from "../../care/api/careApi";

import useAuth from "../../auth/hooks/useAuth";

import RegisterStaffModal from "../../users/components/RegisterStaffModal";

import "./StaffDashboard.css";

function StaffDashboard() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const [myObservations, setMyObservations] = useState([]);
  const [observationLoading, setObservationLoading] = useState(true);
  const [observationError, setObservationError] = useState("");

  const [todayCareRecords, setTodayCareRecords] = useState([]);
  const [careLoading, setCareLoading] = useState(true);
  const [careError, setCareError] = useState("");

  const [attentionObservations, setAttentionObservations] = useState([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [attentionError, setAttentionError] = useState("");

  const pendingCareRecords = todayCareRecords.filter(
    (record) => record.status === "PENDING" || record.isOverdue,
  );

  function getManilaDate() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function handleRegister() {
    setIsRegisterModalOpen(true);
  }

  async function handleLogout() {
    await logout();
    navigate("/staff/login");
  }

  useEffect(() => {
    async function fetchMyObservations() {
      try {
        setObservationError("");

        const data = await getObservations({
          view: "active",
          mine: true,
        });

        setMyObservations(data.observations);
      } catch (error) {
        setObservationError(
          error.response?.data?.message ||
            "Unable to load your active observations.",
        );
      } finally {
        setObservationLoading(false);
      }
    }

    fetchMyObservations();
  }, []);

  useEffect(() => {
    async function fetchTodayCare() {
      try {
        setCareError("");

        const data = await getCareRecordsByDate(getManilaDate());

        setTodayCareRecords(data.careRecords);
      } catch (error) {
        setCareError(
          error.response?.data?.message || "Unable to load today's care.",
        );
      } finally {
        setCareLoading(false);
      }
    }

    fetchTodayCare();
  }, []);

  useEffect(() => {
    async function fetchAttentionObservations() {
      try {
        setAttentionError("");

        const data = await getObservations({
          view: "active",
          attention: true,
        });

        setAttentionObservations(data.observations);
      } catch (error) {
        setAttentionError(
          error.response?.data?.message ||
            "Unable to load observations needing attention.",
        );
      } finally {
        setAttentionLoading(false);
      }
    }

    fetchAttentionObservations();
  }, []);

  return (
    <main className="staff-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Staff Dashboard</h1>
          <p>
            <p>
              Welcome back, {user?.firstName}
              {user?.middleInitial ? `${user.middleInitial}. ` : ""}
              {user?.lastName}.
            </p>
          </p>
        </div>

        <div className="dashboard-header-actions">
          {user?.role === "ADMIN" && (
            <button type="button" onClick={handleRegister}>
              Register Staff
            </button>
          )}

          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <h2>Today's Care</h2>

            <span className="dashboard-count">
              {pendingCareRecords.length} pending
            </span>
          </div>
        </div>

        {careLoading && <p>Loading today's care...</p>}

        {careError && <p className="dashboard-error">{careError}</p>}

        {!careLoading && !careError && pendingCareRecords.length === 0 && (
          <p>No pending care for today.</p>
        )}

        {!careLoading && !careError && pendingCareRecords.length > 0 && (
          <div className="dashboard-care-list">
            {pendingCareRecords.map((record) => (
              <button
                key={record.careRecordId}
                type="button"
                className="dashboard-care-card dashboard-clickable-row"
                onClick={() => navigate("/staff/care")}
              >
                <strong>{record.cageCode}</strong>
                <p>
                  <span className="dashboard-label">Status:</span>{" "}
                  <span
                    className={`dashboard-care-status ${
                      record.isOverdue
                        ? "dashboard-care-status-overdue"
                        : "dashboard-care-status-pending"
                    }`}
                  >
                    {record.isOverdue ? "OVERDUE" : record.status}
                  </span>
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {isRegisterModalOpen && (
        <RegisterStaffModal onClose={() => setIsRegisterModalOpen(false)} />
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>My Active Observations</h2>
        </div>

        {observationLoading && <p>Loading active observations...</p>}

        {observationError && (
          <p className="dashboard-error">{observationError}</p>
        )}

        {!observationLoading &&
          !observationError &&
          myObservations.length === 0 && (
            <p>No active observations assigned to you.</p>
          )}

        {!observationLoading &&
          !observationError &&
          myObservations.length > 0 && (
            <div className="dashboard-observation-list">
              {myObservations.map((observation) => (
                <button
                  key={observation.observationId}
                  type="button"
                  className="dashboard-active-row dashboard-clickable-row"
                  onClick={() => navigate("/staff/observations?mine=true")}
                >
                  <div className="dashboard-active-main">
                    <strong>
                      {observation.animalName || observation.cageCode}
                    </strong>

                    <span className="dashboard-active-details">
                      {observation.cageCode} ·{" "}
                      {observation.observationType.replaceAll("_", " ")}
                    </span>
                  </div>

                  <span className="dashboard-active-status">
                    {observation.status.replaceAll("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <h2>Needs Attention</h2>

            <span className="dashboard-count">
              {attentionObservations.length}
            </span>
          </div>
        </div>

        {attentionLoading && <p>Loading observations needing attention...</p>}

        {attentionError && <p className="dashboard-error">{attentionError}</p>}

        {!attentionLoading &&
          !attentionError &&
          attentionObservations.length === 0 && (
            <p>No active observations currently need attention.</p>
          )}

        {!attentionLoading &&
          !attentionError &&
          attentionObservations.length > 0 && (
            <div className="dashboard-observation-list">
              {attentionObservations.map((observation) => (
                <button
                  key={observation.observationId}
                  type="button"
                  className="dashboard-alert-row dashboard-clickable-row"
                  onClick={() =>
                    navigate(
                      `/staff/observations?observationId=${observation.observationId}`,
                    )
                  }
                >
                  <div className="dashboard-alert-main">
                    <strong>
                      {observation.animalName || observation.cageCode}
                    </strong>

                    <span className="dashboard-alert-details">
                      {observation.cageCode} ·{" "}
                      {observation.observationType.replaceAll("_", " ")} ·{" "}
                      {observation.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <span
                    className={`dashboard-alert-urgency ${
                      observation.urgency === "URGENT"
                        ? "dashboard-alert-urgent"
                        : "dashboard-alert-attention"
                    }`}
                  >
                    {observation.urgency.replaceAll("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}

export default StaffDashboard;
