import { useState } from "react";
import { createCage } from "../api/cageApi";

import "./CreateCageModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function CreateCageModal({ onClose, onCreated }) {
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [formData, setFormData] = useState({
    speciesGroup: "CAT",
    genderGroup: "FEMALE",
    recommendedCapacity: 1,
    cageType: "NORMAL",
    status: "ACTIVE",
    location: "",
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
      const data = await createCage(formData, idempotencyKey);

      onCreated?.(data.cage);

      showToast("Cage created successfully");

      onClose();
    } catch (error) {
      setError(error.response?.data?.message || "Unable to create cage.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-cage-modal-backdrop" onClick={onClose}>
      <div
        className="create-cage-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="create-cage-modal-header">
          <h2>Add Cage</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close create cage modal"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Species group
            <select
              name="speciesGroup"
              value={formData.speciesGroup}
              onChange={handleChange}
            >
              <option value="CAT">Cat</option>
              <option value="DOG">Dog</option>
            </select>
          </label>
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
              name="recommendedCapacity"
              min="1"
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
          {error && <p>{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Cage"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCageModal;
