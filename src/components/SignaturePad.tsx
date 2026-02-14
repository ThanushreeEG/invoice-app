"use client";

import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
}

export default function SignaturePad({ onSave }: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas | null>(null);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas && !canvas.isEmpty()) {
      const dataUrl = canvas.getTrimmedCanvas().toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  return (
    <div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <SignatureCanvas
          ref={canvasRef}
          canvasProps={{
            className: "w-full rounded-lg",
            style: { width: "100%", height: "150px" },
          }}
          penColor="black"
          backgroundColor="rgb(255,255,255)"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Draw signature above using mouse or finger
      </p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
        >
          Save Signature
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
