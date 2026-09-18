import { useEffect, useState } from "react";

import { getCages } from "../../cages/api/cageApi";

import { createCareRecord } from "../api/careApi";

import "./ScheduleCareModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function ScheduleCareModal({ onClose, selectedDate, onCreated }) {
  const { showToast } = useToast();

  const [cages, setCages] = useState([]);
  const [loadingCages, setLoadingCages] = useState(true);

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    cageId: "",
    careDate: selectedDate,
    carePeriod: "AM",
    careType: "FEEDING",
    cleaningType: "",
    notes: "",
  });

  const selectedCage = cages.find((cage) => cage.cageId === formData.cageId);

  useEffect(() => {
    async function fetchCages() {
      try {
        const data = await getCages();
        setCages(data.cages);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load cages.");
      } finally {
        setLoadingCages(false);
      }
    }

    fetchCages();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "cageId") {
      setFormData((current) => ({
        ...current,
        cageId: value,
        careType: "FEEDING",
        cleaningType: "",
      }));

      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setSubmitError("");

      const payload = {
        ...formData,
        cleaningType:
          formData.careType === "CLEANING" ? formData.cleaningType : null,
      };

      const data = await createCareRecord(payload);
      showToast("Care scheduled successfully", "success");

      onCreated?.(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to schedule care.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="schedule-care-modal-backdrop" onClick={onClose}>
      <div
        className="schedule-care-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="schedule-care-modal-header">
          <h2>Schedule Care</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close schedule care"
          >
            ✕
          </button>
        </div>

        {loadingCages && <p>Loading cages...</p>}
        {error && <p>{error}</p>}

        <form className="schedule-care-form" onSubmit={handleSubmit}>
          <label htmlFor="cageId">Cage</label>
          <select
            id="cageId"
            name="cageId"
            value={formData.cageId}
            onChange={handleChange}
            required
          >
            <option value="">Select a cage</option>

            {cages
              .filter((cage) => cage.status === "ACTIVE")
              .map((cage) => (
                <option key={cage.cageId} value={cage.cageId}>
                  {cage.cageCode} - {cage.speciesGroup}
                </option>
              ))}
          </select>
          <label htmlFor="careDate">Care date</label>
          <input
            id="careDate"
            name="careDate"
            type="date"
            value={formData.careDate}
            onChange={handleChange}
            required
          />
          <label htmlFor="carePeriod">Care period</label>
          <select
            id="carePeriod"
            name="carePeriod"
            value={formData.carePeriod}
            onChange={handleChange}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="EXTRA">EXTRA</option>
          </select>
          <label htmlFor="careType">Care type</label>
          <select
            id="careType"
            name="careType"
            value={formData.careType}
            onChange={handleChange}
          >
            <option value="FEEDING">Feeding</option>
            <option value="CLEANING">Cleaning</option>

            {selectedCage?.speciesGroup === "DOG" && (
              <option value="RELIEF_BREAK">Relief Break</option>
            )}
          </select>
          {formData.careType === "CLEANING" && (
            <>
              <label htmlFor="cleaningType">Cleaning type</label>

              <select
                id="cleaningType"
                name="cleaningType"
                value={formData.cleaningType}
                onChange={handleChange}
                required
              >
                <option value="">Select cleaning type</option>

                {selectedCage?.speciesGroup === "CAT" && (
                  <option value="LITTER_BOX">Litter Box</option>
                )}

                <option value="FULL_CAGE">Full Cage</option>
              </select>
            </>
          )}
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes"
          />
          <div className="schedule-care-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule Care"}
            </button>

            {submitError && (
              <p className="schedule-care-error">{submitError}</p>
            )}
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleCareModal;
