import ReviewList from '../components/ReviewList';

function ReviewPage({
  mode,
  user,
  items,
  destination,
  locations,
  setDestination,
  note,
  setNote,
  isSubmitting,
  totalUnits,
  onRemoveRow,
  onBack,
  onSubmit,
}) {
  return (
    <section className="page pageWithFooter">
      <header className="pageHeader">
        <button className="backButton" onClick={onBack} aria-label="Go back">
          Back
        </button>
        <h1 className="pageTitle">Review Session</h1>
      </header>

      <div className="summaryBar">
        <span>{mode}</span>
        <span>{user || '-'}</span>
        <span>{items.length} types</span>
        <span>{totalUnits} units</span>
      </div>

      <section className="scrollRegion" aria-label="Review list area">
        <div className="scrollRegionLabel">Swipe to scroll review items</div>
        <div className="listScroll" aria-label="Review list">
          <ReviewList items={items} onRemoveRow={onRemoveRow} />
        </div>
      </section>

      <div className="reviewControls">
        <label className="fieldLabel" htmlFor="destination-select">
          Destination
        </label>
        <select
          id="destination-select"
          className="fieldInput"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        >
          {locations.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <label className="fieldLabel" htmlFor="session-note">
          Note
        </label>
        <input
          id="session-note"
          className="fieldInput"
          placeholder="Optional"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <footer className="fixedFooter footerGrid2">
        <button className="secondaryButton" onClick={onBack}>
          Back
        </button>
        <button className="ctaButton" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </footer>
    </section>
  );
}

export default ReviewPage;
