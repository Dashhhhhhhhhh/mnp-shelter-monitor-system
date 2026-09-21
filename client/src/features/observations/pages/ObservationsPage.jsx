import { useEffect, useState } from "react";

import { getObservations } from "../api/observationApi";

import ObservationCard from "../components/ObservationCard";

import CreateObservationModal from "../components/CreateObservationModal";

function ObservationPage() {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchObservations() {
      try {
        setLoading(true);
        setError("");

        const data = await getObservations();

        setObservations(data.observations);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load observations.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchObservations();
  }, [refreshKey]);

  if (loading) {
    return <p>Loading observations...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main>
      <h1>Observations</h1>
      <button type="button" onClick={() => setIsCreateModalOpen(true)}>
        Add Observation
      </button>
      <p>{observations.length} observations</p>

      {observations.length === 0 ? (
        <p>No observations found.</p>
      ) : (
        observations.map((observation) => (
          <ObservationCard
            key={observation.observationId}
            observation={observation}
          />
        ))
      )}

      {isCreateModalOpen && (
        <CreateObservationModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => setRefreshKey((current) => current + 1)}
        />
      )}
    </main>
  );
}

export default ObservationPage;
