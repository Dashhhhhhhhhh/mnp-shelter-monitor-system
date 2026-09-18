import { useEffect, useState } from "react";

import { getCageById } from "../api/cageApi";

import { getCareRecordsForCage } from "../../care/api/careApi";

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

  const [careRecords, setCareRecords] = useState([]);
  const [loadingCareRecords, setLoadingCareRecords] = useState(false);
  const [careRecordsError, setCareRecordsError] = useState("");

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

  useEffect(() => {
    if (!cageId) return;

    async function fetchCareRecords() {
      setLoadingCareRecords(true);
      setCareRecordsError("");

      try {
        const data = await getCareRecordsForCage(cageId);

        setCareRecords(data.careRecords);
      } catch (error) {
        setCareRecordsError(
          error.response?.data?.message || "Unable to load care history.",
        );
      } finally {
        setLoadingCareRecords(false);
      }
    }

    fetchCareRecords();
  }, [cageId]);

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

                    <section className="cage-details-section">
                      <h3>Care History</h3>

                      {loadingCareRecords && <p>Loading care history...</p>}

                      {careRecordsError && <p>{careRecordsError}</p>}

                      {!loadingCareRecords &&
                        !careRecordsError &&
                        careRecords.length === 0 && (
                          <p>No care records for this cage.</p>
                        )}

                      {!loadingCareRecords &&
                        !careRecordsError &&
                        careRecords.length > 0 && (
                          <div className="cage-care-history">
                            {careRecords.map((record) => (
                              <div
                                key={record.careRecordId}
                                className="cage-care-history-item"
                              >
                                <div className="cage-care-history-header">
                                  <strong>
                                    {record.careDate} · {record.carePeriod}
                                  </strong>

                                  <span
                                    className={`cage-care-status ${
                                      record.isOverdue
                                        ? "cage-care-status-overdue"
                                        : record.status === "COMPLETED"
                                          ? "cage-care-status-completed"
                                          : "cage-care-status-pending"
                                    }`}
                                  >
                                    {record.isOverdue
                                      ? "OVERDUE"
                                      : record.status}
                                  </span>
                                </div>

                                <p>
                                  {record.careType}
                                  {record.cleaningType
                                    ? ` · ${record.cleaningType}`
                                    : ""}
                                </p>

                                {record.participants?.length > 0 && (
                                  <p>
                                    <strong>Performed by:</strong>{" "}
                                    {record.participants
                                      .map((participant) => {
                                        const middleInitial =
                                          participant.middleInitial
                                            ? `${participant.middleInitial}. `
                                            : "";

                                        return `${participant.firstName} ${middleInitial}${participant.lastName}`;
                                      })
                                      .join(", ")}
                                  </p>
                                )}

                                {record.notes && (
                                  <p>
                                    <strong>Notes:</strong> {record.notes}
                                  </p>
                                )}

                                {record.status === "COMPLETED" &&
                                  record.completedAt && (
                                    <p>
                                      <strong>Completed:</strong>{" "}
                                      {new Date(
                                        record.completedAt,
                                      ).toLocaleString("en-PH", {
                                        timeZone: "Asia/Manila",
                                      })}
                                    </p>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                    </section>

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
