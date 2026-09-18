import "./CareRecordCard.css";

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function CareRecordCard({ record, onComplete }) {
  const isFutureCareRecord = record.careDate > getManilaDate();

  return (
    <div className="care-record-card">
      <h3>{record.cageCode}</h3>
      <p>{record.careType}</p>
      {record.cleaningType && <p>{record.cleaningType}</p>}

      <p
        className={`care-record-status ${
          record.isOverdue
            ? "care-record-status-overdue"
            : record.status === "COMPLETED"
              ? "care-record-status-completed"
              : "care-record-status-pending"
        }`}
      >
        Status: {record.isOverdue ? "OVERDUE" : record.status}
      </p>

      {record.notes && <p>Notes: {record.notes}</p>}
      {record.participants?.length > 0 && (
        <p>
          Performed by:{" "}
          {record.participants
            .map((participant) => {
              const middleInitial = participant.middleInitial
                ? `${participant.middleInitial}. `
                : "";

              return `${participant.firstName} ${middleInitial}${participant.lastName}`;
            })
            .join(", ")}
        </p>
      )}
      {record.status === "PENDING" && !isFutureCareRecord && (
        <button type="button" onClick={onComplete}>
          Complete
        </button>
      )}
      {record.status === "PENDING" && isFutureCareRecord && (
        <p>Scheduled for future date</p>
      )}
      {record.status === "COMPLETED" && record.completedAt && (
        <p>
          Completed:{" "}
          {new Date(record.completedAt).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          })}
        </p>
      )}
    </div>
  );
}

export default CareRecordCard;
