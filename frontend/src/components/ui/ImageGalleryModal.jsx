import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "./index.js";

/**
 * Reusable Image Gallery / Lightbox Modal for Products, Services, Customers, and Invoices.
 */
export default function ImageGalleryModal({
  isOpen,
  onClose,
  images = [],
  title = "Image Gallery",
  subtitle = null,
  initialIndex = 0,
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Normalize image list
  const imageList = Array.isArray(images)
    ? images.filter((img) => Boolean(img && typeof img === "string"))
    : typeof images === "string" && images.trim()
    ? [images.trim()]
    : [];

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(
        initialIndex >= 0 && initialIndex < imageList.length ? initialIndex : 0
      );
    }
  }, [isOpen, initialIndex, imageList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || imageList.length <= 1) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % imageList.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, imageList.length]);

  if (!isOpen || imageList.length === 0) return null;

  const currentImage = imageList[activeIndex] || imageList[0];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="3xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white truncate text-base leading-snug">
              {title}
            </div>
            {subtitle ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                {typeof subtitle === "string" ? <span>{subtitle}</span> : subtitle}
                <span>• {imageList.length} Image{imageList.length > 1 ? "s" : ""}</span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                {imageList.length} Image{imageList.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Main Image Showcase */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[60vh] sm:max-h-[65vh] border border-slate-800 shadow-inner group select-none">
            <img
              src={currentImage}
              alt={`${title} - View ${activeIndex + 1}`}
              className="max-h-[55vh] sm:max-h-[60vh] w-auto max-w-full object-contain mx-auto transition-transform duration-200"
            />

            {/* Previous Button */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex(
                    (prev) => (prev - 1 + imageList.length) % imageList.length
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg"
                title="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % imageList.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg"
                title="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Image Counter Badge */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm text-white text-xs font-bold border border-white/10 shadow-sm">
              {activeIndex + 1} / {imageList.length}
            </div>
          </div>

          {/* Thumbnail Strip (when multiple images exist) */}
          {imageList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin">
              {imageList.map((imgUrl, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      isActive
                        ? "border-purple-500 ring-2 ring-purple-400/50 scale-95 opacity-100"
                        : "border-gray-200 dark:border-dark-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href={currentImage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Open Full Image
            </a>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
