import { useEffect, useState } from "react";
import { getCageById } from "../api/cageApi";

import EditCageModal from "./EditCageModal";

import "./CageDetailsDrawer.css";

import "./AssignAnimalModal.css";

import AssignAnimalModal from "./AssignAnimalModal";

import MoveAnimalModal from "./MoveAnimalModal";

import RemoveAnimalModal from "./RemoveAnimalModal";

function CageDetailsDrawer({
  cageId,
  onClose,
  onCageUpdated,
  onAssignmentsChanged,
}) {
  const [cage, setCage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [movingAnimal, setMovingAnimal] = useState(null);

  const [removingAnimal, setRemovingAnimal] = useState(null);
  useEffect(() => {
    if (!cageId) return;

    async function fetchCage() {
      setLoading(true);
      setError("");

      try {
        const data = await getCageById(cageId);

        setCage(data.cage);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load cage details.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCage();
  }, [cageId, refreshKey]);

  if (!cageId) return null;

  if (loading) {
    return <p>Loading cage...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!cage) return null;

  return (
    <>
      <div className="cage-drawer-backdrop" onClick={onClose} />

      <aside className="cage-drawer">
        <div className="cage-drawer-header">
          <div>
            <h2>{cage.cageCode}</h2>
            <p>{cage.location || "Location not specified"}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cage details"
          >
            ✕
          </button>
        </div>
        <div>
          <p>
            <strong>Species:</strong> {cage.speciesGroup}
          </p>

          <p>
            <strong>Gender group:</strong> {cage.genderGroup}
          </p>

          <p>
            <strong>Type:</strong> {cage.cageType}
          </p>

          <p>
            <strong>Recommended capacity:</strong> {cage.recommendedCapacity}
          </p>

          <p>
            <strong>Status:</strong> {cage.status}
          </p>

          <section className="cage-details-section">
            <h3>Current Occupancy</h3>

            <div className="cage-occupancy">
              <span>
                {cage.occupancy} / {cage.recommendedCapacity} occupied
              </span>
            </div>
          </section>

          <section className="cage-details-section">
            <h3>Assigned Animals</h3>

            {cage.assignedAnimals.length > 0 ? (
              <div className="cage-assigned-animals">
                {cage.assignedAnimals.map((animal) => (
                  <div
                    className="cage-assigned-animal"
                    key={animal.assignmentId}
                  >
                    <p>
                      <strong>{animal.animalName || "Unnamed"}</strong>
                    </p>

                    <p>{animal.animalCode}</p>

                    <p>
                      {animal.species} · {animal.sex}
                    </p>

                    <p>
                      <strong>Assigned:</strong>{" "}
                      {new Date(animal.assignedAt).toLocaleString()}
                    </p>

                    <p>
                      <strong>Reason:</strong>{" "}
                      {animal.reason || "Not specified"}
                    </p>

                    <button
                      type="button"
                      onClick={() => setMovingAnimal(animal)}
                    >
                      Move
                    </button>

                    <button
                      type="button"
                      onClick={() => setRemovingAnimal(animal)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No animals currently assigned.</p>
            )}
          </section>

          <button type="button" onClick={() => setIsAssignModalOpen(true)}>
            Assign Animal
          </button>

          <button type="button" onClick={() => setIsEditModalOpen(true)}>
            Edit Cage
          </button>
        </div>

        {isAssignModalOpen && (
          <AssignAnimalModal
            cage={cage}
            onClose={() => setIsAssignModalOpen(false)}
            onAssigned={() => {
              setRefreshKey((current) => current + 1);
              onAssignmentsChanged?.();
            }}
          />
        )}
        {isEditModalOpen && (
          <EditCageModal
            cage={cage}
            onClose={() => setIsEditModalOpen(false)}
            onUpdated={(updatedCage) => {
              setCage((current) => ({
                ...current,
                ...updatedCage,
              }));

              onCageUpdated?.(updatedCage);
            }}
          />
        )}

        {movingAnimal && (
          <MoveAnimalModal
            animal={movingAnimal}
            currentCage={cage}
            onClose={() => setMovingAnimal(null)}
            onMoved={() => {
              setRefreshKey((current) => current + 1);
              onAssignmentsChanged?.();
            }}
          />
        )}
        {removingAnimal && (
          <RemoveAnimalModal
            animal={removingAnimal}
            onClose={() => setRemovingAnimal(null)}
            onRemoved={() => {
              setRefreshKey((current) => current + 1);
              onAssignmentsChanged?.();
            }}
          />
        )}
      </aside>
    </>
  );
}

export default CageDetailsDrawer;
