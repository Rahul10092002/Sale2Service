import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, ScanLine } from "lucide-react";

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
  const rawId = useId();
  const readerId = useMemo(
    () => `serial-scanner-${rawId.replace(/:/g, "")}`,
    [rawId],
  );

  useEffect(() => {
    let html5Qrcode = null;
    let stopped = false;

    const start = async () => {
      try {
        html5Qrcode = new Html5Qrcode(readerId);
        scannerRef.current = html5Qrcode;
        setScanning(true);
        setError(null);

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 140 },
            // Support 1-D barcodes (EAN, Code128, etc.) as well as QR
            formatsToSupport: undefined, // undefined = all supported formats
          },
          (decodedText) => {
            if (stopped) return;
            onScan(decodedText.trim());
          },
          () => {
            // per-frame errors are expected; suppress them
          },
        );
      } catch (err) {
        if (!stopped) {
          setError(
            err?.message?.includes("Permission")
              ? "Camera permission denied. Please allow camera access and try again."
              : "Could not start camera. Make sure no other app is using it.",
          );
          setScanning(false);
        }
      }
    };

    start();

    return () => {
      stopped = true;
      if (
        html5Qrcode &&
        (html5Qrcode.isScanning || html5Qrcode.getState?.() === 2)
      ) {
        html5Qrcode.stop().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    const scanner = scannerRef.current;
    if (scanner) {
      scanner
        .stop()
        .catch(() => {})
        .finally(onClose);
    } else {
      onClose();
    }
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
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
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
            style={{ minHeight: 220 }}
          />
        </div>

        {/* Status / error */}
        <div className="px-4 py-3 text-center text-sm">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : scanning ? (
            <p className="text-gray-500">
              Point your camera at a barcode or QR code
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
