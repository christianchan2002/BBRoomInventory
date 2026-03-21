import { useEffect, useRef } from 'react';
import ItemRow from '../components/ItemRow';
import ScannerPanel from '../components/ScannerPanel';
import SessionHeader from '../components/SessionHeader';

function ScanSessionPage({
  mode,
  user,
  items,
  totalUnits,
  lastScanned,
  activeBarcode,
  onScan,
  onAdjustQty,
  onSetQtyDirect,
  onRemoveRow,
  onEndSession,
  onBack,
}) {
  const pageRef = useRef(null);

  const handleQtyBlur = (barcode) => {
    const editedItem = items.find((item) => item.barcode === barcode);
    if (editedItem && editedItem.qty === '') {
      onSetQtyDirect(barcode, 1);
    }

    // Wait until iOS closes the keyboard before restoring viewport position.
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      const stillEditing =
        activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      if (stillEditing) return;

      if (pageRef.current) {
        pageRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }

      window.scrollTo(0, 0);
    }, 140);
  };

  useEffect(() => {
    if (!activeBarcode) return;

    if (pageRef.current) {
      pageRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    window.scrollTo(0, 0);
  }, [lastScanned, activeBarcode]);

  return (
    <section ref={pageRef} className="page pageWithFooter pageScanSession">
      <SessionHeader
        mode={mode}
        user={user}
        itemTypes={items.length}
        totalUnits={totalUnits}
        onBack={onBack}
      />

      <div className="scanTopBlock">
        <ScannerPanel onScan={onScan} />
        <div className="lastScanLabel">Last scanned: {lastScanned}</div>
      </div>

      <section className="scrollRegion" aria-label="Scanned items area">
        <div className="scrollRegionLabel">Swipe to scroll scanned items</div>
        <div className="listScroll listScrollStatic" aria-label="Scanned items list">
          {items.length === 0 && <div className="emptyList">Scan items to begin.</div>}
          {items.map((item) => (
            <ItemRow
              key={item.barcode}
              item={item}
              isActive={activeBarcode === item.barcode}
              onAdjustQty={onAdjustQty}
              onSetQtyDirect={onSetQtyDirect}
              onQtyBlur={handleQtyBlur}
              onRemove={() => onRemoveRow(item.barcode)}
            />
          ))}
        </div>
      </section>

      <footer className="fixedFooter">
        <button className="ctaButton" onClick={onEndSession}>
          End Session
        </button>
      </footer>
    </section>
  );
}

export default ScanSessionPage;
