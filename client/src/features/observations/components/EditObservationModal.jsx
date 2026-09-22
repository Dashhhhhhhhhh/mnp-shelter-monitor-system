import { useEffect, useState } from "react";
import { updateObservation } from "../api/observationApi";

import { getCages, getCageById } from "../../cages/api/cageApi";

import "./ObservationModal.css";

function EditObservationModal({ observation, onClose, onUpdated }) {
  const [cages, setCages] = useState([]);
  const [animals, setAnimals] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    cageId: observation.cageId || "",
    animalId: observation.animalId || "",
    observationType: observation.observationType || "",
    urgency: observation.urgency || "NORMAL",
    notes: observation.notes || "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        cageId: formData.cageId,
        animalId: formData.animalId || null,
        observationType: formData.observationType,
        urgency: formData.urgency,
        notes: formData.notes || null,
      };

      const data = await updateObservation(observation.observationId, payload);

      onUpdated?.(data.observation);
      onClose();
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to update observation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    async function fetchCages() {
      try {
        const data = await getCages();

        setCages(data.cages);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load cages.");
      } finally {
        setLoadingOptions(false);
      }
    }

    fetchCages();
  }, []);

  useEffect(() => {
    async function fetchCageAnimals() {
      if (!formData.cageId) {
        setAnimals([]);
        return;
      }

      try {
        setLoadingAnimals(true);

        const data = await getCageById(formData.cageId);

        const assignedAnimals = data.cage.assignedAnimals;

        setAnimals(assignedAnimals);

        setFormData((current) => {
          const animalStillInCage = assignedAnimals.some(
            (animal) => animal.animalId === current.animalId,
          );

          return {
            ...current,
            animalId: animalStillInCage ? current.animalId : "",
          };
        });
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load animals for this cage.",
        );
      } finally {
        setLoadingAnimals(false);
      }
    }

    fetchCageAnimals();
  }, [formData.cageId]);

  return (
    <div className="observation-modal-backdrop" onClick={onClose}>
      <div
        className="observation-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="observation-modal-header">
          <h2>Edit Observation</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Cage
            <select
              name="cageId"
              value={formData.cageId}
              onChange={handleChange}
              required
              disabled={loadingOptions}
            >
              <option value="">Select cage</option>

              {cages
                .filter((cage) => cage.status === "ACTIVE")
                .map((cage) => (
                  <option key={cage.cageId} value={cage.cageId}>
                    {cage.cageCode} - {cage.speciesGroup}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Animal
            <select
              name="animalId"
              value={formData.animalId}
              onChange={handleChange}
              disabled={!formData.cageId || loadingAnimals}
            >
              <option value="">No specific animal (Cage-level)</option>

              {animals.map((animal) => (
                <option key={animal.animalId} value={animal.animalId}>
                  {animal.animalName || animal.animalCode}
                </option>
              ))}
            </select>
          </label>

          <label>
            Observation Type
            <select
              name="observationType"
              value={formData.observationType}
              onChange={handleChange}
              required
            >
              <option value="">Select type</option>
              <option value="NOT_EATING">Not eating</option>
              <option value="VOMITING">Vomiting</option>
              <option value="DIARRHEA">Diarrhea</option>
              <option value="INJURY">Injury</option>
              <option value="LIMPING">Limping</option>
              <option value="FIGHTING">Fighting</option>
              <option value="EYE_NOSE_DISCHARGE">Eye / nose discharge</option>
              <option value="UNUSUAL_BEHAVIOR">Unusual behavior</option>
              <option value="CAGE_CONCERN">Cage concern</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label>
            Urgency
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
            >
              <option value="NORMAL">Normal</option>
              <option value="NEEDS_ATTENTION">Needs attention</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </label>

          {error && <p>{error}</p>}

          <div className="observation-modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loadingOptions || loadingAnimals}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditObservationModal;
