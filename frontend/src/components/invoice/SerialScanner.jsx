import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Zap, ZapOff, Keyboard } from "lucide-react";

// Focus only on formats used for product serial numbers.
// Fewer formats = faster decode + higher accuracy per frame.
const SERIAL_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128, // Most common on industrial labels
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE, // Keep QR in case serial is in QR format
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

/**
 * Short confirmation beep, synthesized with WebAudio so no external
 * asset needs to ship with the component. Fails silently on browsers
 * that block audio without a prior user gesture.
 */
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext unsupported/blocked — non-critical, ignore
  }
}

/**
 * Modal barcode / QR scanner for serial numbers.
 *
 * Props:
 *  onScan(decodedText)  – called once per successful scan (deduped)
 *  onClose()            – called when the user dismisses the scanner
 */
const SerialScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const scannerRef = useRef(null);
  // Guard so stop() + clear() are never called twice concurrently.
  const isStoppingRef = useRef(false);
  // Guard so a single physical scan can never fire onScan more than once —
  // html5-qrcode keeps decoding subsequent frames of the same code until
  // something explicitly pauses/stops it.
  const hasScannedRef = useRef(false);
  const closeBtnRef = useRef(null);

  // Always-latest callback refs. The start() effect below intentionally
  // mounts once (StrictMode-safe camera lifecycle) — reading through a ref
  // means it always calls the current onScan/onClose instead of whatever
  // was passed in on first render.
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const rawId = useId();
  const readerId = useMemo(
    () => `serial-scanner-${rawId.replace(/:/g, "")}`,
    [rawId],
  );

  /**
   * Fully stop the scanner and release the camera stream.
   * Safe to call multiple times — only executes once.
   */
  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      // getState(): 1=NOT_STARTED, 2=SCANNING, 3=PAUSED
      const state = scanner.getState?.();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // ignore stop errors
    }

    try {
      // clear() destroys the DOM element and releases the MediaStream so the
      // camera indicator light turns off.
      scanner.clear();
    } catch {
      // ignore clear errors
    }

    // Belt-and-suspenders: stop every video track that may still be live.
    try {
      const videoEl = document.getElementById(readerId)?.querySelector("video");
      videoEl?.srcObject?.getTracks()?.forEach((track) => track.stop());
    } catch {
      // ignore
    }
  }, [readerId]);

  useEffect(() => {
    let unmounted = false;

    const start = async () => {
      // Reset guards so a fresh start is always allowed (handles React
      // StrictMode's mount → cleanup → remount cycle in development).
      isStoppingRef.current = false;
      hasScannedRef.current = false;

      // Wipe any leftover DOM nodes html5-qrcode injected in a previous run
      // (StrictMode re-mount, HMR, etc.) so we never get two stacked videos.
      const container = document.getElementById(readerId);
      if (container) container.innerHTML = "";

      try {
        const html5Qrcode = new Html5Qrcode(readerId, {
          formatsToSupport: SERIAL_FORMATS,
          // Use Chrome/Edge native BarcodeDetector API when available —
          // dramatically more accurate and faster than the JS fallback.
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false,
        });
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            // Thin horizontal strip matches 1D barcode aspect ratio;
            // keeps the code in the focal zone for sharper reads.
            qrbox: { width: 280, height: 80 },
            aspectRatio: 1.7777778, // 16:9 — higher camera resolution
            // Rear camera footage never needs a mirrored decode pass —
            // skipping it roughly halves decode attempts per frame.
            disableFlip: true,
          },
          (decodedText) => {
            if (unmounted || hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Freeze the last good frame immediately so the UI doesn't
            // keep "re-scanning" while the parent reacts to onScan.
            try {
              html5Qrcode.pause(true);
            } catch {
              // ignore pause errors
            }

            if (navigator.vibrate) navigator.vibrate(80);
            playBeep();

            onScanRef.current(decodedText.trim());
          },
          () => {
            // per-frame decode errors are expected; suppress them
          },
        );

        if (unmounted) return;
        setScanning(true);

        // Best-effort focus/lighting tuning for small serial-number text.
        // Not all browsers expose these track capabilities, so every step
        // here is optional and silently skipped when unsupported.
        try {
          const capabilities = html5Qrcode.getRunningTrackCapabilities?.();
          if (capabilities?.focusMode?.includes?.("continuous")) {
            await html5Qrcode.applyVideoConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          }
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
        } catch {
          // ignore — camera still works without these refinements
        }
      } catch (err) {
        if (!unmounted) {
          setError(
            err?.message?.includes("Permission")
              ? "Camera permission denied. Please allow camera access and try again."
              : "Could not start camera. Make sure no other app is using it.",
          );
        }
      }
    };

    start();

    return () => {
      unmounted = true;
      // Cleanup runs when parent removes the component (e.g. after handleClose
      // already called stopCamera). stopCamera's guard prevents a double-stop.
      stopCamera();
    };
  }, [readerId, stopCamera]);

  // Escape closes the modal, matching standard dialog behavior.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basic focus handling for the dialog.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  const handleClose = async () => {
    await stopCamera();
    onCloseRef.current();
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const next = !torchOn;
      await scanner.applyVideoConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      // Some browsers report torch support but reject the constraint —
      // fail quietly rather than surface a confusing error to the user.
    }
  };

  const submitManual = () => {
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    onScanRef.current(trimmed);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Panel */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${readerId}-title`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <span
              id={`${readerId}-title`}
              className="font-semibold text-gray-900 text-sm"
            >
              Scan Serial Number
            </span>
          </div>
          <div className="flex items-center gap-1">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label={
                  torchOn ? "Turn off flashlight" : "Turn on flashlight"
                }
                aria-pressed={torchOn}
              >
                {torchOn ? (
                  <ZapOff className="w-5 h-5 text-amber-500" />
                ) : (
                  <Zap className="w-5 h-5 text-gray-500" />
                )}
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              aria-label="Close scanner"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="p-4 bg-gray-950">
          <div
            id={readerId}
            className="rounded-lg overflow-hidden"
            style={{ minHeight: 200 }}
          />
        </div>

        {/* Status / error */}
        <div className="px-4 py-3 text-center text-sm">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : scanning ? (
            <p className="text-gray-500">
              Align the barcode inside the red line
            </p>
          ) : (
            <p className="text-gray-400">Starting camera…</p>
          )}
        </div>

        {/* Footer */}
        {manualMode ? (
          <div className="px-4 pb-4 flex gap-2">
            <input
              autoFocus
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="Enter serial number"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submitManual}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Use
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Can't scan? Enter manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SerialScanner;
