function SessionHeader({ mode, user, itemTypes, totalUnits, onBack }) {
  return (
    <header className="sessionHeader">
      <button className="backButton" onClick={onBack} aria-label="Go back">
        Back
      </button>
      <div className="sessionMetaGroup">
        <div className="sessionMode">{mode}</div>
        <div className="sessionMetaLine">
          <span>User: {user || '-'}</span>
          <span>Items: {itemTypes}</span>
          <span>Units: {totalUnits}</span>
        </div>
      </div>
    </header>
  );
}

export default SessionHeader;
