import { useEffect, useState } from "react";

import { getMedicalRecords } from "../api/medicalApi";

import CreateMedicalRecordModal from "../components/CreateMedicalRecordModal";

import EditMedicalRecordModal from "../components/EditMedicalRecordModal";

import MedicalRecordCard from "../components/MedicalRecordCard";

import useAuth from "../../auth/hooks/useAuth";

import "./MedicalPage.css";

function MedicalPage() {
  const { user } = useAuth();

  const canManageMedical = user?.role === "ADMIN" || user?.role === "VOLUNTEER";

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchMedicalRecords() {
      try {
        const data = await getMedicalRecords();

        setMedicalRecords(data.medicalRecords);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load medical records.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMedicalRecords();
  }, [refreshKey]);

  return (
    <div className="medical-page">
      <div className="medical-page-header">
        <div>
          <h1>Medical Records</h1>
          <p>View and manage animal medical history.</p>
        </div>

        {canManageMedical && (
          <button
            type="button"
            className="medical-add-button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Medical Record
          </button>
        )}
      </div>

      {loading && (
        <p className="medical-page-message">Loading medical records...</p>
      )}

      {error && <p className="medical-page-error">{error}</p>}

      {!loading && !error && (
        <div className="medical-records-section">
          <p className="medical-record-count">
            {medicalRecords.length} medical records found.
          </p>

          {medicalRecords.length === 0 ? (
            <p className="medical-empty-state">No medical records found.</p>
          ) : (
            <div className="medical-record-grid">
              {medicalRecords.map((record) => (
                <MedicalRecordCard
                  key={record.medicalRecordId}
                  record={record}
                  canEdit={canManageMedical}
                  onEdit={() => setSelectedMedicalRecord(record)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {isCreateModalOpen && (
        <CreateMedicalRecordModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => {
            setRefreshKey((current) => current + 1);
          }}
        />
      )}
      {selectedMedicalRecord && (
        <EditMedicalRecordModal
          key={selectedMedicalRecord.medicalRecordId}
          record={selectedMedicalRecord}
          onClose={() => setSelectedMedicalRecord(null)}
          onUpdated={() => {
            setRefreshKey((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

export default MedicalPage;
