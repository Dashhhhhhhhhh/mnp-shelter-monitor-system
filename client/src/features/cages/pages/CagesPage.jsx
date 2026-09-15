import { useEffect, useState } from "react";

import { getCages } from "../api/cageApi";

import CageDetailsDrawer from "../components/CageDetailsDrawer";

import CreateCageModal from "../components/CreateCageModal";

import { getCurrentAssignments } from "../api/cageAssignmentApi";

function CagesPage() {
  const [cages, setCages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCageId, setSelectedCageId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [assignments, setAssignments] = useState([]);

  const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchCages() {
      try {
        const [cagesData, assignmentsData] = await Promise.all([
          getCages(),
          getCurrentAssignments(),
        ]);

        setCages(cagesData.cages);
        setAssignments(assignmentsData.assignments);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load cages.");
      } finally {
        setLoading(false);
      }
    }

    fetchCages();
  }, [assignmentsRefreshKey]);

  function handleCageCreated(createdCage) {
    console.log("CagesPage received:", createdCage);

    setCages((current) => [createdCage, ...current]);
  }

  function handleCageUpdated(updatedCage) {
    setCages((current) =>
      current.map((cage) =>
        cage.cageId === updatedCage.cageId ? { ...cage, ...updatedCage } : cage,
      ),
    );
  }

  if (loading) {
    return <p>Loading cages...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <section>
      <h1>Cages</h1>

      <button type="button" onClick={() => setIsCreateModalOpen(true)}>
        Add Cage
      </button>

      <p>Total cages: {cages.length}</p>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Species</th>
            <th>Gender group</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Occupancy</th>
            <th>Status</th>
            <th>Location</th>
          </tr>
        </thead>

        <tbody>
          {cages.map((cage) => (
            <tr key={cage.cageId}>
              <td>
                <button
                  type="button"
                  onClick={() => setSelectedCageId(cage.cageId)}
                >
                  {cage.cageCode}
                </button>
              </td>
              <td>{cage.speciesGroup}</td>
              <td>{cage.genderGroup}</td>
              <td>{cage.cageType}</td>
              <td>{cage.recommendedCapacity}</td>
              <td>
                {
                  assignments.filter(
                    (assignment) => assignment.cageId === cage.cageId,
                  ).length
                }{" "}
                / {cage.recommendedCapacity}
              </td>
              <td>{cage.status}</td>
              <td>{cage.location || "Not specified"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <CageDetailsDrawer
        cageId={selectedCageId}
        onClose={() => setSelectedCageId(null)}
        onCageUpdated={handleCageUpdated}
        onAssignmentsChanged={() =>
          setAssignmentsRefreshKey((current) => current + 1)
        }
      />

      {isCreateModalOpen && (
        <CreateCageModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCageCreated}
        />
      )}
    </section>
  );
}

export default CagesPage;
