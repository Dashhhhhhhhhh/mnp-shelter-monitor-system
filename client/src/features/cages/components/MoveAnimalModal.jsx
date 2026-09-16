import { useEffect, useState } from "react";

import { getCages } from "../api/cageApi";

import { moveAnimal } from "../api/cageAssignmentApi";

import "./MoveAnimalModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function MoveAnimalModal({ animal, currentCage, onClose, onMoved }) {
  const { showToast } = useToast();

  const [cages, setCages] = useState([]);

  const [destinationCageId, setDestinationCageId] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [warnings, setWarnings] = useState([]);
  const [completedData, setCompletedData] = useState(null);

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

      if (data.warnings?.length > 0) {
        setWarnings(data.warnings);
        setCompletedData(data);
        return;
      }

      onMoved?.(data);

      showToast("Animal moved successfully");

      onClose();
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Unable to move animal.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleModalClose() {
    if (completedData) {
      onMoved?.(completedData);
    }

    onClose();
  }
  return (
    <div className="move-animal-modal-backdrop" onClick={handleModalClose}>
      <div
        className="move-animal-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="move-animal-modal-header">
          <div>
            <h2>Move Animal</h2>
            <p>{animal.animalName || animal.animalCode}</p>
          </div>

          <button type="button" onClick={handleModalClose}>
            ✕
          </button>
        </div>

        {!loading && !error && (
          <>
            <p>
              Current cage: <strong>{currentCage.cageCode}</strong>
            </p>

            {!loading &&
              !error &&
              (completedData ? (
                <div className="move-warning">
                  <h3>Move completed with warning</h3>

                  {warnings.map((warning) => (
                    <p key={warning}>⚠ {warning}</p>
                  ))}

                  <button type="button" onClick={handleModalClose}>
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <label>
                    Destination cage
                    <select
                      value={destinationCageId}
                      onChange={(event) =>
                        setDestinationCageId(event.target.value)
                      }
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

                  <button
                    type="submit"
                    disabled={submitting || !destinationCageId}
                  >
                    {submitting ? "Moving..." : "Move Animal"}
                  </button>
                </form>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

export default MoveAnimalModal;
