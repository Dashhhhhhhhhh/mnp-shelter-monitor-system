import "./ObservationCard.css";

function ObservationCard({
  observation,
  canEdit,
  onEdit,
  canClaim,
  onClaim,
  canMonitor,
  onMonitor,
  canResolve,
  onResolve,
  canEscalate,
  onEscalate,
  canTakeOver,
  onTakeOver,
}) {
  return (
    <div className="observation-card">
      <h3>{observation.observationType.replaceAll("_", " ")}</h3>

      <div className="observation-badges">
        <span
          className={`observation-urgency ${observation.urgency.toLowerCase()}`}
        >
          {observation.urgency.replaceAll("_", " ")}
        </span>
        <span
          className={`observation-status ${observation.status.toLowerCase()}`}
        >
          {observation.status.replaceAll("_", " ")}
        </span>
      </div>

      <p>
        <strong>Cage:</strong> {observation.cageCode}
      </p>

      {observation.animalName ? (
        <p>
          <strong>Animal:</strong>{" "}
          {observation.animalName
            ? `${observation.animalName} (${observation.animalCode})`
            : "None — Cage-level observation"}
        </p>
      ) : (
        <p>No animal assigned</p>
      )}
      <p>
        <strong>Notes:</strong> {observation.notes || "No notes"}
      </p>
      <p className="observation-created-at">
        Created: {new Date(observation.createdAt).toLocaleString()}
      </p>
      {observation.status === "RESOLVED" && observation.resolvedAt && (
        <p className="observation-resolved-at">
          Resolved: {new Date(observation.resolvedAt).toLocaleString()}
        </p>
      )}

      <div className="observation-actions">
        {canEdit && (
          <button
            type="button"
            className="observation-action edit"
            onClick={() => onEdit(observation)}
          >
            Edit
          </button>
        )}

        {canClaim && (
          <button
            type="button"
            className="observation-action claim"
            onClick={() => onClaim(observation)}
          >
            Claim
          </button>
        )}

        {canMonitor && (
          <button
            type="button"
            className="observation-action monitor"
            onClick={() => onMonitor(observation)}
          >
            Monitor
          </button>
        )}

        {canResolve && (
          <button
            type="button"
            className="observation-action resolve"
            onClick={() => onResolve(observation)}
          >
            Resolve
          </button>
        )}

        {canEscalate && (
          <button
            type="button"
            className="observation-action escalate"
            onClick={() => onEscalate(observation)}
          >
            Escalate to Medical
          </button>
        )}
        {canTakeOver && (
          <button
            type="button"
            className="observation-action takeover"
            onClick={() => onTakeOver(observation)}
          >
            Take Over
          </button>
        )}
      </div>
    </div>
  );
}

export default ObservationCard;
