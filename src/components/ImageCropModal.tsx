import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveCrop = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const size = 400; // High resolution square logo output
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background (or transparent)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Save canvas state
    ctx.save();

    // Center canvas context for rotation & scaling
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Compute relative scaling factor based on preview viewport (250px)
    const previewViewportSize = 250;
    const scaleFactor = size / previewViewportSize;

    const scaledWidth = img.naturalWidth * (zoom * (previewViewportSize / Math.max(img.naturalWidth, img.naturalHeight)));
    const scaledHeight = img.naturalHeight * (zoom * (previewViewportSize / Math.max(img.naturalWidth, img.naturalHeight)));

    ctx.drawImage(
      img,
      (offset.x * scaleFactor) - (scaledWidth * scaleFactor) / 2,
      (offset.y * scaleFactor) - (scaledHeight * scaleFactor) / 2,
      scaledWidth * scaleFactor,
      scaledHeight * scaleFactor
    );

    ctx.restore();

    const croppedUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Move className="w-5 h-5" />
            <h3 className="text-sm sm:text-base font-black">लोगो क्रॉप करा (Crop Logo)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-6 flex flex-col items-center bg-slate-950/30">
          <p className="text-xs text-slate-400 mb-4 text-center">
            चित्राचा मुख्य भाग वर्तुळात (Circle) बसवण्यासाठी ड्रॅग (Drag) किंवा झूम (Zoom) करा.
          </p>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="relative w-[250px] h-[250px] border-2 border-amber-500 rounded-full overflow-hidden cursor-move shadow-inner select-none bg-slate-950 flex items-center justify-center touch-none"
          >
            {/* Guide Grid overlay */}
            <div className="absolute inset-0 rounded-full border border-amber-400/30 pointer-events-none z-10" />

            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
              className="pointer-events-none select-none"
            />
          </div>

          {/* Controls */}
          <div className="w-full mt-6 space-y-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <ZoomIn className="w-4 h-4 text-amber-400 shrink-0" />
            </div>

            {/* Rotate Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>फिरवा ({rotation}°)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            रद्द करा
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>क्रॉप व सेट करा (Apply Logo)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
