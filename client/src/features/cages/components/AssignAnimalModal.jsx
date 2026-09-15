import { useEffect, useState } from "react";

import { getAnimals } from "../../animals/api/animalApi";

import {
  createCageAssignment,
  getCurrentAssignments,
} from "../api/cageAssignmentApi";

function AssignAnimalModal({ cage, onClose, onAssigned }) {
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function fetchEligibleAnimals() {
      try {
        const [animalsData, assignmentsData] = await Promise.all([
          getAnimals({
            species: cage.speciesGroup,
            status: "ACTIVE",
            limit: 100,
          }),
          getCurrentAssignments(),
        ]);

        const assignedAnimalIds = new Set(
          assignmentsData.assignments.map((assignment) => assignment.animalId),
        );

        const eligibleAnimals = animalsData.animals.filter(
          (animal) => !assignedAnimalIds.has(animal.animalId),
        );

        setAnimals(eligibleAnimals);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load available animals.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchEligibleAnimals();
  }, [cage.speciesGroup]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAnimalId) {
      setSubmitError("Please select an animal.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        animalId: selectedAnimalId,
        cageId: cage.cageId,
        ...(reason.trim() && { reason: reason.trim() }),
      };

      const data = await createCageAssignment(payload);

      onAssigned?.(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to assign animal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="assign-animal-modal-backdrop" onClick={onClose}>
      <div
        className="assign-animal-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="assign-animal-modal-header">
          <div>
            <h2>Assign Animal</h2>
            <p>{cage.cageCode}</p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && <p>Loading animals...</p>}

        {error && <p>{error}</p>}

        {!loading && !error && (
          <form onSubmit={handleSubmit}>
            <label>
              Animal
              <select
                value={selectedAnimalId}
                onChange={(event) => setSelectedAnimalId(event.target.value)}
              >
                <option value="">Select an animal</option>

                {animals.map((animal) => (
                  <option key={animal.animalId} value={animal.animalId}>
                    {animal.animalCode} - {animal.animalName || "Unnamed"} (
                    {animal.sex})
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
            <button type="submit" disabled={submitting || !selectedAnimalId}>
              {submitting ? "Assigning..." : "Assign Animal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AssignAnimalModal;
