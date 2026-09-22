import { useEffect, useState } from "react";

import {
  getObservations,
  claimObservation,
  monitorObservation,
  resolveObservation,
  escalateObservation,
  takeOverObservation,
  getObservationById,
} from "../api/observationApi";

import ObservationCard from "../components/ObservationCard";

import CreateObservationModal from "../components/CreateObservationModal";

import useAuth from "../../auth/hooks/useAuth";

import EditObservationModal from "../components/EditObservationModal";

import { useToast } from "../../../components/feedback/ToastContext";

import { useSearchParams } from "react-router-dom";

import "./ObservationPage.css";

function ObservationPage() {
  const { user } = useAuth();

  const { showToast } = useToast();

  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedObservation, setSelectedObservation] = useState(null);

  const [view, setView] = useState("active");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [urgency, setUrgency] = useState("");
  const [status, setStatus] = useState("");
  const [observationType, setObservationType] = useState("");

  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [searchParams] = useSearchParams();

  const mine = searchParams.get("mine") === "true";

  const observationId = searchParams.get("observationId");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    async function fetchObservations() {
      try {
        setError("");

        if (observationId) {
          const data = await getObservationById(observationId);

          setObservations([data.observation]);

          setPagination({
            page: 1,
            limit: 1,
            totalItems: 1,
            totalPages: 1,
          });

          return;
        }

        const data = await getObservations({
          search: debouncedSearch,
          view,
          urgency: urgency || undefined,
          status: status || undefined,
          observationType: observationType || undefined,
          sortBy,
          sortOrder,
          page,
          limit: 10,
          mine,
        });

        setObservations(data.observations);
        setPagination(data.pagination);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load observations.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchObservations();
  }, [
    debouncedSearch,
    refreshKey,
    view,
    page,
    urgency,
    status,
    observationType,
    sortBy,
    sortOrder,
    mine,
  ]);

  async function handleClaim(observation) {
    try {
      await claimObservation(observation.observationId);

      showToast("Observation claimed. You are now handling it.");

      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to claim observation.",
        "error",
      );
    }
  }

  async function handleMonitor(observation) {
    try {
      await monitorObservation(observation.observationId);

      showToast("Observation moved to monitoring.");

      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Unable to move observation to monitoring.",
        "error",
      );
    }
  }

  async function handleResolve(observation) {
    try {
      await resolveObservation(observation.observationId);

      showToast("Observation resolved.");

      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to resolve observation.",
        "error",
      );
    }
  }

  async function handleEscalate(observation) {
    try {
      await escalateObservation(observation.observationId);

      showToast("Observation escalated to medical.");

      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to escalate observation.",
        "error",
      );
    }
  }

  async function handleTakeOver(observation) {
    try {
      await takeOverObservation(observation.observationId);

      showToast("Observation taken over successfully.");

      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to take over observation.",
        "error",
      );
    }
  }

  function handleResetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setUrgency("");
    setStatus("");
    setObservationType("");
    setSortBy("priority");
    setSortOrder("desc");
    setPage(1);
  }

  if (loading) {
    return <p>Loading observations...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main>
      <div className="observations-header">
        <h1>Observations</h1>
        <button type="button" onClick={() => setIsCreateModalOpen(true)}>
          Add Observation
        </button>
      </div>

      <div className="observation-view-row">
        <div className="observation-view-tabs">
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatus("");
              setPage(1);
            }}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => {
              setView("history");
              setStatus("");
              setPage(1);
            }}
          >
            History
          </button>
        </div>
      </div>

      <div className="observation-toolbar">
        <input
          type="search"
          placeholder="Search animal, cage, or notes..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="observation-filters">
          <select
            value={urgency}
            onChange={(event) => {
              setUrgency(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All urgencies</option>
            <option value="URGENT">URGENT</option>
            <option value="NEEDS_ATTENTION">NEEDS ATTENTION</option>
            <option value="NORMAL">NORMAL</option>
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>

            {view === "active" ? (
              <>
                <option value="NEW">NEW</option>
                <option value="BEING_HANDLED">BEING HANDLED</option>
                <option value="MONITORING">MONITORING</option>
              </>
            ) : (
              <>
                <option value="RESOLVED">RESOLVED</option>
                <option value="ESCALATED_TO_MEDICAL">
                  ESCALATED TO MEDICAL
                </option>
              </>
            )}
          </select>

          <select
            value={observationType}
            onChange={(event) => {
              setObservationType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All observation types</option>
            <option value="NOT_EATING">NOT EATING</option>
            <option value="VOMITING">VOMITING</option>
            <option value="DIARRHEA">DIARRHEA</option>
            <option value="INJURY">INJURY</option>
            <option value="LIMPING">LIMPING</option>
            <option value="FIGHTING">FIGHTING</option>
            <option value="EYE_NOSE_DISCHARGE">EYE / NOSE DISCHARGE</option>
            <option value="UNUSUAL_BEHAVIOR">UNUSUAL BEHAVIOR</option>
            <option value="CAGE_CONCERN">CAGE CONCERN</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
      </div>

      <div className="observation-sort-row">
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(1);
          }}
        >
          <option value="priority">Priority</option>
          <option value="createdAt">Created date</option>
          <option value="updatedAt">Updated date</option>
          <option value="observationType">Observation type</option>
        </select>
        {sortBy !== "priority" && (
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value);
              setPage(1);
            }}
          >
            {["createdAt", "updatedAt"].includes(sortBy) ? (
              <>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </>
            ) : (
              <>
                <option value="asc">A–Z</option>
                <option value="desc">Z–A</option>
              </>
            )}
          </select>
        )}
        <button type="button" onClick={handleResetFilters}>
          Reset Filters
        </button>
      </div>

      {observations.length === 0 ? (
        <p className="observation-empty-state">
          {view === "active"
            ? "No active observations match the current filters."
            : "No observation history matches the current filters."}
        </p>
      ) : (
        observations.map((observation) => (
          <ObservationCard
            key={observation.observationId}
            observation={observation}
            canEdit={
              observation.status === "NEW" &&
              (observation.createdBy === user?.userId || user?.role === "ADMIN")
            }
            onEdit={(observation) => setSelectedObservation(observation)}
            canClaim={
              observation.status === "NEW" &&
              ["ADMIN", "VOLUNTEER"].includes(user?.role)
            }
            onClaim={handleClaim}
            canMonitor={
              observation.status === "BEING_HANDLED" &&
              observation.handledBy === user?.userId &&
              ["ADMIN", "VOLUNTEER"].includes(user?.role)
            }
            onMonitor={handleMonitor}
            canResolve={
              ["BEING_HANDLED", "MONITORING"].includes(observation.status) &&
              observation.handledBy === user?.userId &&
              ["ADMIN", "VOLUNTEER"].includes(user?.role)
            }
            onResolve={handleResolve}
            canEscalate={
              ["BEING_HANDLED", "MONITORING"].includes(observation.status) &&
              observation.handledBy === user?.userId &&
              ["ADMIN", "VOLUNTEER"].includes(user?.role)
            }
            onEscalate={handleEscalate}
            canTakeOver={
              user?.role === "ADMIN" &&
              ["BEING_HANDLED", "MONITORING"].includes(observation.status) &&
              observation.handledBy !== user?.userId
            }
            onTakeOver={handleTakeOver}
          />
        ))
      )}

      <div className="observation-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </button>

        <span>
          Page {pagination.page} of {pagination.totalPages || 1}
        </span>

        <button
          type="button"
          disabled={page >= pagination.totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>

      <p>{pagination.totalItems} observations</p>

      {isCreateModalOpen && (
        <CreateObservationModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => setRefreshKey((current) => current + 1)}
        />
      )}

      {selectedObservation && (
        <EditObservationModal
          observation={selectedObservation}
          onClose={() => setSelectedObservation(null)}
          onUpdated={() => {
            setRefreshKey((current) => current + 1);
            setSelectedObservation(null);
          }}
        />
      )}
    </main>
  );
}

export default ObservationPage;
