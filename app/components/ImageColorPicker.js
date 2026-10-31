
"use client";

import { useRef, useState } from "react";

export default function ImageColorPicker({
  targetColor,
  onColorChange,
}) {
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setImageLoaded(false);

    const imageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        URL.revokeObjectURL(imageUrl);
        return;
      }

      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      const maxDimension = 1000;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
      );

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      setFileName(file.name);
      setImageLoaded(true);
      URL.revokeObjectURL(imageUrl);
    };

    image.onerror = () => {
      setError("Unable to open this image.");
      URL.revokeObjectURL(imageUrl);
    };

    image.src = imageUrl;
  }

  function handleCanvasClick(event) {
    const canvas = canvasRef.current;

    if (!canvas || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();

    const x = Math.min(
      canvas.width - 1,
      Math.max(
        0,
        Math.floor(
          ((event.clientX - rect.left) / rect.width) *
            canvas.width
        )
      )
    );

    const y = Math.min(
      canvas.height - 1,
      Math.max(
        0,
        Math.floor(
          ((event.clientY - rect.top) / rect.height) *
            canvas.height
        )
      )
    );

    const context = canvas.getContext("2d");

    const pixel = context.getImageData(x, y, 1, 1).data;

    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    onColorChange(hex);
  }

  return (
    <div className="mt-5 space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">
          Upload a reference image
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="block w-full text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className={imageLoaded ? "block" : "hidden"}>
        <p className="mb-2 text-sm text-slate-500">
          Click anywhere on the image to sample a color.
        </p>

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="h-auto w-full cursor-crosshair rounded-lg border border-slate-200"
          style={{ display: "block" }}
        />

        <p className="mt-2 truncate text-xs text-slate-500">
          {fileName}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3">
        <div
          className="h-12 w-12 rounded-lg border border-slate-300"
          style={{ backgroundColor: targetColor }}
        />

        <div>
          <p className="text-xs text-slate-500">
            Selected target color
          </p>

          <p className="font-mono font-semibold uppercase">
            {targetColor}
          </p>
        </div>
      </div>
    </div>
  );
}
