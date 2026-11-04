'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check, Sparkles, PenTool, Eraser, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  initialSignature?: string | null;
  signerName?: string;
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
}

export const DigitalSignaturePad: React.FC<Props> = ({
  initialSignature,
  signerName = 'Bác sĩ',
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e40af'); // Mực xanh y tế mặc định
  const [penWidth, setPenWidth] = useState(3);
  const [activeTab, setActiveTab] = useState<'draw' | 'presets'>('draw');

  // Last coordinates for smooth Bézier curves
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    initCanvas();
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-resolution internal buffer (1000x440) for crisp lines
    canvas.width = 1000;
    canvas.height = 440;

    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth * 2;

    // Clear transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    lastPointRef.current = null;
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && (e as any).changedTouches?.length > 0) {
        clientX = (e as any).changedTouches[0].clientX;
        clientY = (e as any).changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Exact scale factor from bounding client rect (screen CSS pixels) to canvas buffer pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    setIsDrawing(true);
    setHasDrawn(true);

    const actualPenWidth = penWidth * 2;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = actualPenWidth;
    ctx.fillStyle = penColor;

    // Draw initial dot at click point
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, actualPenWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    // Start path
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);
    const lastCoords = lastPointRef.current;

    if (lastCoords) {
      const actualPenWidth = penWidth * 2;
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = actualPenWidth;

      ctx.beginPath();
      ctx.moveTo(lastCoords.x, lastCoords.y);
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    }

    lastPointRef.current = currentCoords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  // Crop empty transparent edges for tight bounding box
  const cropCanvas = (sourceCanvas: HTMLCanvasElement): string => {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return sourceCanvas.toDataURL('image/png');

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) {
      return sourceCanvas.toDataURL('image/png');
    }

    // Add padding around cropped signature
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropWidth;
    trimmedCanvas.height = cropHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return sourceCanvas.toDataURL('image/png');

    trimmedCtx.drawImage(sourceCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return trimmedCanvas.toDataURL('image/png');
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      toast.error('Vui lòng ký vào khung trước khi lưu');
      return;
    }

    const dataUrl = cropCanvas(canvas);
    onSave(dataUrl);
    toast.success('Đã lưu chữ ký điện tử thành công!');
  };

  // Generate calligraphic preset SVG to PNG
  const applyCalligraphicPreset = (presetType: 1 | 2 | 3) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 180);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (presetType === 1) {
      // Stylized loop signature
      ctx.beginPath();
      ctx.moveTo(40, 120);
      ctx.bezierCurveTo(80, 20, 100, 160, 140, 50);
      ctx.bezierCurveTo(160, 10, 180, 120, 220, 60);
      ctx.bezierCurveTo(240, 30, 270, 90, 340, 40);
      ctx.stroke();

      // Flourish line
      ctx.beginPath();
      ctx.moveTo(90, 130);
      ctx.bezierCurveTo(180, 145, 280, 120, 360, 110);
      ctx.stroke();
    } else if (presetType === 2) {
      // Elegant curved signature
      ctx.beginPath();
      ctx.moveTo(50, 90);
      ctx.bezierCurveTo(80, 30, 120, 30, 140, 110);
      ctx.bezierCurveTo(150, 150, 190, 40, 230, 80);
      ctx.bezierCurveTo(250, 100, 290, 30, 350, 70);
      ctx.stroke();

      // Sharp underline
      ctx.beginPath();
      ctx.moveTo(60, 125);
      ctx.lineTo(330, 125);
      ctx.stroke();
    } else {
      // Wave & hook signature
      ctx.beginPath();
      ctx.moveTo(50, 130);
      ctx.quadraticCurveTo(80, 30, 120, 80);
      ctx.quadraticCurveTo(150, 140, 190, 40);
      ctx.quadraticCurveTo(230, 130, 270, 70);
      ctx.quadraticCurveTo(310, 30, 350, 90);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(110, 140);
      ctx.lineTo(340, 110);
      ctx.stroke();
    }

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    toast.success('Đã áp dụng mẫu chữ ký điện tử nghệ thuật!');
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'draw'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          Ký Bằng Tay / Chuột
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'presets'
              ? 'bg-navy text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Mẫu Ký Nghệ Thuật
        </button>
      </div>

      {activeTab === 'draw' ? (
        <div className="space-y-3">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                Mực ký:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { color: '#1e40af', label: 'Xanh Y Tế' },
                  { color: '#0f172a', label: 'Đen Đậm' },
                  { color: '#6b21a8', label: 'Tím Đậm' },
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => { setPenColor(c.color); }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      penColor === c.color ? 'scale-110 border-slate-800 ring-2 ring-blue-300' : 'border-white'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Pen width */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Độ dày nét:</span>
              <div className="flex items-center gap-1">
                {[
                  { w: 2, label: 'Mảnh' },
                  { w: 3, label: 'Vừa' },
                  { w: 4.5, label: 'Đậm' }
                ].map(p => (
                  <button
                    key={p.w}
                    type="button"
                    onClick={() => setPenWidth(p.w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      penWidth === p.w
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs h-7 border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Xóa ký lại
            </Button>
          </div>

          {/* Canvas Box */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner cursor-crosshair">
            <canvas
              ref={canvasRef}
              className="w-full h-44 sm:h-52 touch-none block select-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onPointerDown={(e) => {
                try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                startDrawing(e);
              }}
              onPointerMove={draw}
              onPointerUp={(e) => {
                try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                stopDrawing();
              }}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
                <PenTool className="w-6 h-6 mb-1 opacity-50 text-slate-400" />
                <p className="text-xs font-medium">Dùng chuột, bút hoặc ngón tay để ký trực tiếp vào khung này</p>
                <p className="text-[10px] text-slate-300 mt-0.5">(Hệ thống tự động lưu chữ ký nét chuẩn tách nền)</p>
              </div>
            )}

            {/* Baseline guideline */}
            <div className="absolute bottom-8 left-8 right-8 border-b border-dashed border-slate-200 pointer-events-none flex justify-between text-[10px] text-slate-300">
              <span>Đường gióng ký tên</span>
              <span>{signerName}</span>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end gap-2 pt-1">
            {onCancel && (
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Hủy
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSaveSignature}
              disabled={!hasDrawn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-sm"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Lưu & Áp Dụng Chữ Ký Này
            </Button>
          </div>
        </div>
      ) : (
        /* Presets Tab */
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Nếu không tiện ký bằng chuột, bạn có thể chọn nhanh 1 trong các mẫu chữ ký số nghệ thuật dưới đây:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(preset => (
              <div
                key={preset}
                className="border border-slate-200 rounded-xl p-3 bg-white hover:border-navy hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-between gap-3 group"
                onClick={() => applyCalligraphicPreset(preset as 1 | 2 | 3)}
              >
                <div className="h-20 w-full flex items-center justify-center bg-slate-50/70 rounded-lg p-2">
                  <svg className="w-full h-full text-blue-800" viewBox="0 0 160 70">
                    {preset === 1 && (
                      <>
                        <path d="M 15 45 C 30 15, 45 60, 60 25 C 75 5, 80 50, 95 30 C 110 15, 120 40, 145 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 40 55 C 70 58, 120 48, 150 50" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </>
                    )}
                    {preset === 2 && (
                      <>
                        <path d="M 20 40 C 40 10, 60 10, 70 50 C 75 70, 95 20, 115 40 C 125 50, 145 15, 150 35" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="25" y1="58" x2="145" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                    {preset === 3 && (
                      <>
                        <path d="M 25 55 Q 40 15 60 40 Q 75 70 95 20 Q 115 65 135 35 Q 145 15 155 45" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="55" y1="65" x2="150" y2="50" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold group-hover:bg-navy group-hover:text-white"
                >
                  Áp dụng Mẫu #{preset}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default DigitalSignaturePad;
