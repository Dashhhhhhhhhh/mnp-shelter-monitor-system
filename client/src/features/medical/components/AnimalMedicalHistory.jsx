import { useEffect, useState } from "react";
import { getAnimalMedicalRecords } from "../api/medicalApi";

function AnimalMedicalHistory({ animalId }) {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!animalId) return;

    async function fetchMedicalHistory() {
      setLoading(true);
      setError("");

      try {
        const data = await getAnimalMedicalRecords(animalId);

        setMedicalRecords(data.medicalRecords);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load medical history.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMedicalHistory();
  }, [animalId]);

  if (loading) {
    return <p>Loading medical history...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (medicalRecords.length === 0) {
    return <p>No medical records recorded.</p>;
  }

  return (
    <div className="animal-medical-history">
      {medicalRecords.map((record) => (
        <div
          key={record.medicalRecordId}
          className="animal-medical-history-item"
        >
          <p>
            <strong>{record.medicalType.replaceAll("_", " ")}</strong>
          </p>

          <p>
            <strong>Date:</strong> {record.medicalDate}
          </p>

          <p>
            <strong>Reason:</strong> {record.reason}
          </p>

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
        </div>
      ))}
    </div>
  );
}

export default AnimalMedicalHistory;
