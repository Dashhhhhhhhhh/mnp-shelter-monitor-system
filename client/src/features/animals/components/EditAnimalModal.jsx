import { useState } from "react";

import { updateAnimal } from "../api/animalApi";

import "./EditAnimalModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function EditAnimalModal({ animal, onClose, onUpdated }) {
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    animalName: animal.animalName || "",
    breed: animal.breed || "",
    lifeStage: animal.lifeStage || "",
    sex: animal.sex || "",
    collarColor: animal.collarColor || "",
    birthDate: animal.birthDate ? animal.birthDate.slice(0, 10) : "",
    birthDateIsEstimated: animal.birthDateIsEstimated || false,
    healthStatus: animal.healthStatus || "",
  });

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        animalName: formData.animalName || null,
        breed: formData.breed || null,
        lifeStage: formData.lifeStage,
        sex: formData.sex,
        collarColor: formData.collarColor || null,
        birthDate: formData.birthDate || null,
        birthDateIsEstimated: formData.birthDate
          ? formData.birthDateIsEstimated
          : false,
        healthStatus: formData.healthStatus,
      };

      const data = await updateAnimal(animal.animalId, payload);

      onUpdated(data.animal);

      showToast("Animal updated successfully");

      onClose();
    } catch (error) {
      console.error("Edit animal error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update animal.",
      );
    }
  }

  return (
    <div className="edit-animal-modal-backdrop">
      <div className="edit-animal-modal">
        <div className="edit-animal-modal-header">
          <div>
            <h2>Edit Animal</h2>
            <p>{animal.animalCode}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit animal modal"
          >
            ✕
          </button>
        </div>
        <form className="edit-animal-form" onSubmit={handleSubmit}>
          <div className="edit-animal-form">
            <label>
              Animal code
              <input type="text" value={animal.animalCode} disabled />
            </label>

            <label>
              Species
              <input type="text" value={animal.species} disabled />
            </label>
          </div>

          <p>{animal.animalName || "Unnamed"}</p>

          <label>
            Animal name
            <input
              type="text"
              value={formData.animalName}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  animalName: event.target.value,
                })
              }
            />
          </label>

          <label>
            Breed
            <input
              type="text"
              value={formData.breed}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  breed: event.target.value,
                })
              }
            />
          </label>

          <label>
            Life stage
            <select
              value={formData.lifeStage}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  lifeStage: event.target.value,
                })
              }
            >
              {animal.species === "CAT" && (
                <option value="KITTEN">KITTEN</option>
              )}
              {animal.species === "DOG" && <option value="PUPPY">PUPPY</option>}

              <option value="ADULT">ADULT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>

          <label>
            Sex
            <select
              value={formData.sex}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  sex: event.target.value,
                })
              }
            >
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
            </select>
          </label>

          <label>
            Collar color
            <input
              type="text"
              value={formData.collarColor}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  collarColor: event.target.value,
                })
              }
            />
          </label>

          <label>
            Birth date
            <input
              type="date"
              value={formData.birthDate}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  birthDate: event.target.value,
                })
              }
            />
          </label>

          <label className="edit-animal-checkbox">
            <input
              type="checkbox"
              checked={formData.birthDateIsEstimated}
              disabled={!formData.birthDate}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  birthDateIsEstimated: event.target.checked,
                })
              }
            />
            Birth date is estimated
          </label>

          <label>
            Health status
            <select
              value={formData.healthStatus}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  healthStatus: event.target.value,
                })
              }
            >
              <option value="HEALTHY">HEALTHY</option>
              <option value="SICK">SICK</option>
              <option value="INJURED">INJURED</option>
              <option value="UNDER_OBSERVATION">UNDER OBSERVATION</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </label>
          {error && <p className="edit-animal-error">{error}</p>}

          <div className="edit-animal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditAnimalModal;
