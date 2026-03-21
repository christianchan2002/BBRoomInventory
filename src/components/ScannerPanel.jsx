import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

function ScannerPanel({ onScan, pauseAfterScan = false }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const manualInputRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const recentScanRef = useRef({ id: '', time: 0 });
  const scanLockedRef = useRef(false);
  const cooldownTimerRef = useRef(null);
  const pauseAfterScanTimerRef = useRef(null);
  const scannerModeRef = useRef('manual');
  const onScanRef = useRef(onScan);
  const [manualId, setManualId] = useState('');
  const [statusText, setStatusText] = useState('Initializing camera...');
  const [freezeFrameSrc, setFreezeFrameSrc] = useState('');
  const [scanBox, setScanBox] = useState(null);
  const [showSuccessLine, setShowSuccessLine] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isScannerActive) {
      return undefined;
    }

    let stopped = false;
    const CENTER_TARGET_RADIUS = 0.5;
    const TARGET_ZONE = {
      minX: 0.08,
      maxX: 0.92,
      minY: 0.28,
      maxY: 0.72,
    };

    const isSecureContextForCamera =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const stopScanner = () => {
      stopped = true;
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (pauseAfterScanTimerRef.current) {
        window.clearTimeout(pauseAfterScanTimerRef.current);
        pauseAfterScanTimerRef.current = null;
      }
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (zxingControlsRef.current?.stop) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
      zxingReaderRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const getReadyStatus = () => {
      if (scannerModeRef.current === 'native') return 'Scanning live camera...';
      if (scannerModeRef.current === 'compat') {
        return 'Scanning live camera (compatibility mode)...';
      }
      return 'Live camera on. Auto barcode detect unavailable; use manual ID entry.';
    };

    const getVisibleSourceWindow = () => {
      const video = videoRef.current;
      const frame = frameRef.current;

      const sourceWidth = video?.videoWidth || 0;
      const sourceHeight = video?.videoHeight || 0;
      const frameWidth = frame?.clientWidth || 0;
      const frameHeight = frame?.clientHeight || 0;

      if (!sourceWidth || !sourceHeight || !frameWidth || !frameHeight) {
        return null;
      }

      const scale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
      const visibleWidth = frameWidth / scale;
      const visibleHeight = frameHeight / scale;
      const x = (sourceWidth - visibleWidth) / 2;
      const y = (sourceHeight - visibleHeight) / 2;

      return {
        x,
        y,
        width: visibleWidth,
        height: visibleHeight,
        sourceWidth,
        sourceHeight,
      };
    };

    const normalizeScanBox = (rawBox, visibleWindow) => {
      if (!rawBox || !visibleWindow) return null;

      const leftPct = ((rawBox.left - visibleWindow.x) / visibleWindow.width) * 100;
      const topPct = ((rawBox.top - visibleWindow.y) / visibleWindow.height) * 100;
      const rightPct = ((rawBox.left + rawBox.width - visibleWindow.x) / visibleWindow.width) * 100;
      const bottomPct =
        ((rawBox.top + rawBox.height - visibleWindow.y) / visibleWindow.height) * 100;

      const clampedLeft = Math.max(0, Math.min(100, leftPct));
      const clampedTop = Math.max(0, Math.min(100, topPct));
      const clampedRight = Math.max(0, Math.min(100, rightPct));
      const clampedBottom = Math.max(0, Math.min(100, bottomPct));

      const width = Math.max(0, clampedRight - clampedLeft);
      const height = Math.max(0, clampedBottom - clampedTop);
      if (width < 2 || height < 2) return null;

      return {
        left: clampedLeft,
        top: clampedTop,
        width,
        height,
      };
    };

    const isWithinVisibleWindow = (rawBox, visibleWindow) => {
      if (!rawBox || !visibleWindow) return false;

      const centerX = rawBox.left + rawBox.width / 2;
      const centerY = rawBox.top + rawBox.height / 2;

      return (
        centerX >= visibleWindow.x &&
        centerX <= visibleWindow.x + visibleWindow.width &&
        centerY >= visibleWindow.y &&
        centerY <= visibleWindow.y + visibleWindow.height
      );
    };

    const getTargetScore = (rawBox, visibleWindow) => {
      if (!rawBox || !visibleWindow) return null;

      const centerX = rawBox.left + rawBox.width / 2;
      const centerY = rawBox.top + rawBox.height / 2;
      const normalizedX = (centerX - visibleWindow.x) / visibleWindow.width;
      const normalizedY = (centerY - visibleWindow.y) / visibleWindow.height;

      const inTargetZone =
        normalizedX >= TARGET_ZONE.minX &&
        normalizedX <= TARGET_ZONE.maxX &&
        normalizedY >= TARGET_ZONE.minY &&
        normalizedY <= TARGET_ZONE.maxY;

      if (!inTargetZone) {
        return null;
      }

      const dx = normalizedX - 0.5;
      const dy = normalizedY - 0.5;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distanceFromCenter > CENTER_TARGET_RADIUS) {
        return null;
      }

      const areaRatio = Math.min(
        1,
        (rawBox.width * rawBox.height) / (visibleWindow.width * visibleWindow.height),
      );
      const centerScore = 1 - distanceFromCenter / CENTER_TARGET_RADIUS;
      const verticalScore = 1 - Math.min(1, Math.abs(normalizedY - 0.5) / 0.2);

      return centerScore * 0.58 + verticalScore * 0.24 + areaRatio * 0.18;
    };

    const buildCandidate = (rawValue, rawBox, visibleWindow) => {
      if (!rawValue || !rawBox || !visibleWindow) return null;
      if (!isWithinVisibleWindow(rawBox, visibleWindow)) return null;

      const normalizedBox = normalizeScanBox(rawBox, visibleWindow);
      if (!normalizedBox) return null;

      const score = getTargetScore(rawBox, visibleWindow);
      if (score === null) return null;

      return {
        rawValue,
        normalizedBox,
        score,
      };
    };

    const boxFromPoints = (points) => {
      if (!Array.isArray(points) || points.length === 0) return null;
      const xs = points.map((point) => point.x).filter((value) => Number.isFinite(value));
      const ys = points.map((point) => point.y).filter((value) => Number.isFinite(value));
      if (!xs.length || !ys.length) return null;

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const rawWidth = maxX - minX;
      const rawHeight = maxY - minY;
      const padX = Math.max(14, rawWidth * 0.22);
      const padY = Math.max(14, rawHeight * 0.6);

      return {
        left: minX - padX,
        top: minY - padY,
        width: Math.max(24, rawWidth + padX * 2),
        height: Math.max(24, rawHeight + padY * 2),
      };
    };

    const candidateFromBarcodeDetectorResult = (barcode) => {
      const visibleWindow = getVisibleSourceWindow();
      if (!visibleWindow) return null;

      let rawBox = null;

      if (Array.isArray(barcode.cornerPoints) && barcode.cornerPoints.length) {
        rawBox = boxFromPoints(barcode.cornerPoints);
      }

      if (!rawBox && barcode.boundingBox) {
        rawBox = {
          left: barcode.boundingBox.x,
          top: barcode.boundingBox.y,
          width: barcode.boundingBox.width,
          height: barcode.boundingBox.height,
        };
      }

      return buildCandidate(barcode.rawValue, rawBox, visibleWindow);
    };

    const candidateFromZxingResult = (result) => {
      if (!result?.getResultPoints) return null;

      const points = result.getResultPoints();
      const rawBox = boxFromPoints(points);
      const visibleWindow = getVisibleSourceWindow();

      return buildCandidate(result.getText(), rawBox, visibleWindow);
    };

    const pickBestNativeCandidate = (barcodes) => {
      if (!Array.isArray(barcodes) || barcodes.length === 0) return null;

      let bestCandidate = null;
      for (const barcode of barcodes) {
        if (!barcode?.rawValue) continue;
        const candidate = candidateFromBarcodeDetectorResult(barcode);
        if (!candidate) continue;

        if (!bestCandidate || candidate.score > bestCandidate.score) {
          bestCandidate = candidate;
        }
      }

      return bestCandidate;
    };

    const captureFreezeFrame = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        return '';
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return '';

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.72);
    };

    const beginCooldown = () => {
      scanLockedRef.current = true;
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }

      cooldownTimerRef.current = window.setTimeout(() => {
        scanLockedRef.current = false;
        setFreezeFrameSrc('');
        setScanBox(null);
        setShowSuccessLine(false);
        setStatusText(getReadyStatus());
      }, 700);
    };

    const handleDetectedId = (rawValue, detectedBox = null) => {
      if (scanLockedRef.current) return;

      const id = String(rawValue || '').trim();
      if (!id) return;

      const now = Date.now();
      const isDuplicate =
        recentScanRef.current.id === id && now - recentScanRef.current.time < 800;

      if (!isDuplicate) {
        recentScanRef.current = { id, time: now };
        setScanBox(detectedBox);
        setFreezeFrameSrc(captureFreezeFrame());
        setShowSuccessLine(true);
        setStatusText(`Scanned: ${id}`);

        if (navigator.vibrate) {
          navigator.vibrate(45);
        }

        Promise.resolve(onScanRef.current(id)).catch(() => {
          // Keep the feedback cycle smooth even if scan handling fails.
        });

        if (pauseAfterScan) {
          scanLockedRef.current = true;
          if (pauseAfterScanTimerRef.current) {
            window.clearTimeout(pauseAfterScanTimerRef.current);
          }

          pauseAfterScanTimerRef.current = window.setTimeout(() => {
            setIsScannerActive(false);
          }, 900);
        } else {
          beginCooldown();
        }
      }
    };

    const detectLoop = async () => {
      if (stopped || !videoRef.current || !detectorRef.current) return;

      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const bestCandidate = pickBestNativeCandidate(barcodes);
          if (!bestCandidate) {
            rafRef.current = window.requestAnimationFrame(detectLoop);
            return;
          }

          handleDetectedId(bestCandidate.rawValue, bestCandidate.normalizedBox);
        }
      } catch {
        // Ignore occasional detector read errors while camera stream initializes.
      }

      rafRef.current = window.requestAnimationFrame(detectLoop);
    };

    const startScanner = async () => {
      if (!isSecureContextForCamera) {
        setStatusText('Camera requires HTTPS on mobile Safari. Use manual ID entry.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusText('Camera API unavailable; use manual ID entry.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ('BarcodeDetector' in window) {
          scannerModeRef.current = 'native';
          detectorRef.current = new window.BarcodeDetector({
            formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
          });
          setStatusText(getReadyStatus());
          rafRef.current = window.requestAnimationFrame(detectLoop);
        } else {
          const reader = new BrowserMultiFormatReader();
          zxingReaderRef.current = reader;

          try {
            scannerModeRef.current = 'compat';
            setStatusText(getReadyStatus());
            const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
              if (result) {
                const candidate = candidateFromZxingResult(result);
                if (!candidate) return;

                handleDetectedId(candidate.rawValue, candidate.normalizedBox);
              }
            });

            zxingControlsRef.current = controls;
          } catch {
            scannerModeRef.current = 'manual';
            setStatusText('Live camera on. Auto barcode detect unavailable; use manual ID entry.');
          }
        }
      } catch {
        setStatusText('Camera blocked or unavailable; use manual ID entry.');
      }
    };

    startScanner();

    return stopScanner;
  }, [isScannerActive, pauseAfterScan]);

  useEffect(() => {
    const restoreViewport = () => {
      window.setTimeout(() => {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

        const stockCheckPage = document.querySelector('.pageStockCheck');
        if (stockCheckPage && typeof stockCheckPage.scrollTo === 'function') {
          stockCheckPage.scrollTo({ top: 0, behavior: 'auto' });
        }

        window.scrollTo(0, 0);
      }, 120);
    };

    const inputEl = manualInputRef.current;
    if (inputEl) {
      inputEl.addEventListener('blur', restoreViewport);
    }

    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      if (document.activeElement !== manualInputRef.current) {
        restoreViewport();
      }
    };

    if (viewport) {
      viewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      if (inputEl) {
        inputEl.removeEventListener('blur', restoreViewport);
      }
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  const submitManualId = () => {
    const id = manualId.trim();
    if (!id) return;

    if (manualInputRef.current) {
      manualInputRef.current.blur();
    }

    onScanRef.current(id);
    setManualId('');
  };

  const reactivateScanner = () => {
    setFreezeFrameSrc('');
    setScanBox(null);
    setShowSuccessLine(false);
    scanLockedRef.current = false;
    setStatusText('Reactivating camera...');
    setIsScannerActive(true);
  };

  return (
    <section className="scannerPanel">
      <div className="scannerBadge">Camera Scanner</div>
      {isScannerActive ? (
        <div ref={frameRef} className="scannerFrame">
          <video ref={videoRef} className="scannerVideo" playsInline muted />
          <div className="scannerTargetGuide" aria-hidden="true" />
          {freezeFrameSrc ? (
            <img className="scannerFreezeImage" src={freezeFrameSrc} alt="Recent scan freeze frame" />
          ) : null}
          {scanBox ? (
            <div
              className="scannerScanBox"
              style={{
                left: `${scanBox.left}%`,
                top: `${scanBox.top}%`,
                width: `${scanBox.width}%`,
                height: `${scanBox.height}%`,
              }}
            />
          ) : null}
          {showSuccessLine ? <div className="scannerSuccessLine" /> : null}
          <div className="scannerOverlay">Align barcode inside frame</div>
        </div>
      ) : (
        <button className="secondaryButton scannerReactivateButton" onClick={reactivateScanner}>
          Scan Another
        </button>
      )}
      <div className="scannerStatus">{statusText}</div>
      {isScannerActive ? (
        <div className="scannerManualRow">
          <input
            ref={manualInputRef}
            className="fieldInput scannerManualInput"
            placeholder="Enter item ID"
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitManualId();
              }
            }}
          />
          <button className="scanButton" onClick={submitManualId}>
            Add ID
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default ScannerPanel;
