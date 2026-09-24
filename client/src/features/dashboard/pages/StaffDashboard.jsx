import { useNavigate } from "react-router-dom";

import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { getObservations } from "../../observations/api/observationApi";

import { getCareRecordsByDate } from "../../care/api/careApi";

import { getAnimals } from "../../animals/api/animalApi";

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

  const [animalsNeedingCare, setAnimalsNeedingCare] = useState([]);
  const [animalsCareCount, setAnimalsCareCount] = useState(0);
  const [animalsCareLoading, setAnimalsCareLoading] = useState(true);
  const [animalsCareError, setAnimalsCareError] = useState("");

  const [showAllAnimalsNeedingCare, setShowAllAnimalsNeedingCare] =
    useState(false);

  const [showAllAttention, setShowAllAttention] = useState(false);

  const [showAllMyObservations, setShowAllMyObservations] = useState(false);

  const [showAllTodayCare, setShowAllTodayCare] = useState(false);

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

  useEffect(() => {
    async function fetchAnimalsNeedingCare() {
      try {
        setAnimalsCareError("");

        const data = await getAnimals({
          status: "ACTIVE",
          needsCare: true,
          limit: 100,
        });

        setAnimalsNeedingCare(data.animals);
        setAnimalsCareCount(data.pagination.totalItems);
      } catch (error) {
        setAnimalsCareError(
          error.response?.data?.message ||
            "Unable to load animals needing care.",
        );
      } finally {
        setAnimalsCareLoading(false);
      }
    }

    fetchAnimalsNeedingCare();
  }, []);

  const displayedAnimalsNeedingCare = showAllAnimalsNeedingCare
    ? animalsNeedingCare
    : animalsNeedingCare.slice(0, 5);

  const displayedAttentionObservations = showAllAttention
    ? attentionObservations
    : attentionObservations.slice(0, 5);

  const displayedMyObservations = showAllMyObservations
    ? myObservations
    : myObservations.slice(0, 5);

  const displayedPendingCareRecords = showAllTodayCare
    ? pendingCareRecords
    : pendingCareRecords.slice(0, 5);

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
            {displayedPendingCareRecords.map((record) => (
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
                {pendingCareRecords.length > 5 && (
                  <button
                    type="button"
                    className="dashboard-view-all"
                    onClick={() => setShowAllTodayCare((current) => !current)}
                  >
                    {showAllTodayCare
                      ? "Show less"
                      : `View all ${pendingCareRecords.length}`}
                  </button>
                )}
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
              {displayedMyObservations.map((observation) => (
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

                  {myObservations.length > 5 && (
                    <button
                      type="button"
                      className="dashboard-view-all"
                      onClick={() =>
                        setShowAllMyObservations((current) => !current)
                      }
                    >
                      {showAllMyObservations
                        ? "Show less"
                        : `View all ${myObservations.length}`}
                    </button>
                  )}
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
            <>
              <div className="dashboard-observation-list">
                {displayedAttentionObservations.map((observation) => (
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

              {attentionObservations.length > 5 && (
                <button
                  type="button"
                  className="dashboard-view-all"
                  onClick={() => setShowAllAttention((current) => !current)}
                >
                  {showAllAttention
                    ? "Show less"
                    : `View all ${attentionObservations.length}`}
                </button>
              )}
            </>
          )}
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title">
            <h2>Animals Needing Care</h2>

            <span className="dashboard-count">{animalsCareCount}</span>
          </div>
        </div>

        {animalsCareLoading && <p>Loading animals needing care...</p>}

        {animalsCareError && (
          <p className="dashboard-error">{animalsCareError}</p>
        )}

        {!animalsCareLoading &&
          !animalsCareError &&
          animalsNeedingCare.length === 0 && (
            <p>No active animals currently need care.</p>
          )}

        {!animalsCareLoading &&
          !animalsCareError &&
          animalsNeedingCare.length > 0 && (
            <>
              <div className="dashboard-animal-list">
                {displayedAnimalsNeedingCare.map((animal) => (
                  <button
                    key={animal.animalId}
                    type="button"
                    className="dashboard-animal-row dashboard-clickable-row"
                    onClick={() =>
                      navigate(`/staff/animals?animalId=${animal.animalId}`)
                    }
                  >
                    <div className="dashboard-animal-main">
                      <strong>{animal.animalName || animal.animalCode}</strong>

                      <span className="dashboard-animal-details">
                        {animal.animalCode} · {animal.species}
                      </span>
                    </div>

                    <span
                      className={`dashboard-animal-health ${
                        animal.healthStatus === "INJURED"
                          ? "dashboard-animal-injured"
                          : animal.healthStatus === "SICK"
                            ? "dashboard-animal-sick"
                            : "dashboard-animal-observation"
                      }`}
                    >
                      {animal.healthStatus.replaceAll("_", " ")}
                    </span>
                  </button>
                ))}
              </div>

              {animalsCareCount > 5 && (
                <button
                  type="button"
                  className="dashboard-view-all"
                  onClick={() =>
                    setShowAllAnimalsNeedingCare((current) => !current)
                  }
                >
                  {showAllAnimalsNeedingCare
                    ? "Show less"
                    : `View all ${animalsCareCount}`}
                </button>
              )}
            </>
          )}
      </section>
    </main>
  );
}

export default StaffDashboard;
