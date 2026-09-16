import { useState } from "react";
import { updateCage } from "../api/cageApi";

import "./EditCageModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function EditCageModal({ cage, onClose, onUpdated }) {
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    genderGroup: cage.genderGroup,
    recommendedCapacity: cage.recommendedCapacity,
    cageType: cage.cageType,
    status: cage.status,
    location: cage.location || "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: name === "recommendedCapacity" ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const data = await updateCage(cage.cageId, formData);

      showToast("Cage updated successfully");

      onUpdated?.(data.cage);
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || "Unable to update cage.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="edit-cage-modal-backdrop" onClick={onClose}>
      <div
        className="edit-cage-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="edit-cage-modal-header">
          <div>
            <h2>Edit Cage</h2>
            <p>{cage.cageCode}</p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Gender group
            <select
              name="genderGroup"
              value={formData.genderGroup}
              onChange={handleChange}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="MIXED">Mixed</option>
            </select>
          </label>
          <label>
            Recommended capacity
            <input
              type="number"
              min="1"
              name="recommendedCapacity"
              value={formData.recommendedCapacity}
              onChange={handleChange}
            />
          </label>
          <label>
            Cage type
            <select
              name="cageType"
              value={formData.cageType}
              onChange={handleChange}
            >
              <option value="NORMAL">Normal</option>
              <option value="ISOLATION">Isolation</option>
              <option value="TEMPORARY">Temporary</option>
            </select>
          </label>
          <label>
            Status
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PLANNED">Planned</option>
            </select>
          </label>
          <label>
            Location
            <input
              type="text"
              name="location"
              maxLength="100"
              value={formData.location}
              onChange={handleChange}
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditCageModal;
