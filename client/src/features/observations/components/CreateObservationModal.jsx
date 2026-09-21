import { useEffect, useState } from "react";

import { getAnimals } from "../../animals/api/animalApi";
import { getCages, getCageById } from "../../cages/api/cageApi";

import { createObservation } from "../api/observationApi";

import { useToast } from "../../../components/feedback/ToastContext";

function CreateObservationModal({ onClose, onCreated }) {
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [cages, setCages] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [loadingAnimals, setLoadingAnimals] = useState(false);

  const [formData, setFormData] = useState({
    cageId: "",
    animalId: "",
    observationType: "",
    urgency: "NORMAL",
    notes: "",
    photo: null,
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
        photo: null,
      };

      const data = await createObservation(payload);

      onCreated?.(data.observation);

      showToast("Observation created successfully");

      onClose();
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to create observation.",
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

        setFormData((current) => ({
          ...current,
          animalId: "",
        }));

        return;
      }

      try {
        setLoadingAnimals(true);

        const data = await getCageById(formData.cageId);

        setAnimals(data.cage.assignedAnimals);

        setFormData((current) => ({
          ...current,
          animalId: "",
        }));
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
    <div className="observation-modal-backdrop">
      <div className="observation-modal">
        <div className="observation-modal-header">
          <h2>Create Observation</h2>

          <button type="button" onClick={onClose}>
            ✕
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
              <option value="">
                {loadingOptions ? "Loading cages..." : "Select cage"}
              </option>

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
              <option value="">
                {loadingAnimals
                  ? "Loading animals..."
                  : "Cage-level observation"}
              </option>

              {animals.map((animal) => (
                <option key={animal.animalId} value={animal.animalId}>
                  {animal.animalName || "Unnamed"} ({animal.animalCode})
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
              <option value="">Select observation type</option>
              <option value="NOT_EATING">Not Eating</option>
              <option value="VOMITING">Vomiting</option>
              <option value="DIARRHEA">Diarrhea</option>
              <option value="INJURY">Injury</option>
              <option value="LIMPING">Limping</option>
              <option value="FIGHTING">Fighting</option>
              <option value="EYE_NOSE_DISCHARGE">Eye / Nose Discharge</option>
              <option value="UNUSUAL_BEHAVIOR">Unusual Behavior</option>
              <option value="CAGE_CONCERN">Cage Concern</option>
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
              <option value="NEEDS_ATTENTION">Needs Attention</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
            />
          </label>

          {error && <p className="observation-form-error">{error}</p>}

          <div className="observation-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>

            <button type="submit" disabled={submitting || loadingOptions}>
              {submitting ? "Creating..." : "Create Observation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateObservationModal;
