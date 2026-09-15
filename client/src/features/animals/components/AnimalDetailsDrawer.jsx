import { useEffect, useState } from "react";
import { getAnimalById, archiveAnimal } from "../api/animalApi";

import "./AnimalDetailsDrawer.css";

import EditAnimalModal from "./EditAnimalModal";

import useAuth from "../../auth/hooks/useAuth";

function AnimalDetailsDrawer({
  animalId,
  onClose,
  onAnimalUpdated,
  onAnimalArchived,
}) {
  const { user } = useAuth();

  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [archiving, setArchiving] = useState(false);

  function formatDate(date) {
    if (!date) return "Unknown";

    return new Date(date).toLocaleDateString();
  }

  function formatStatusLabel(value) {
    if (!value) return "Unknown";

    return value.replaceAll("_", " ");
  }

  function getStatusClass(value) {
    if (!value) return "unknown";

    return value.toLowerCase().replaceAll("_", "-");
  }

  function formatDateTime(date) {
    if (!date) return "Unknown";

    return new Date(date).toLocaleString();
  }

  useEffect(() => {
    if (!animalId) return;

    async function fetchAnimal() {
      setLoading(true);
      setError("");

      try {
        const data = await getAnimalById(animalId);

        setAnimal(data.animal);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load animal details.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAnimal();
  }, [animalId]);

  async function handleArchiveAnimal() {
    const confirmed = window.confirm(
      `Archive ${animal.animalName || animal.animalCode}?`,
    );

    if (!confirmed) return;

    setArchiving(true);

    try {
      await archiveAnimal(animal.animalId);

      onAnimalArchived?.();
    } catch (error) {
      console.error("Archive animal error:", error);
    } finally {
      setArchiving(false);
    }
  }

  if (!animalId) {
    return null;
  }

  if (loading) {
    return <p>Loading animal...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!animal) {
    return null;
  }

  return (
    <>
      <div className="animal-drawer-backdrop" onClick={onClose} />

      <aside className="animal-drawer">
        <div className="animal-drawer-header">
          <div>
            <h2>{animal.animalName || "Unnamed"}</h2>
            <p>{animal.animalCode}</p>
          </div>

          <div className="animal-drawer-actions">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="animal-drawer-edit"
            >
              Edit
            </button>

            <button
              type="button"
              className="animal-drawer-close"
              onClick={onClose}
              aria-label="Close animal details"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="animal-drawer-content">
          <div className="animal-photo-placeholder">Animal Photo</div>

          <div>
            <div className="animal-details">
              <section className="animal-details-section">
                <h3>Animal Information</h3>

                <p>
                  <strong>Species:</strong> {animal.species}
                </p>
                <p>
                  <strong>Breed:</strong> {animal.breed || "Not specified"}
                </p>
                <p>
                  <strong>Life stage:</strong> {animal.lifeStage}
                </p>
                <p>
                  <strong>Sex:</strong> {animal.sex}
                </p>
                <p>
                  <strong>Collar color:</strong> {animal.collarColor || "None"}
                </p>
                <p>
                  <strong>Birth date:</strong> {formatDate(animal.birthDate)}
                  {animal.birthDateIsEstimated ? " (estimated)" : ""}
                </p>
              </section>
              <section className="animal-details-section">
                <h3>Current Status</h3>
                <p>
                  <strong>Health:</strong>
                  <span
                    className={`animal-status-badge ${getStatusClass(animal.healthStatus)}`}
                  >
                    {formatStatusLabel(animal.healthStatus)}
                  </span>
                </p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className={`animal-status-badge ${getStatusClass(animal.status)}`}
                  >
                    {formatStatusLabel(animal.status)}
                  </span>
                </p>
                <p>
                  <strong>Adoption:</strong>
                  <span
                    className={`animal-status-badge ${getStatusClass(animal.adoptionStatus)}`}
                  >
                    {formatStatusLabel(animal.adoptionStatus)}
                  </span>
                </p>
              </section>
              <section className="animal-details-section">
                <h3>Current Housing</h3>

                {animal.currentCage ? (
                  <>
                    <p>
                      <strong>Cage:</strong> {animal.currentCage.cageCode}
                    </p>

                    <p>
                      <strong>Type:</strong>{" "}
                      {formatStatusLabel(animal.currentCage.cageType)}
                    </p>

                    <p>
                      <strong>Location:</strong>
                      {animal.currentCage.location || "Not specified"}
                    </p>

                    <p>
                      <strong>Assigned:</strong>
                      {formatDateTime(animal.currentCage.assignedAt)}
                    </p>

                    <p>
                      <strong>Reason:</strong>
                      {animal.currentCage.reason || "Not specified"}
                    </p>
                  </>
                ) : (
                  <p>Not currently assigned to a cage.</p>
                )}
              </section>
              <section className="animal-details-section">
                <h3>Intake Information</h3>

                {animal.latestIntake ? (
                  <>
                    <p>
                      <strong>Intake date:</strong>{" "}
                      {formatDate(animal.latestIntake.intakeDate)}
                    </p>

                    <p>
                      <strong>Category:</strong>{" "}
                      {formatStatusLabel(animal.latestIntake.intakeCategory)}
                    </p>

                    <p>
                      <strong>Source:</strong>{" "}
                      {formatStatusLabel(animal.latestIntake.intakeSource)}
                    </p>

                    <p>
                      <strong>Found location:</strong>{" "}
                      {animal.latestIntake.foundLocation || "Not specified"}
                    </p>

                    <p>
                      <strong>Age at intake:</strong>{" "}
                      {animal.latestIntake.ageAtIntake || "Not specified"}
                    </p>

                    <p>
                      <strong>Condition:</strong>{" "}
                      {animal.latestIntake.observedCondition || "Not specified"}
                    </p>

                    {animal.latestIntake.intakeSource === "MNP_VOLUNTEER" &&
                      animal.latestIntake.rescuedByName && (
                        <p>
                          <strong>Rescued by:</strong>{" "}
                          {animal.latestIntake.rescuedByName}
                        </p>
                      )}

                    {animal.latestIntake.intakeSource === "OUTSIDE_PERSON" && (
                      <>
                        <p>
                          <strong>Outside rescuer:</strong>{" "}
                          {animal.latestIntake.outsideRescuerName ||
                            "Not specified"}
                        </p>

                        <p>
                          <strong>Rescuer contact:</strong>{" "}
                          {animal.latestIntake.outsideRescuerContact ||
                            "Not specified"}
                        </p>
                      </>
                    )}
                    <p>
                      <strong>Notes:</strong>{" "}
                      {animal.latestIntake.notes || "None"}
                    </p>
                  </>
                ) : (
                  <p>No intake information recorded.</p>
                )}
              </section>
              <section className="animal-details-section">
                <h3>Record Information</h3>

                <p>
                  <strong>Created:</strong> {formatDateTime(animal.createdAt)}
                </p>

                <p>
                  <strong>Last updated:</strong>{" "}
                  {formatDateTime(animal.updatedAt)}
                </p>

                {user?.role === "ADMIN" && (
                  <button
                    type="button"
                    className="animal-archive-button"
                    onClick={handleArchiveAnimal}
                    disabled={archiving}
                  >
                    {archiving ? "Archiving..." : "Archive Animal"}
                  </button>
                )}
              </section>
              {isEditModalOpen && (
                <EditAnimalModal
                  animal={animal}
                  onClose={() => setIsEditModalOpen(false)}
                  onUpdated={(updatedAnimal) => {
                    setAnimal((currentAnimal) => ({
                      ...currentAnimal,
                      ...updatedAnimal,
                    }));

                    onAnimalUpdated?.(updatedAnimal);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AnimalDetailsDrawer;
