import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  fetchItemById,
  getLocations,
  getStockCheckById,
  getUsers,
  submitSession as submitSessionRequest,
} from './api/appsScriptApi';
import HomePage from './pages/HomePage';
import ReviewPage from './pages/ReviewPage';
import ScanSessionPage from './pages/ScanSessionPage';
import StockCheckPage from './pages/StockCheckPage';
import SuccessPage from './pages/SuccessPage';
import UserSelectPage from './pages/UserSelectPage';

const PAGES = {
  HOME: 'home',
  USER_SELECT: 'userSelect',
  SCAN_SESSION: 'scanSession',
  REVIEW: 'review',
  SUCCESS: 'success',
  STOCK_CHECK: 'stockCheck',
};

function App() {
  const [page, setPage] = useState(PAGES.HOME);
  const [mode, setMode] = useState('Stock Out');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sessionItems, setSessionItems] = useState([]);
  const [lastScanned, setLastScanned] = useState('None yet');
  const [activeBarcode, setActiveBarcode] = useState('');
  const [destination, setDestination] = useState('');
  const [note, setNote] = useState('');
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockCheckItem, setStockCheckItem] = useState(null);
  const [toast, setToast] = useState({ message: 'Ready', visible: false });
  const toastTimeoutRef = useRef(null);

  const totalUnits = useMemo(
    () => sessionItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [sessionItems]
  );

  const reviewDestinations = useMemo(() => {
    if (mode === 'Stock In') {
      return ['BB Room'];
    }

    if (mode === 'Stock Out') {
      return locations.filter((value) => value.toLowerCase() !== 'bb room');
    }

    return locations;
  }, [mode, locations]);

  useEffect(() => {
    let active = true;

    async function loadBootstrapData() {
      try {
        const [fetchedUsers, fetchedLocations] = await Promise.all([getUsers(), getLocations()]);

        if (!active) return;

        if (Array.isArray(fetchedUsers)) {
          setUsers(fetchedUsers);
        }

        if (Array.isArray(fetchedLocations)) {
          setLocations(fetchedLocations);
          if (!destination && fetchedLocations.length > 0) {
            if (mode === 'Stock In') {
              setDestination('BB Room');
            } else {
              const stockOutDefault = fetchedLocations.find(
                (value) => value.toLowerCase() !== 'bb room'
              );
              setDestination(stockOutDefault || fetchedLocations[0]);
            }
          }
        }
      } catch (error) {
        if (!active) return;
        triggerFeedback('Backend load failed');
      }
    }

    loadBootstrapData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode === 'Stock In') {
      if (destination !== 'BB Room') {
        setDestination('BB Room');
      }
      return;
    }

    if (mode === 'Stock Out') {
      const hasValidSelection = reviewDestinations.includes(destination);
      if (!hasValidSelection) {
        setDestination(reviewDestinations[0] || '');
      }
    }
  }, [mode, destination, reviewDestinations]);

  const triggerFeedback = (message) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, visible: true });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 1250);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (!beepEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
    } catch {
      // Ignore unsupported audio APIs in preview environments.
    }
  };

  const resetSessionState = () => {
    setSessionItems([]);
    setLastScanned('None yet');
    setActiveBarcode('');
    setNote('');
  };

  const getDefaultDestination = (nextMode) => {
    if (nextMode === 'Stock In') {
      return 'BB Room';
    }

    if (nextMode === 'Stock Out') {
      const stockOutDefault = locations.find((value) => value.toLowerCase() !== 'bb room');
      if (stockOutDefault) {
        return stockOutDefault;
      }
    }

    if (locations.length > 0) {
      return locations[0];
    }

    return destination || '';
  };

  const beginMode = (nextMode) => {
    setMode(nextMode);

    if (nextMode === 'Stock Check') {
      setStockCheckItem(null);
      setPage(PAGES.STOCK_CHECK);
      return;
    }

    setDestination(getDefaultDestination(nextMode));
    setPage(PAGES.USER_SELECT);
  };

  const startSession = () => {
    if (!selectedUser) return;
    resetSessionState();
    setDestination(getDefaultDestination(mode));
    setPage(PAGES.SCAN_SESSION);
    triggerFeedback('Session started');
  };

  const handleScannedId = async (scannedId) => {
    const barcode = String(scannedId || '').trim();
    if (!barcode) return;

    let found;

    try {
      found = await fetchItemById(barcode);
    } catch (error) {
      triggerFeedback(`Item not found: ${barcode}`);
      return;
    }

    setSessionItems((prev) => {
      const existing = prev.find((item) => item.barcode === barcode);
      if (existing) {
        const bumped = { ...existing, qty: existing.qty + 1 };
        const others = prev.filter((item) => item.barcode !== barcode);
        return [bumped, ...others];
      }

      return [
        {
          barcode,
          itemName: found.itemName,
          category: found.category,
          qty: 1,
        },
        ...prev,
      ];
    });

    setLastScanned(found.itemName || found.item || barcode);
    setActiveBarcode(barcode);
    triggerFeedback(`Scanned ${found.itemName || found.item || barcode}`);
  };

  const adjustQty = (barcode, delta) => {
    setSessionItems((prev) =>
      prev.map((item) =>
        item.barcode === barcode
          ? { ...item, qty: Math.max(1, Number(item.qty || 1) + delta) }
          : item
      )
    );
    setActiveBarcode(barcode);
  };

  const setQtyDirect = (barcode, value) => {
    if (value === '') {
      setSessionItems((prev) =>
        prev.map((item) => (item.barcode === barcode ? { ...item, qty: '' } : item))
      );
      setActiveBarcode(barcode);
      return;
    }

    const nextValue = Math.max(1, Number(value || 1));
    setSessionItems((prev) =>
      prev.map((item) => (item.barcode === barcode ? { ...item, qty: nextValue } : item))
    );
    setActiveBarcode(barcode);
  };

  const removeRow = (barcode) => {
    setSessionItems((prev) => prev.filter((item) => item.barcode !== barcode));
    if (activeBarcode === barcode) {
      setActiveBarcode('');
    }
    triggerFeedback('Item removed');
  };

  const submitSession = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    triggerFeedback('Submission in progress...');

    const payload = {
      user: selectedUser,
      mode,
      destination,
      notes: note,
      items: sessionItems.map((item) => ({
        id: item.barcode,
        itemName: item.itemName,
        qty: Number(item.qty || 0),
      })),
    };

    try {
      await submitSessionRequest(payload);
    } catch (error) {
      const message = String(error?.message || error || 'Submit failed');
      if (message.toLowerCase().includes('insufficient qty')) {
        triggerFeedback(message);
      } else {
        triggerFeedback('Submit failed');
      }
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setPage(PAGES.SUCCESS);
    triggerFeedback('Session submitted');
  };

  const newSession = () => {
    resetSessionState();
    setPage(PAGES.USER_SELECT);
  };

  const handleStockCheckScan = async (scannedId) => {
    const barcode = String(scannedId || '').trim();
    if (!barcode) return;

    try {
      const stockCheckData = await getStockCheckById(barcode);
      setStockCheckItem(stockCheckData);
      triggerFeedback(`Scanned ${stockCheckData?.itemName || barcode}`);
    } catch (error) {
      triggerFeedback(`Item not found: ${barcode}`);
    }
  };

  return (
    <div className="appRoot">
      <div className="mobileShell">
        <div className="utilityRow">
          <div className="utilityStatus">Ready</div>
          <label className="utilityToggle">
            <input
              type="checkbox"
              checked={beepEnabled}
              onChange={(event) => setBeepEnabled(event.target.checked)}
            />
            <span>Beep</span>
          </label>
        </div>

        <main className="pageStage">
          {page === PAGES.HOME && <HomePage onSelectMode={beginMode} />}

          {page === PAGES.USER_SELECT && (
            <UserSelectPage
              users={users}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              onStartSession={startSession}
              onBack={() => setPage(PAGES.HOME)}
            />
          )}

          {page === PAGES.SCAN_SESSION && (
            <ScanSessionPage
              mode={mode}
              user={selectedUser}
              items={sessionItems}
              totalUnits={totalUnits}
              lastScanned={lastScanned}
              activeBarcode={activeBarcode}
              onScan={handleScannedId}
              onAdjustQty={adjustQty}
              onSetQtyDirect={setQtyDirect}
              onRemoveRow={removeRow}
              onEndSession={() => setPage(PAGES.REVIEW)}
              onBack={() => setPage(PAGES.USER_SELECT)}
            />
          )}

          {page === PAGES.REVIEW && (
            <ReviewPage
              mode={mode}
              user={selectedUser}
              items={sessionItems}
              destination={destination}
              locations={reviewDestinations}
              setDestination={setDestination}
              note={note}
              setNote={setNote}
              isSubmitting={isSubmitting}
              totalUnits={totalUnits}
              onRemoveRow={removeRow}
              onBack={() => setPage(PAGES.SCAN_SESSION)}
              onSubmit={submitSession}
            />
          )}

          {page === PAGES.SUCCESS && (
            <SuccessPage
              itemTypes={sessionItems.length}
              totalUnits={totalUnits}
              onNewSession={newSession}
              onBackHome={() => setPage(PAGES.HOME)}
            />
          )}

          {page === PAGES.STOCK_CHECK && (
            <StockCheckPage
              item={stockCheckItem}
              onScan={handleStockCheckScan}
              onBack={() => setPage(PAGES.HOME)}
            />
          )}
        </main>
      </div>

      <div className={`toastOverlay ${toast.visible ? 'toastVisible' : ''}`} aria-live="polite">
        {toast.message}
      </div>
    </div>
  );
}

export default App;
