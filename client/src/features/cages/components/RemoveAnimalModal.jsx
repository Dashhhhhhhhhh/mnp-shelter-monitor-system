import { useState } from "react";
import { removeCageAssignment } from "../api/cageAssignmentApi";

import "./RemoveAnimalModal.css";

function RemoveAnimalModal({ animal, onClose, onRemoved }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    setSubmitting(true);
    setError("");

    try {
      const data = await removeCageAssignment(animal.assignmentId);

      onRemoved?.(data.assignment);
      onClose();
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to remove animal from cage.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="remove-animal-modal-backdrop" onClick={onClose}>
      <div
        className="remove-animal-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Remove Animal</h2>

        <p>
          Remove <strong>{animal.animalName || animal.animalCode}</strong> from
          this cage?
        </p>

        {error && <p>{error}</p>}

        <button type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>

        <button type="button" onClick={handleRemove} disabled={submitting}>
          {submitting ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default RemoveAnimalModal;
