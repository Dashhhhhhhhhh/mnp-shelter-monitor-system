import { useEffect, useState } from "react";

import { getActiveStaff } from "../../users/api/userApi";

import { completeCareRecord } from "../api/careApi";

import "./CompleteCareModal.css";

import { useToast } from "../../../components/feedback/ToastContext";

function CompleteCareModal({ record, onClose, onCompleted }) {
  const { showToast } = useToast();

  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [error, setError] = useState("");

  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function fetchStaff() {
      try {
        const data = await getActiveStaff();
        setStaff(data.staff);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load active staff.",
        );
      } finally {
        setLoadingStaff(false);
      }
    }

    fetchStaff();
  }, []);

  function handleParticipantToggle(userId) {
    setSelectedParticipantIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedParticipantIds.length === 0) {
      setSubmitError("Select at least one care participant.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");

      const data = await completeCareRecord(record.careRecordId, {
        participantUserIds: selectedParticipantIds,
        notes,
      });
      showToast("Care completed successfully", "success");

      onCompleted?.(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Unable to complete care record.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="complete-care-modal-backdrop" onClick={onClose}>
      <div
        className="complete-care-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="complete-care-modal-header">
          <div>
            <h2>Complete Care</h2>

            <p>
              {record.cageCode} · {record.carePeriod} · {record.careType}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close complete care"
          >
            ✕
          </button>
        </div>

        {loadingStaff && <p>Loading staff...</p>}

        {error && <p>{error}</p>}

        <form onSubmit={handleSubmit}>
          {!loadingStaff && !error && (
            <div className="complete-care-participants">
              <p className="complete-care-participants-title">
                Care participants
              </p>

              {staff.map((user) => (
                <label key={user.userId} className="complete-care-participant">
                  <input
                    type="checkbox"
                    checked={selectedParticipantIds.includes(user.userId)}
                    onChange={() => handleParticipantToggle(user.userId)}
                  />

                  <span>
                    {user.firstName}{" "}
                    {user.middleInitial ? `${user.middleInitial}. ` : ""}
                    {user.lastName} ({user.role})
                  </span>
                </label>
              ))}
            </div>
          )}

          <label htmlFor="care-completion-notes">Notes</label>

          <textarea
            id="care-completion-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          {submitError && <p className="complete-care-error">{submitError}</p>}

          <div className="complete-care-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" disabled={submitting}>
              {submitting ? "Completing..." : "Complete Care"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CompleteCareModal;
