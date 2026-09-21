import "./CreateAnimalModal.css";

import { useState } from "react";

import { createAnimal } from "../api/animalApi";

import { useToast } from "../../../components/feedback/ToastContext";

function CreateAnimalModal({ onClose, onCreated }) {
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [formData, setFormData] = useState({
    species: "CAT",
    sex: "FEMALE",
    lifeStage: "KITTEN",
    animalName: "",
    breed: "",
    collarColor: "",
    birthDate: "",
    birthDateIsEstimated: false,
    healthStatus: "UNKNOWN",
  });

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        species: formData.species,
        sex: formData.sex,
        lifeStage: formData.lifeStage,
        animalName: formData.animalName || null,
        breed: formData.breed || null,
        collarColor: formData.collarColor || null,
        birthDate: formData.birthDate || null,
        birthDateIsEstimated: formData.birthDate
          ? formData.birthDateIsEstimated
          : false,
        healthStatus: formData.healthStatus,
      };

      const data = await createAnimal(payload, idempotencyKey);

      onCreated?.(data.animal);
      showToast("Animal created successfully");

      onClose();
    } catch (error) {
      console.error("Create animal error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create animal.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="create-animal-modal-backdrop">
      <div className="create-animal-modal">
        <div className="create-animal-modal-header">
          <h2>Add Animal</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close create animal modal"
          >
            ✕
          </button>
        </div>
        <form className="create-animal-form" onSubmit={handleSubmit}>
          <label>
            Species
            <select
              value={formData.species}
              onChange={(event) => {
                const species = event.target.value;

                setFormData({
                  ...formData,
                  species,
                  lifeStage: species === "CAT" ? "KITTEN" : "PUPPY",
                });
              }}
            >
              <option value="CAT">CAT</option>
              <option value="DOG">DOG</option>
            </select>
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
              {formData.species === "CAT" && (
                <option value="KITTEN">KITTEN</option>
              )}

              {formData.species === "DOG" && (
                <option value="PUPPY">PUPPY</option>
              )}

              <option value="ADULT">ADULT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>

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

          <label className="create-animal-checkbox">
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

          {error && <p className="create-animal-error">{error}</p>}

          <div className="create-animal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Animal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAnimalModal;
