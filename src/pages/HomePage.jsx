import { useEffect, useRef, useState } from 'react';

function HomePage({ onSelectMode }) {
  const pageRef = useRef(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const pageElement = pageRef.current;
    if (!pageElement) return undefined;

    const syncScrollability = () => {
      const isStandalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;

      if (isStandalone) {
        setIsScrollable(false);
        return;
      }

      setIsScrollable(pageElement.scrollHeight > pageElement.clientHeight + 12);
    };

    syncScrollability();
    window.addEventListener('resize', syncScrollability);

    let observer;
    if (window.ResizeObserver) {
      observer = new window.ResizeObserver(syncScrollability);
      observer.observe(pageElement);
    }

    return () => {
      window.removeEventListener('resize', syncScrollability);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={pageRef}
      className={`page pageStatic pageHome ${isScrollable ? 'pageHomeScrollable' : 'pageHomeNoScroll'}`}
    >
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
