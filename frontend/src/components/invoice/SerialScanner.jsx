import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Flashlight } from "lucide-react";

const SERIAL_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const SerialScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef(null);
  const trackRef = useRef(null);
  const intervalRef = useRef(null);

  const isStoppingRef = useRef(false);
  const rawId = useId();
  const readerId = useMemo(
    () => `serial-scanner-${rawId.replace(/:/g, "")}`,
    [rawId],
  );

  // ------------------ TORCH CONTROL ------------------
  const enableTorch = async () => {
    try {
      if (!trackRef.current) return;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: true }],
      });
      setTorchOn(true);
    } catch {}
  };

  const disableTorch = async () => {
    try {
      if (!trackRef.current) return;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: false }],
      });
      setTorchOn(false);
    } catch {}
  };

  // ------------------ BRIGHTNESS DETECTION ------------------
  const startBrightnessCheck = () => {
    intervalRef.current = setInterval(() => {
      try {
        const video = document.getElementById(readerId)?.querySelector("video");
        if (!video || !trackRef.current) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);

        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;

        let brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }

        brightness /= data.length / 4;

        // 🔥 threshold tuning (30–60 works well)
        if (brightness < 50 && !torchOn) {
          enableTorch();
        } else if (brightness >= 60 && torchOn) {
          disableTorch();
        }
      } catch {}
    }, 1500); // check every 1.5 sec
  };

  const stopBrightnessCheck = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // ------------------ STOP CAMERA ------------------
  const stopCamera = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    stopBrightnessCheck();

    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      const state = scanner.getState?.();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}

    try {
      const videoEl = document.getElementById(readerId)?.querySelector("video");
      videoEl?.srcObject?.getTracks()?.forEach((track) => track.stop());
    } catch {}
  };

  // ------------------ START CAMERA ------------------
  useEffect(() => {
    let unmounted = false;

    const start = async () => {
      isStoppingRef.current = false;

      const container = document.getElementById(readerId);
      if (container) container.innerHTML = "";

      try {
        const html5Qrcode = new Html5Qrcode(readerId, {
          formatsToSupport: SERIAL_FORMATS,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });

        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 80 },
            aspectRatio: 1.7777778,
          },
          (decodedText) => {
            if (unmounted) return;
            onScan(decodedText.trim());
          },
          () => {},
        );

        // 🔥 Get camera track for torch
        const track = html5Qrcode.getRunningTrack();
        trackRef.current = track;

        if (track?.getCapabilities?.().torch) {
          startBrightnessCheck();
        }

        if (!unmounted) setScanning(true);
      } catch (err) {
        if (!unmounted) {
          setError(
            err?.message?.includes("Permission")
              ? "Camera permission denied."
              : "Camera start failed.",
          );
        }
      }
    };

    start();

    return () => {
      unmounted = true;
      stopCamera();
    };
  }, []);

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  // ------------------ UI ------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-sm">Scan Serial Number</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Manual torch toggle */}
            <button
              onClick={() => (torchOn ? disableTorch() : enableTorch())}
              className="p-1 rounded hover:bg-gray-100"
            >
              <Flashlight
                className={`w-5 h-5 ${
                  torchOn ? "text-yellow-500" : "text-gray-400"
                }`}
              />
            </button>

            <button onClick={handleClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Camera */}
        <div className="p-4 bg-black">
          <div
            id={readerId}
            className="rounded-lg overflow-hidden"
            style={{ minHeight: 200 }}
          />
        </div>

        {/* Status */}
        <div className="px-4 py-3 text-center text-sm">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : scanning ? (
            <p className="text-gray-500">Align barcode in frame</p>
          ) : (
            <p className="text-gray-400">Starting camera…</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SerialScanner;
