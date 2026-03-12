"use client";

import { useState, useRef, useEffect } from "react";
import { Play, X } from "lucide-react";

export function VideoModalButton() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/80 text-gray-700 rounded-lg font-semibold text-sm md:text-base border border-gray-300 hover:bg-white transition-all cursor-pointer"
      >
        <Play size={16} className="text-green-600" />
        Watch How It Works
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close video"
            >
              <X size={28} />
            </button>

            {/* Video */}
            <video
              ref={videoRef}
              src="/how-it-works.mp4"
              controls
              autoPlay
              className="w-full rounded-xl shadow-2xl"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </>
  );
}
