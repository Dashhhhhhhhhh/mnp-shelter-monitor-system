import { useState } from "react";

import { updateMedicalRecord } from "../api/medicalApi";

import { useToast } from "../../../components/feedback/ToastContext";

import "./MedicalModal.css";

function EditMedicalRecordModal({ record, onClose, onUpdated }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    medicalType: record.medicalType || "VET_VISIT",
    medicalDate: record.medicalDate || "",
    reason: record.reason || "",
    clinic: record.clinic || "",
    vetName: record.vetName || "",
    diagnosis: record.diagnosis || "",
    treatment: record.treatment || "",
    followUpDate: record.followUpDate || "",
    notes: record.notes || "",
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
    setSubmitError("");

    try {
      const payload = {
        medicalType: formData.medicalType,
        medicalDate: formData.medicalDate,
        reason: formData.reason,
        clinic: formData.clinic || null,
        vetName: formData.vetName || null,
        diagnosis: formData.diagnosis || null,
        treatment: formData.treatment || null,
        followUpDate: formData.followUpDate || null,
        notes: formData.notes || null,
      };

      const data = await updateMedicalRecord(record.medicalRecordId, payload);

      showToast("Medical record updated successfully", "success");

      onUpdated?.(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to update medical record.",
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
          <div>
            <h2>Edit Medical Record</h2>
            <p>{record.animalName || record.animalCode}</p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="medical-form" onSubmit={handleSubmit}>
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

          {submitError && <p className="medical-modal-error">{submitError}</p>}

          <div className="medical-form-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMedicalRecordModal;
