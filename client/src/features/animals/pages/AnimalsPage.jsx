import { useEffect, useState } from "react";

import { getAnimals } from "../api/animalApi";

import { useSearchParams } from "react-router-dom";

import AnimalDetailsDrawer from "../components/AnimalDetailsDrawer";

import CreateAnimalModal from "../components/CreateAnimalModal";

import "./AnimalsPage.css";

function AnimalsPage() {
  const [animals, setAnimals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState(null);

  const [selectedAnimalId, setSelectedAnimalId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [species, setSpecies] = useState("");
  const [sex, setSex] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [adoptionStatus, setAdoptionStatus] = useState("");
  const [status, setStatus] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [refreshKey, setRefreshKey] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const animalIdFromUrl = searchParams.get("animalId");

  const needsCare = searchParams.get("needsCare") === "true";

  function handleResetFilters() {
    setSearch("");
    setSpecies("");
    setSex("");
    setLifeStage("");
    setHealthStatus("");
    setAdoptionStatus("");
    setStatus("");

    setSortBy("createdAt");
    setSortOrder("desc");

    setPage(1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (animalIdFromUrl) {
      setSelectedAnimalId(animalIdFromUrl);
    }
  }, [animalIdFromUrl]);

  useEffect(() => {
    async function fetchAnimals() {
      try {
        const data = await getAnimals({
          search: debouncedSearch,
          species: species || undefined,
          sex: sex || undefined,
          lifeStage: lifeStage || undefined,
          healthStatus: healthStatus || undefined,
          adoptionStatus: adoptionStatus || undefined,
          status: status || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
          needsCare,
        });
        setAnimals(data.animals);
        setPagination(data.pagination);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load animals.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnimals();
  }, [
    debouncedSearch,
    species,
    sex,
    lifeStage,
    healthStatus,
    adoptionStatus,
    status,
    sortBy,
    sortOrder,
    page,
    limit,
    refreshKey,
  ]);
  if (loading) {
    return <p>Loading animals...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  function handleAnimalUpdated(updatedAnimal) {
    setAnimals((currentAnimals) =>
      currentAnimals.map((animal) =>
        animal.animalId === updatedAnimal.animalId
          ? { ...animal, ...updatedAnimal }
          : animal,
      ),
    );
  }

  function handleCloseAnimalDrawer() {
    setSelectedAnimalId(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("animalId");

    setSearchParams(nextParams);
  }

  function handleAnimalCreated(createdAnimal) {
    setAnimals((currentAnimals) => [createdAnimal, ...currentAnimals]);

    setPagination((currentPagination) =>
      currentPagination
        ? {
            ...currentPagination,
            totalItems: currentPagination.totalItems + 1,
          }
        : currentPagination,
    );
  }

  return (
    <section className="animals-page">
      <div className="animals-page-header">
        <h1>Animals</h1>
        <button type="button" onClick={() => setIsCreateModalOpen(true)}>
          Add Animal
        </button>
      </div>

      <p>Total animals: {pagination?.totalItems ?? animals.length}</p>

      <div className="animals-toolbar">
        <div className="animals-search">
          <input
            type="search"
            placeholder="Search animals..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="animals-filters">
          <select
            value={species}
            onChange={(event) => {
              setSpecies(event.target.value);
              setLifeStage("");
            }}
          >
            <option value="">All species</option>
            <option value="CAT">CAT</option>
            <option value="DOG">DOG</option>
          </select>

          <select value={sex} onChange={(event) => setSex(event.target.value)}>
            <option value="">Sex</option>
            <option value="FEMALE">FEMALE</option>
            <option value="MALE">MALE</option>
          </select>

          <select
            value={lifeStage}
            onChange={(event) => setLifeStage(event.target.value)}
          >
            <option value="">All life stages</option>

            {!species && (
              <>
                <option value="KITTEN">KITTEN</option>
                <option value="PUPPY">PUPPY</option>
              </>
            )}

            {species === "CAT" && <option value="KITTEN">KITTEN</option>}
            {species === "DOG" && <option value="PUPPY">PUPPY</option>}

            <option value="ADULT">ADULT</option>
            <option value="OTHER">OTHER</option>
          </select>

          <select
            value={healthStatus}
            onChange={(event) => setHealthStatus(event.target.value)}
          >
            <option value="">All health statuses</option>
            <option value="HEALTHY">HEALTHY</option>
            <option value="SICK">SICK</option>
            <option value="INJURED">INJURED</option>
            <option value="UNDER_OBSERVATION">UNDER OBSERVATION</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
          <select
            value={adoptionStatus}
            onChange={(event) => setAdoptionStatus(event.target.value)}
          >
            <option value="">All adoption statuses</option>
            <option value="NOT_READY">NOT READY</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="ADOPTED">ADOPTED</option>
            <option value="RETURNED">RETURNED</option>
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All animal statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ADOPTED">ADOPTED</option>
            <option value="PASSED_AWAY">PASSED AWAY</option>
            <option value="MISSING">MISSING</option>
            <option value="ESCAPED">ESCAPED</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="createdAt">Created date</option>
            <option value="animalName">Name</option>
            <option value="animalCode">Code</option>
            <option value="species">Species</option>
            <option value="lifeStage">Life stage</option>
            <option value="healthStatus">Health status</option>
            <option value="adoptionStatus">Adoption status</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>

          <button type="button" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      </div>
      <table className="animals-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Species</th>
            <th>Sex</th>
            <th>Health</th>
            <th>Status</th>
            <th>Adoption</th>
          </tr>
        </thead>
        <tbody>
          {animals.map((animal) => (
            <tr key={animal.animalId}>
              <td>{animal.animalCode}</td>

              <td>
                <button
                  type="button"
                  onClick={() => setSelectedAnimalId(animal.animalId)}
                >
                  {animal.animalName || "Unnamed"}
                </button>
              </td>

              <td>{animal.species}</td>
              <td>{animal.sex}</td>
              <td>{animal.healthStatus}</td>
              <td>{animal.status}</td>
              <td>{animal.adoptionStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="animal-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((currentPage) => currentPage - 1)}
        >
          Previous
        </button>

        <span>
          Page {pagination?.page ?? page} of {pagination?.totalPages || 1}
        </span>

        <button
          type="button"
          disabled={!pagination || page >= pagination.totalPages}
          onClick={() => setPage((currentPage) => currentPage + 1)}
        >
          Next
        </button>
      </div>
      <AnimalDetailsDrawer
        animalId={selectedAnimalId}
        onClose={handleCloseAnimalDrawer}
        onAnimalUpdated={handleAnimalUpdated}
        onAnimalArchived={() => {
          setSelectedAnimalId(null);
          setRefreshKey((current) => current + 1);
        }}
      />
      {isCreateModalOpen && (
        <CreateAnimalModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleAnimalCreated}
        />
      )}
    </section>
  );
}
export default AnimalsPage;
