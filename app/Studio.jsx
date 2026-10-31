
"use client";

import { useState } from "react";
import PaintInventory from "./components/PaintInventory";
import ImageColorPicker from "./components/ImageColorPicker";
import MixCalculator from "./components/MixCalculator";
import MixCalibration from "./components/MixCalibration";
import { useBrowserScale } from "./components/useBrowserScale";
import DataTransfer from "./components/DataTransfer";
import SavedRecipes from "./components/SavedRecipes";

export default function Studio() {
const [targetColor, setTargetColor] = useState("#7895A8");
const [currentRecipe, setCurrentRecipe] = useState([]);
const { weight: scaleWeight, connected: scaleConnected, connecting, error: scaleError, supported, connect, disconnect } = useBrowserScale();
const [loadedRecipe, setLoadedRecipe] = useState(null);
const [tareOffset, setTareOffset] = useState(0);
const [isMixing, setIsMixing] = useState(false);
const [mixRecipe, setMixRecipe] = useState([]);
const [selectedPaintIndex, setSelectedPaintIndex] = useState(null);
const [paintAmounts, setPaintAmounts] = useState([]);
const [selectionStartWeight, setSelectionStartWeight] = useState(0);
const hasScaleReading = scaleConnected && Number.isFinite(scaleWeight);
const displayedAmounts = paintAmounts.map((amount, index) =>
  index === selectedPaintIndex && hasScaleReading
    ? amount + scaleWeight - selectionStartWeight
    : amount
);

function selectPaint(index) {
  if (!hasScaleReading || index === selectedPaintIndex) return;
  setPaintAmounts(displayedAmounts);
  setSelectionStartWeight(scaleWeight);
  setSelectedPaintIndex(index);
}

  const sections = [
    {
      title: "Target Color",
      description: "Choose a color to recreate with your acrylic paints.",
      icon: "🎨",
    },
    {
      title: "My Paints",
      description: "Manage your available acrylic paint colors.",
      icon: "🖌️",
    },
    {
      title: "Mix Recipes",
      description: "Calculate and save paint mixing recipes.",
      icon: "🧪",
    },
    {
      title: "Live Scale",
      description: "Connect your Arduino scale for real-time mixing.",
      icon: "⚖️",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold">
            PaintMix Studio
          </h1>
          <p className="mt-2 text-slate-600">
            Your personal digital paint mixing assistant · Saved online
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 text-4xl">
                {section.icon}
              </div>

              <h2 className="text-xl font-semibold">
                {section.title}
              </h2>

              <p className="mt-2 text-slate-600">
                {section.description}
              </p>

              {section.title === "Target Color" && (
                <div className="mt-5 flex items-center gap-4">
                  <input
                    type="color"
                    value={targetColor}
                    onChange={(e) =>
                      setTargetColor(e.target.value)
                    }
                    className="h-14 w-20 cursor-pointer"
                  />

                  <span className="font-mono uppercase">
                    {targetColor}
                  </span>
                </div>
              )}
              {section.title === "Target Color" && (
  <ImageColorPicker
    targetColor={targetColor}
    onColorChange={setTargetColor}
  />
)}
{section.title === "My Paints" && (
  <PaintInventory />
)}
{section.title === "Mix Recipes" && (
  <MixCalculator
  targetColor={targetColor}
  onRecipeChange={setCurrentRecipe}
  loadedRecipe={loadedRecipe}
/>
)}

              
{section.title === "Live Scale" && (
  <div className="mt-5 rounded-xl bg-slate-100 p-4">
    <p className="text-sm text-slate-500">
      Current weight
    </p>

    <p className="mt-2 text-4xl font-bold">
     {scaleConnected && typeof scaleWeight === "number"
  ? `${(scaleWeight - tareOffset).toFixed(1)} g`
  : "--.- g"}
    </p>

    <p
      className={`mt-2 text-sm ${
        scaleConnected
          ? "text-green-600"
          : "text-amber-600"
      }`}
    >
      {scaleConnected
        ? "● Scale connected"
        : "● Scale not connected"}
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={connect} disabled={connecting || scaleConnected || supported === false} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{connecting ? "Connecting…" : "Connect Scale"}</button>
      {scaleConnected && <button type="button" onClick={disconnect} disabled={isMixing} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-50">Disconnect</button>}
    </div>
    {supported === false && <p className="mt-2 text-sm text-amber-700">To use the USB scale, open this website in desktop Chrome or Edge.</p>}
    {scaleError && <p role="alert" className="mt-2 text-sm text-red-700">{scaleError}</p>}
    <button
  onClick={() => {
    if (scaleConnected && typeof scaleWeight === "number") {
      setTareOffset(scaleWeight);
    }
  }}
  disabled={isMixing || !hasScaleReading}
  className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
>
  Tare / Zero Scale
</button>
{!isMixing && (
  <button
    onClick={() => {
      if (
        currentRecipe.length > 0 &&
        scaleConnected &&
        typeof scaleWeight === "number"
      ) {
        setMixRecipe(currentRecipe.map((paint) => ({ ...paint })));
        setPaintAmounts(currentRecipe.map(() => 0));
        setSelectedPaintIndex(null);
        setSelectionStartWeight(scaleWeight);
        setIsMixing(true);
      }
    }}
    disabled={
      currentRecipe.length === 0 ||
      !scaleConnected ||
      typeof scaleWeight !== "number"
    }
    className="mt-3 block rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
  >
    Start Mixing
  </button>
)}
{isMixing && (
  <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
    <h3 className="text-xl font-bold">Choose the paint you’re adding</h3>
    <p className="mt-2 text-sm text-slate-600">
      Select a paint before pouring. Keep the container on the scale.
      Stop pouring before switching paints. You can return to any paint.
    </p>
    {!hasScaleReading && (
      <p role="status" className="mt-3 font-semibold text-amber-700">
        Scale disconnected. Pause pouring until it reconnects.
      </p>
    )}
    <div className="mt-4 space-y-3">
      {mixRecipe.map((paint, index) => {
        const amount = displayedAmounts[index] ?? 0;
        const selected = selectedPaintIndex === index;
        const readingAvailable = !selected || hasScaleReading;
        const remaining = Math.max(0, paint.grams - amount);
        return (
          <button
            key={paint.id ?? index}
            type="button"
            aria-pressed={selected}
            onClick={() => selectPaint(index)}
            disabled={!hasScaleReading}
            className={`block w-full rounded-xl border-2 p-3 text-left disabled:opacity-60 ${
              selected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-400"
            }`}
          >
            <span
              role="img"
              aria-label={`${paint.name} color swatch`}
              className="mb-3 block h-16 w-full rounded-lg border border-black/10"
              style={{ backgroundColor: paint.color }}
            />
            <span className="flex items-center justify-between gap-2">
              <span className="font-bold">{paint.name}</span>
              <span className="text-sm font-semibold text-blue-700">
                {selected ? "Adding now" : "Select paint"}
              </span>
            </span>
            <span className="mt-3 grid grid-cols-2 gap-3">
              <span>
                <span className="block text-sm text-slate-500">Poured</span>
                <span className="mt-1 block text-xl font-semibold tabular-nums">
                  {readingAvailable ? `${amount.toFixed(1)} g` : "—"}
                </span>
              </span>
              <span>
                <span className="block text-sm text-slate-500">Remaining</span>
                <span className="mt-1 block text-xl font-semibold tabular-nums">
                  {readingAvailable ? `${remaining.toFixed(1)} g` : "—"}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
    <p className="mt-3 text-sm text-slate-500">
      {selectedPaintIndex === null
        ? "No paint selected yet. Choose one above to begin measuring."
        : `Measuring ${mixRecipe[selectedPaintIndex].name}.`}
    </p>
    <button
      type="button"
      onClick={() => {
        const incomplete = mixRecipe.some((paint, index) =>
          (displayedAmounts[index] ?? 0) < paint.grams
        );
        if (incomplete && !window.confirm("Some paints are below their target weights. Finish this mix anyway?")) return;
        setIsMixing(false);
      }}
      disabled={!hasScaleReading}
      className="mt-3 mr-2 rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
    >
      Finish Mixing
    </button>
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Cancel this mixing session and clear its tracked amounts?")) setIsMixing(false);
      }}
      className="mt-3 rounded-lg bg-slate-600 px-4 py-2 text-white"
    >
      Cancel Mixing
    </button>
  </div>
)}
  </div>
)}

            </div>
          ))}
        </div>

        <SavedRecipes targetColor={targetColor} recipe={currentRecipe} onLoad={(saved) => {
          if (isMixing) { window.alert("Finish or cancel the current mix before loading a recipe."); return; }
          setTargetColor(saved.targetColor);
          setLoadedRecipe(saved);
        }} />
        <DataTransfer />
        <MixCalibration
          targetColor={targetColor}
          recipe={currentRecipe}
        />

        <footer className="mt-10 text-center text-sm text-slate-500">
          PaintMix Studio • Version 0.1
        </footer>
      </div>
    </main>
  );
}
