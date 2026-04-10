import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine } from "lucide-react";

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
 * Modal barcode / QR scanner for serial numbers.
 *
 * Props:
 *  onScan(decodedText)  – called once when a code is successfully read
 *  onClose()            – called when the user dismisses the scanner
 */
const SerialScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  // Guard so stop() + clear() are never called twice concurrently.
  const isStoppingRef = useRef(false);
  const rawId = useId();
  const readerId = useMemo(
    () => `serial-scanner-${rawId.replace(/:/g, "")}`,
    [rawId],
  );

  /**
   * Fully stop the scanner and release the camera stream.
   * Safe to call multiple times — only executes once.
   */
  const stopCamera = async () => {
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
  };

  useEffect(() => {
    let unmounted = false;

    const start = async () => {
      // Reset stop-guard so a fresh start is always allowed (handles React
      // StrictMode's mount → cleanup → remount cycle in development).
      isStoppingRef.current = false;

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
          },
          (decodedText) => {
            if (unmounted) return;
            onScan(decodedText.trim());
          },
          () => {
            // per-frame decode errors are expected; suppress them
          },
        );

        if (!unmounted) setScanning(true);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Panel */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900 text-sm">
              Scan Serial Number
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
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
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SerialScanner;
