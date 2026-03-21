function HomePage({ onSelectMode }) {
  return (
    <section className="page pageStatic">
      <div className="brandCard">
        <div className="brandTitle">BB Room Inventory</div>
        <div className="brandSubtitle">11th Coy Logistics Scanner</div>
      </div>

      <div className="modeButtons">
        <button className="modeButtonPrimary" onClick={() => onSelectMode('Stock Out')}>
          Stock Out
        </button>
        <button className="modeButtonPrimary" onClick={() => onSelectMode('Stock In')}>
          Stock In
        </button>
        <button className="modeButtonSecondary" onClick={() => onSelectMode('Stock Check')}>
          Stock Check
        </button>
      </div>
    </section>
  );
}

export default HomePage;
