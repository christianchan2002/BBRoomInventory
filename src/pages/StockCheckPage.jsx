import ScannerPanel from '../components/ScannerPanel';
import StockInfoCard from '../components/StockInfoCard';

function StockCheckPage({ item, onScan, onBack }) {
  return (
    <section className="page pageWithFooter pageStockCheck">
      <header className="pageHeader">
        <button className="backButton" onClick={onBack} aria-label="Go back">
          Back
        </button>
        <h1 className="pageTitle">Stock Check</h1>
      </header>

      <div className="scanTopBlock">
        <ScannerPanel onScan={onScan} pauseAfterScan />
        <StockInfoCard item={item} />
      </div>

      <section className="scrollRegion" aria-label="Recent movements area">
        <div className="scrollRegionLabel">Swipe to scroll movement history</div>
        <div className="listScroll stockHistoryList" aria-label="Recent movements">
          <div className="historyTitle">Recent Movements</div>
          {(item?.recentMovements || []).length === 0 ? (
            <div className="historyEmpty">No recent movements</div>
          ) : (
            (item?.recentMovements || []).map((movement, index) => (
              <div key={`${movement.user}-${index}`} className="historyRow">
                <span>{movement.user}</span>
                <span>{movement.type}</span>
                <span>{movement.qty}</span>
                <span>{movement.destination}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="fixedFooter">
        <button className="ctaButton" onClick={onBack}>
          Back Home
        </button>
      </footer>
    </section>
  );
}

export default StockCheckPage;
