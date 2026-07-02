import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Zap, ZapOff, Keyboard, Sparkles } from "lucide-react";

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
 * In-place grayscale + linear contrast stretch.
 * Cheap (two passes, no allocations beyond one typed array) and it's the
 * single biggest lever for a low-quality still: a blurry barcode usually
 * has real edges, just compressed into a narrow, low-contrast gray band.
 * Stretching that band to the full 0-255 range makes the bar/space
 * transitions sharp enough for the decoder's binarizer to find them.
 */
function enhanceContrast(imageData) {
  const { data } = imageData;
  const pixelCount = data.length / 4;
  const gray = new Uint8ClampedArray(pixelCount);
  let min = 255;
  let max = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const range = Math.max(max - min, 1);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const stretched = ((gray[p] - min) / range) * 255;
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
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
  const [zoomCaps, setZoomCaps] = useState(null); // { min, max, step } or null if unsupported
  const [zoom, setZoom] = useState(1);
  const [enhancing, setEnhancing] = useState(false);

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
          {
            facingMode: "environment",
            // Explicitly ask for the sensor's max usable resolution.
            // Without this, many browsers default the preview stream to a
            // modest resolution (often 640x480) chosen for smooth video,
            // not for decode accuracy — on an already low-megapixel camera
            // that default leaves almost no pixels across the barcode's
            // bars. Requesting "ideal" high values lets the browser give
            // us whatever its real ceiling is, which is always >= default.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          {
            // Lower than a "smooth video" fps on purpose. On weaker phone
            // CPUs, especially without native BarcodeDetector support, a
            // blurry/noisy frame takes real decode time; requesting frames
            // faster than the decoder can finish just causes drops and
            // wasted work. 10 leaves more budget per frame for the
            // binarizer to actually resolve blurred bar edges.
            fps: 10,
            // Slightly taller than a pure 1D aspect ratio strip. Blurry
            // shots are usually also slightly tilted/handheld; extra
            // vertical room increases the odds that at least one scan row
            // crosses the barcode without bars merging together.
            qrbox: { width: 300, height: 120 },
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

        // Best-effort focus/exposure/zoom tuning. Not all browsers expose
        // these track capabilities, so every step here is optional and
        // silently skipped when unsupported.
        try {
          const capabilities = html5Qrcode.getRunningTrackCapabilities?.();
          const advanced = [];
          if (capabilities?.focusMode?.includes?.("continuous")) {
            advanced.push({ focusMode: "continuous" });
          }
          // Continuous exposure/white-balance reduce the chance the camera
          // locks onto a bad (too dark/blown-out) setting from the first
          // frame, which shows up as low-contrast, hard-to-binarize bars.
          if (capabilities?.exposureMode?.includes?.("continuous")) {
            advanced.push({ exposureMode: "continuous" });
          }
          if (capabilities?.whiteBalanceMode?.includes?.("continuous")) {
            advanced.push({ whiteBalanceMode: "continuous" });
          }
          if (advanced.length) {
            await html5Qrcode.applyVideoConstraints({ advanced });
          }
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
          // Optical/sensor-crop zoom is the most direct fix for a
          // low-megapixel camera: cropping to a smaller sensor region and
          // filling the frame with it puts more real pixels across the
          // same physical barcode, independent of total megapixel count.
          if (capabilities?.zoom) {
            setZoomCaps(capabilities.zoom);
            setZoom(capabilities.zoom.min ?? 1);
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

  // Tap-to-focus: on devices exposing manual focus points, nudge the
  // camera to focus where the user actually tapped the barcode instead of
  // wherever its autofocus heuristic decided to lock onto — the single
  // biggest cause of a "blurry" shot on cheap phone cameras is a focus
  // point that never landed on the label at all.
  const handleViewfinderTap = async (e) => {
    const scanner = scannerRef.current;
    const videoEl = document.getElementById(readerId)?.querySelector("video");
    if (!scanner || !videoEl) return;
    try {
      const capabilities = scanner.getRunningTrackCapabilities?.();
      if (
        !capabilities?.focusMode?.includes?.("manual") &&
        !capabilities?.pointsOfInterest
      ) {
        return;
      }
      const rect = videoEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      await scanner.applyVideoConstraints({
        advanced: [{ pointsOfInterest: [{ x, y }] }],
      });
    } catch {
      // ignore — not all devices support directable focus points
    }
  };

  const handleZoomChange = async (value) => {
    const scanner = scannerRef.current;
    setZoom(value);
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ zoom: value }] });
    } catch {
      // ignore — zoom UI just won't have an effect on this device
    }
  };

  /**
   * Blur fallback: freeze the live scan, grab the sharpest still frame we
   * can get, enhance it, and run a dedicated one-off decode against that
   * single image instead of a continuous 10fps stream. Two things make a
   * still meaningfully better than any live frame on a weak camera:
   *  1. ImageCapture.grabFrame()/takePhoto() reads closer to the sensor's
   *     native output than the (often throttled/compressed) preview
   *     stream frames getUserMedia hands to <video>.
   *  2. It's a single frame, so we can afford a slower, more thorough
   *     contrast-stretch pass than would be viable at 10fps.
   */
  const tryHarder = async () => {
    const scanner = scannerRef.current;
    const videoEl = document.getElementById(readerId)?.querySelector("video");
    if (!scanner || !videoEl || enhancing) return;

    setEnhancing(true);
    try {
      scanner.pause(true);
    } catch {
      // ignore
    }

    let hiddenScanner = null;
    try {
      // Prefer a direct sensor grab over the live <video> element.
      let bitmap = null;
      const track = videoEl.srcObject?.getVideoTracks?.()[0];
      if (track && "ImageCapture" in window) {
        try {
          const capture = new window.ImageCapture(track);
          bitmap = await capture.grabFrame();
        } catch {
          bitmap = null;
        }
      }

      const width = bitmap?.width || videoEl.videoWidth;
      const height = bitmap?.height || videoEl.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap || videoEl, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      enhanceContrast(imageData);
      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      const file = new File([blob], "frame.png", { type: "image/png" });

      // Decode via a throwaway instance on a hidden element — this doesn't
      // touch the live camera scanner, so nothing needs to stop/restart.
      const hiddenId = `${readerId}-still`;
      let hiddenDiv = document.getElementById(hiddenId);
      if (!hiddenDiv) {
        hiddenDiv = document.createElement("div");
        hiddenDiv.id = hiddenId;
        hiddenDiv.style.display = "none";
        document.body.appendChild(hiddenDiv);
      }
      hiddenScanner = new Html5Qrcode(hiddenId, {
        formatsToSupport: SERIAL_FORMATS,
        verbose: false,
      });

      const decodedText = await hiddenScanner.scanFile(file, false);
      hasScannedRef.current = true;
      if (navigator.vibrate) navigator.vibrate(80);
      playBeep();
      onScanRef.current(decodedText.trim());
    } catch {
      // Still couldn't decode — hand control back to the live scanner.
      try {
        scanner.resume();
      } catch {
        // ignore
      }
    } finally {
      if (hiddenScanner) {
        try {
          await hiddenScanner.clear();
        } catch {
          // ignore
        }
      }
      setEnhancing(false);
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
            onClick={handleViewfinderTap}
            className="rounded-lg overflow-hidden"
            style={{ minHeight: 200 }}
          />
        </div>

        {/* Zoom — the most direct fix for a low-megapixel camera: cropping
            in puts more real pixels across the same physical barcode. */}
        {zoomCaps && (
          <div className="px-4 pt-1 flex items-center gap-2">
            <span className="text-xs text-gray-400 w-8">Zoom</span>
            <input
              type="range"
              min={zoomCaps.min}
              max={zoomCaps.max}
              step={zoomCaps.step || 0.1}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
              aria-label="Camera zoom"
            />
          </div>
        )}

        {/* Status / error */}
        <div className="px-4 py-3 text-center text-sm">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : enhancing ? (
            <p className="text-indigo-600">Enhancing frame…</p>
          ) : scanning ? (
            <p className="text-gray-500">
              Align the barcode inside the red line
            </p>
          ) : (
            <p className="text-gray-400">Starting camera…</p>
          )}
        </div>

        {/* Blur fallback trigger */}
        {scanning && !manualMode && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={tryHarder}
              disabled={enhancing}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {enhancing ? "Enhancing…" : "Blurry? Tap to enhance & retry"}
            </button>
          </div>
        )}

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
