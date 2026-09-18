import { useEffect, useState } from "react";
import { getCareRecordsByDate } from "../api/careApi";

import CareRecordCard from "../components/CareRecordCard";

import CompleteCareModal from "../components/CompleteCareModal";

import useAuth from "../../auth/hooks/useAuth";

import ScheduleCareModal from "../components/ScheduleCareModal";

import "./CarePage.css";

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function CarePage() {
  const { user } = useAuth();

  const [careRecords, setCareRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(getManilaDate());

  const [selectedCareRecord, setSelectedCareRecord] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => {
    async function fetchCareRecords() {
      try {
        setLoading(true);
        setError("");

        const data = await getCareRecordsByDate(selectedDate);

        setCareRecords(data.careRecords);
      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load care records.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCareRecords();
  }, [selectedDate, refreshKey]);

  const amRecords = careRecords.filter((record) => record.carePeriod === "AM");

  const pmRecords = careRecords.filter((record) => record.carePeriod === "PM");

  const extraRecords = careRecords.filter(
    (record) => record.carePeriod === "EXTRA",
  );

  return (
    <div className="care-page">
      <section>
        <h1>Daily Care</h1>
        <div className="care-page-toolbar">
          <label htmlFor="care-date">
            Care date
            <input
              id="care-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>

          {["ADMIN", "VOLUNTEER"].includes(user?.role) && (
            <button type="button" onClick={() => setIsScheduleModalOpen(true)}>
              Schedule Care
            </button>
          )}
        </div>

        {loading && <p>Loading care records...</p>}

        {error && <p>{error}</p>}
        <>
          <section className="care-period-section">
            <div className="care-period-header">
              <h2>AM</h2>
            </div>

            {amRecords.length === 0 ? (
              <p>No AM care records.</p>
            ) : (
              <div className="care-record-grid">
                {amRecords.map((record) => (
                  <CareRecordCard
                    key={record.careRecordId}
                    record={record}
                    onComplete={() => setSelectedCareRecord(record)}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="care-period-section">
            <div className="care-period-header">
              <h2>PM</h2>
            </div>

            {pmRecords.length === 0 ? (
              <p className="care-empty-state">No PM care records.</p>
            ) : (
              <div className="care-record-grid">
                {pmRecords.map((record) => (
                  <CareRecordCard
                    key={record.careRecordId}
                    record={record}
                    onComplete={() => setSelectedCareRecord(record)}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="care-period-section">
            <div className="care-period-header">
              <h2>EXTRA</h2>
            </div>

            {extraRecords.length === 0 ? (
              <p className="care-empty-state">No Extra care records.</p>
            ) : (
              <div className="care-record-grid">
                {extraRecords.map((record) => (
                  <CareRecordCard
                    key={record.careRecordId}
                    record={record}
                    onComplete={() => setSelectedCareRecord(record)}
                  />
                ))}
              </div>
            )}
          </section>
        </>

        {selectedCareRecord && (
          <CompleteCareModal
            record={selectedCareRecord}
            onClose={() => setSelectedCareRecord(null)}
            onCompleted={() => setRefreshKey((current) => current + 1)}
          />
        )}

        {isScheduleModalOpen && (
          <ScheduleCareModal
            selectedDate={selectedDate}
            onClose={() => setIsScheduleModalOpen(false)}
            onCreated={() => setRefreshKey((current) => current + 1)}
          />
        )}
      </section>
    </div>
  );
}

export default CarePage;
