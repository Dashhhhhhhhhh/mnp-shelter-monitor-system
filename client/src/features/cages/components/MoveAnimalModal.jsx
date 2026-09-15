import { useEffect, useState } from "react";

import { getCages } from "../api/cageApi";

import { moveAnimal } from "../api/cageAssignmentApi";

import "./MoveAnimalModal.css";

function MoveAnimalModal({ animal, currentCage, onClose, onMoved }) {
  const [cages, setCages] = useState([]);

  const [destinationCageId, setDestinationCageId] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function fetchDestinationCages() {
      try {
        const data = await getCages();

        const eligibleCages = data.cages.filter(
          (cage) =>
            cage.cageId !== currentCage.cageId &&
            cage.status === "ACTIVE" &&
            cage.speciesGroup === animal.species,
        );

        setCages(eligibleCages);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load destination cages.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDestinationCages();
  }, [animal.species, currentCage.cageId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!destinationCageId) {
      setSubmitError("Please select a destination cage.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        cageId: destinationCageId,
        ...(reason.trim() && { reason: reason.trim() }),
      };

      const data = await moveAnimal(animal.animalId, payload);

      onMoved?.(data);
      onClose();
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Unable to move animal.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="move-animal-modal-backdrop" onClick={onClose}>
      <div
        className="move-animal-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="move-animal-modal-header">
          <div>
            <h2>Move Animal</h2>
            <p>{animal.animalName || animal.animalCode}</p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && <p>Loading cages...</p>}

        {error && <p>{error}</p>}

        {!loading && !error && (
          <>
            <p>
              Current cage: <strong>{currentCage.cageCode}</strong>
            </p>

            <form onSubmit={handleSubmit}>
              <label>
                Destination cage
                <select
                  value={destinationCageId}
                  onChange={(event) => setDestinationCageId(event.target.value)}
                >
                  <option value="">Select a cage</option>

                  {cages.map((cage) => (
                    <option key={cage.cageId} value={cage.cageId}>
                      {cage.cageCode} -{" "}
                      {cage.location || "Location not specified"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Reason
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Optional reason"
                />
              </label>
              {submitError && <p>{submitError}</p>}

              <button type="submit" disabled={submitting || !destinationCageId}>
                {submitting ? "Moving..." : "Move Animal"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default MoveAnimalModal;
