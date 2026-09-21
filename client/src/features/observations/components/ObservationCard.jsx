function ObservationCard({ observation }) {
  return (
    <div className="observation-card">
      <h3>{observation.observationType.replaceAll("_", " ")}</h3>
      <p>{observation.urgency}</p>

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

      <p>{observation.cageCode}</p>
      {observation.animalName ? (
        <p>
          {observation.animalName} ({observation.animalCode})
        </p>
      ) : (
        <p>No animal assigned</p>
      )}
      <p>{observation.notes}</p>
    </div>
  );
}

export default ObservationCard;
