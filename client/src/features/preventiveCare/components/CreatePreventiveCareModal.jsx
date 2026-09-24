import { useState } from "react";

import { createPreventiveCare } from "../api/preventiveCareApi";

import { useToast } from "../../../components/feedback/ToastContext";

import { createPortal } from "react-dom";

import "./CreatePreventiveCareModal.css";

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function CreatePreventiveCareModal({ animalId, onClose, onCreated }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    medicalRecordId: null,
    careType: "",
    dateGiven: "",
    productName: "",
    dose: "",
    nextDueDate: "",
    clinic: "",
    vetName: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const today = getManilaDate();

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
      const data = {
        animalId,
        ...formData,
        nextDueDate: formData.nextDueDate || null,
      };

      const response = await createPreventiveCare(data);

      showToast("Preventive care added successfully");

      onCreated?.(response.preventiveCare);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          "Unable to create preventive care record.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="preventive-care-modal-backdrop" onClick={onClose}>
      <div
        className="preventive-care-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Add Preventive Care</h2>

        <form className="preventive-care-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="careType">Care type</label>

            <select
              id="careType"
              name="careType"
              value={formData.careType}
              onChange={handleChange}
              required
            >
              <option value="">Select care type</option>
              <option value="VACCINATION">Vaccination</option>
              <option value="DEWORMING">Deworming</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateGiven">Date given</label>

            <input
              id="dateGiven"
              type="date"
              name="dateGiven"
              value={formData.dateGiven}
              onChange={handleChange}
              max={today}
              required
            />
          </div>
          <div>
            <label htmlFor="productName">Product name</label>

            <input
              id="productName"
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="dose">Dose</label>

            <input
              id="dose"
              type="text"
              name="dose"
              value={formData.dose}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="nextDueDate">Next due date</label>

            <input
              id="nextDueDate"
              type="date"
              name="nextDueDate"
              value={formData.nextDueDate}
              onChange={handleChange}
              min={formData.dateGiven || undefined}
            />
          </div>
          <div>
            <label htmlFor="clinic">Clinic</label>

            <input
              id="clinic"
              type="text"
              name="clinic"
              value={formData.clinic}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="vetName">Vet name</label>

            <input
              id="vetName"
              type="text"
              name="vetName"
              value={formData.vetName}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="notes">Notes</label>

            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
          {submitError && (
            <p className="preventive-care-form-error">{submitError}</p>
          )}
          <div className="preventive-care-form-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>

            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Preventive Care"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default CreatePreventiveCareModal;
