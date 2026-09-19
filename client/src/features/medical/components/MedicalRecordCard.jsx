import "./MedicalRecordCard.css";

function MedicalRecordCard({ record, onEdit, canEdit }) {
  return (
    <article className="medical-record-card">
      <div className="medical-record-card-header">
        <div>
          <h3>{record.animalName || record.animalCode}</h3>

          {record.animalName && (
            <p className="medical-record-animal-code">{record.animalCode}</p>
          )}
        </div>

        <span className="medical-record-type">{record.medicalType}</span>
      </div>

      <p>
        <strong>Date:</strong> {record.medicalDate}
      </p>

      <p>
        <strong>Reason:</strong> {record.reason}
      </p>

      {record.clinic && (
        <p>
          <strong>Clinic:</strong> {record.clinic}
        </p>
      )}

      {record.vetName && (
        <p>
          <strong>Vet:</strong> {record.vetName}
        </p>
      )}

      {record.diagnosis && (
        <p>
          <strong>Diagnosis:</strong> {record.diagnosis}
        </p>
      )}

      {record.treatment && (
        <p>
          <strong>Treatment:</strong> {record.treatment}
        </p>
      )}

      {record.followUpDate && (
        <p>
          <strong>Follow-up:</strong> {record.followUpDate}
        </p>
      )}

      {record.notes && (
        <p>
          <strong>Notes:</strong> {record.notes}
        </p>
      )}

      {canEdit && (
        <button
          type="button"
          className="medical-record-edit-button"
          onClick={onEdit}
        >
          Edit
        </button>
      )}
    </article>
  );
}

export default MedicalRecordCard;
