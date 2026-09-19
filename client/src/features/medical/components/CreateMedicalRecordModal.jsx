import { useEffect, useState } from "react";

import { getAnimals } from "../../animals/api/animalApi";

import { createMedicalRecord } from "../api/medicalApi";

import { useToast } from "../../../components/feedback/ToastContext";

import "./MedicalModal.css";

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function CreateMedicalRecordModal({ onClose, onCreated }) {
  const [animals, setAnimals] = useState([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    animalId: "",
    medicalType: "VET_VISIT",
    medicalDate: getManilaDate(),
    reason: "",
    clinic: "",
    vetName: "",
    diagnosis: "",
    treatment: "",
    followUpDate: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchAnimals() {
      try {
        const data = await getAnimals();
        setAnimals(data.animals);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load animals.");
      } finally {
        setLoadingAnimals(false);
      }
    }

    fetchAnimals();
  }, []);

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
    setSubmitError("");

    try {
      const data = await createMedicalRecord(formData);

      showToast("Medical record created successfully", "success");

      onCreated?.(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to create medical record.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="medical-modal-backdrop" onClick={onClose}>
      <div
        className="medical-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="medical-modal-header">
          <h2>Add Medical Record</h2>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {loadingAnimals && <p>Loading animals...</p>}

        {error && <p className="medical-modal-error">{error}</p>}

        {!loadingAnimals && !error && (
          <form className="medical-form" onSubmit={handleSubmit}>
            <label>
              Animal
              <select
                name="animalId"
                value={formData.animalId}
                onChange={handleChange}
                required
              >
                <option value="">Select animal</option>

                {animals.map((animal) => (
                  <option key={animal.animalId} value={animal.animalId}>
                    {animal.animalName || animal.animalCode}
                    {animal.animalName ? ` (${animal.animalCode})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Medical Type
              <select
                name="medicalType"
                value={formData.medicalType}
                onChange={handleChange}
              >
                <option value="VET_VISIT">Vet Visit</option>
                <option value="TREATMENT">Treatment</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              Medical Date
              <input
                type="date"
                name="medicalDate"
                value={formData.medicalDate}
                onChange={handleChange}
                max={getManilaDate()}
                required
              />
            </label>

            <label>
              Reason
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Clinic
              <input
                type="text"
                name="clinic"
                value={formData.clinic}
                onChange={handleChange}
                maxLength={150}
              />
            </label>

            <label>
              Vet Name
              <input
                type="text"
                name="vetName"
                value={formData.vetName}
                onChange={handleChange}
                maxLength={100}
              />
            </label>

            <label>
              Diagnosis
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
              />
            </label>

            <label>
              Treatment
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
              />
            </label>

            <label>
              Follow-up Date
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                min={formData.medicalDate || undefined}
              />
            </label>

            <label>
              Notes
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </label>

            {submitError && (
              <p className="medical-modal-error">{submitError}</p>
            )}

            <div className="medical-form-actions">
              <button type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </button>

              <button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create Medical Record"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreateMedicalRecordModal;
