function SuccessPage({ itemTypes, totalUnits, onNewSession, onBackHome }) {
  return (
    <section className="page pageWithFooter">
      <div className="successCard">
        <div className="successTitle">Session Submitted</div>
        <div className="successText">{itemTypes} item types updated</div>
        <div className="successText">{totalUnits} units moved</div>
      </div>

      <footer className="fixedFooter footerGrid2">
        <button className="ctaButton" onClick={onNewSession}>
          New Session
        </button>
        <button className="secondaryButton" onClick={onBackHome}>
          Home
        </button>
      </footer>
    </section>
  );
}

export default SuccessPage;
