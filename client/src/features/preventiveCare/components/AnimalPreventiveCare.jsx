import { useEffect, useState } from "react";

import { getAnimalPreventiveCare } from "../api/preventiveCareApi";

import CreatePreventiveCareModal from "./CreatePreventiveCareModal";

import EditPreventiveCareModal from "./EditPreventiveCareModal";

import "./AnimalPreventiveCare.css";

function AnimalPreventiveCare({ animalId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [showAllRecords, setShowAllRecords] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (!animalId) return;

    async function fetchPreventiveCare() {
      try {
        setError("");

        const data = await getAnimalPreventiveCare(animalId);

        setRecords(data.preventiveCareRecords);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load preventive care records.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPreventiveCare();
  }, [animalId]);

  function handlePreventiveCareCreated(createdRecord) {
    setRecords((current) => [createdRecord, ...current]);
  }

  if (loading) {
    return <p>Loading preventive care...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  function handlePreventiveCareUpdated(updatedRecord) {
    setRecords((current) =>
      current.map((record) =>
        record.preventiveCareId === updatedRecord.preventiveCareId
          ? updatedRecord
          : record,
      ),
    );
  }

  const displayedRecords = showAllRecords ? records : records.slice(0, 3);

  return (
    <div className="animal-preventive-care">
      <div className="preventive-care-header">
        <button
          type="button"
          onClick={() => {
            console.log("ADD CLICKED");
            setIsCreateModalOpen(true);
          }}
        >
          Add Preventive Care
        </button>
      </div>

      {records.length === 0 ? (
        <p>No preventive care recorded.</p>
      ) : (
        <div className="animal-preventive-care-list">
          {displayedRecords.map((record) => (
            <button
              key={record.preventiveCareId}
              type="button"
              className="preventive-care-record preventive-care-record-button"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="preventive-care-record-header">
                <strong className="preventive-care-record-title">
                  {record.careType.replaceAll("_", " ")}
                </strong>

                <span
                  className={`preventive-care-status ${record.dueStatus
                    .toLowerCase()
                    .replaceAll("_", "-")}`}
                >
                  {record.dueStatus.replaceAll("_", " ")}
                </span>
              </div>

              <div className="preventive-care-record-details">
                <p>
                  <strong>Date given:</strong> {record.dateGiven}
                </p>

                {record.productName && (
                  <p>
                    <strong>Product:</strong> {record.productName}
                  </p>
                )}

                {record.dose && (
                  <p>
                    <strong>Dose:</strong> {record.dose}
                  </p>
                )}

                {record.nextDueDate && (
                  <p>
                    <strong>Next due:</strong> {record.nextDueDate}
                  </p>
                )}
              </div>
            </button>
          ))}

          {records.length > 3 && (
            <button
              type="button"
              className="preventive-care-view-all"
              onClick={() => setShowAllRecords((current) => !current)}
            >
              {showAllRecords ? "Show less" : `View all ${records.length}`}
            </button>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <CreatePreventiveCareModal
          animalId={animalId}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handlePreventiveCareCreated}
        />
      )}

      {selectedRecord && (
        <EditPreventiveCareModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdated={handlePreventiveCareUpdated}
        />
      )}
    </div>
  );
}

export default AnimalPreventiveCare;
