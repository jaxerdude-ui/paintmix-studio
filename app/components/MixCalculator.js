
"use client";

import { useEffect, useState } from "react";


function hexToRgb(hex) {
  const clean = hex.replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;

  return [0, 2, 4].map((index) =>
    parseInt(clean.slice(index, index + 2), 16)
  );
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((value) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function predictMixColor(recipe) {
  if (!recipe.length) return null;

  const totalGrams = recipe.reduce(
    (sum, paint) => sum + paint.grams,
    0
  );

  if (totalGrams <= 0) return null;

  const mixedRgb = [0, 1, 2].map((channel) =>
    recipe.reduce((sum, paint) => {
      const rgb = hexToRgb(paint.color);
      return sum + rgb[channel] * paint.grams;
    }, 0) / totalGrams
  );

  return rgbToHex(mixedRgb);
}
function predictCalibratedMixColor(recipe, calibrationTests) {
  const predictedHex = predictMixColor(recipe);
  if (!predictedHex) return null;

  const predictedRgb = hexToRgb(predictedHex);

 const correction = getWeightedCalibrationError(recipe, calibrationTests);

 const correctedRgb = predictedRgb.map((value, channel) => {
  return Math.max(0, Math.min(255, value + correction[channel]));
});

  return rgbToHex(correctedRgb);
}

function colorDistance(a, b) {
  return Math.sqrt(
    a.reduce(
      (sum, value, index) =>
        sum + (value - b[index]) ** 2,
      0
    )
  );

}
function estimateMix(paints, target, totalGrams, calibrationTests = []) {
  const targetRgb = hexToRgb(target);
  if (!targetRgb) return [];
const calibrationErrors = calibrationTests
  .map(getCalibrationError)
  .filter((error) => error !== null);
  console.log("Valid calibration errors:", calibrationErrors);
  const available = paints
    .filter((paint) => paint.available)
    .map((paint) => ({
      ...paint,
      rgb: hexToRgb(paint.color),
    }))
    .filter((paint) => paint.rgb);

  if (available.length === 0) return [];

  // Experimental digital RGB mixing model.
  // Real acrylic pigments do not mix this way.
  const averageCalibrationError = [0, 0, 0];

const correctedTargetRgb = targetRgb.map((value, channel) =>
  Math.max(
    0,
    Math.min(255, value - averageCalibrationError[channel])
  )
);
  const channels = [0, 1, 2];
  const weights = available.map(() => 0);
  const predicted = [0, 0, 0];

  // Start with the closest individual paint.
  let bestIndex = 0;
  let bestDistance = Infinity;

  available.forEach((paint, index) => {
    const distance = colorDistance(
      paint.rgb,
      correctedTargetRgb
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  weights[bestIndex] = 1;

  channels.forEach((channel) => {
    predicted[channel] = available[bestIndex].rgb[channel];
  });

  // Gradually improve the mixture by adding small
  // amounts of whichever paint improves the match.
  const step = 0.01;

  for (let iteration = 0; iteration < 1000; iteration++) {
    let winningPaint = -1;
    let winningDistance = bestDistance;

    available.forEach((paint, index) => {
      const candidate = channels.map(
        (channel) =>
          predicted[channel] * (1 - step) +
          paint.rgb[channel] * step
      );

      const distance = colorDistance(
        candidate,
correctedTargetRgb      );

      if (distance < winningDistance - 0.000001) {
        winningDistance = distance;
        winningPaint = index;
      }
    });

    if (winningPaint === -1) break;

    weights.forEach((weight, index) => {
      weights[index] =
        weight * (1 - step) +
        (index === winningPaint ? step : 0);
    });

    channels.forEach((channel) => {
      predicted[channel] =
        predicted[channel] * (1 - step) +
        available[winningPaint].rgb[channel] * step;
    });

    bestDistance = winningDistance;
  }

    return available
    .map((paint, index) => ({
      id: paint.id,
      name: paint.name,
      brand: paint.brand,
      color: paint.color,
      grams: weights[index] * totalGrams,
    }))
    .filter((paint) => paint.grams > 0.0001)
    .sort((a, b) => b.grams - a.grams);
}
function getRecipeSimilarity(recipeA, recipeB) {
  if (!Array.isArray(recipeA) || !Array.isArray(recipeB)) return 0;

  const totalA = recipeA.reduce((sum, paint) => sum + paint.grams, 0);
  const totalB = recipeB.reduce((sum, paint) => sum + paint.grams, 0);

  if (totalA <= 0 || totalB <= 0) return 0;

  const weightsA = new Map(
    recipeA.map((paint) => [paint.id, paint.grams / totalA])
  );

  const weightsB = new Map(
    recipeB.map((paint) => [paint.id, paint.grams / totalB])
  );

  let similarity = 0;

  for (const [id, weightA] of weightsA) {
    const weightB = weightsB.get(id) || 0;
    similarity += Math.min(weightA, weightB);
  }

  return similarity;
}
function getCalibrationError(test) {
  if (!test?.physicallyTested || !Array.isArray(test.recipe)) {
    return null;
  }

  const predicted = hexToRgb(predictMixColor(test.recipe));
  const actual = hexToRgb(test.actualColor);

  if (!predicted || !actual) {
    return null;
  }

  return actual.map((channel, index) => channel - predicted[index]);
}
function getWeightedCalibrationError(recipe, calibrationTests) {
  const weightedErrors = [0, 0, 0];
  let totalWeight = 0;

  for (const test of calibrationTests) {
    const error = getCalibrationError(test);
    if (!error) continue;

    const similarity = getRecipeSimilarity(recipe, test.recipe);
    if (similarity < 0.1) continue;

    const weight = similarity * similarity;

    for (let channel = 0; channel < 3; channel++) {
      weightedErrors[channel] += error[channel] * weight;
    }

    totalWeight += weight;
  }

  if (totalWeight === 0) return [0, 0, 0];

 return weightedErrors.map((value) => value / Math.max(1, totalWeight));
}
export default function MixCalculator({ targetColor, onRecipeChange, loadedRecipe }) {
  const [paints, setPaints] = useState([]);
  const [calibrationTests, setCalibrationTests] = useState([]);
  useEffect(() => {
  let active = true;
  const loadCalibrationTests = async () => {
    try {
      const response = await fetch("/api/mixing-tests", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load project mixing tests.");
      const saved = await response.json();
      const actualTests = Array.isArray(saved)
        ? saved.filter(test => test.physicallyTested === true && Array.isArray(test.recipe) && test.recipe.length > 0)
        : [];
      if (active) setCalibrationTests(actualTests);
    } catch (error) {
      console.error("Could not load calibration tests:", error);
    }
  };

  loadCalibrationTests();

  window.addEventListener(
    "paintmix-calibration-updated",
    loadCalibrationTests
  );

  return () => {
    active = false;
    window.removeEventListener(
      "paintmix-calibration-updated",
      loadCalibrationTests
    );
  };
}, []);
  const [batchSize, setBatchSize] = useState("50");
  const [recipe, setRecipe] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (loadedRecipe) {
      setRecipe(loadedRecipe.recipe.map(paint => ({...paint})));
      setBatchSize(String(loadedRecipe.recipe.reduce((sum,paint) => sum + paint.grams,0)));
    }
  }, [loadedRecipe]);
  useEffect(() => {
  if (onRecipeChange) {
    onRecipeChange(recipe);
  }
}, [recipe, onRecipeChange]);
  function adjustPaint(index, newPercentage) {
  if (recipe.length < 2) return;

  const totalGrams = Number(batchSize);
  if (!Number.isFinite(totalGrams) || totalGrams <= 0) return;

  const percentage = Math.max(
    0,
    Math.min(100, Number(newPercentage))
  );

  const updated = recipe.map((paint) => ({ ...paint }));

  const otherTotal = updated.reduce(
    (sum, paint, i) => (i === index ? sum : sum + paint.grams),
    0
  );

  const remainingGrams = totalGrams * (1 - percentage / 100);

  updated.forEach((paint, i) => {
    if (i === index) {
      paint.grams = totalGrams * percentage / 100;
    } else if (otherTotal > 0) {
      paint.grams = paint.grams / otherTotal * remainingGrams;
    } else {
      paint.grams = remainingGrams / (updated.length - 1);
    }
  });

  setRecipe(updated);
}

  useEffect(() => {
    async function loadPaints() {
      try {
        const response = await fetch("/api/inventory", {cache:"no-store"});
        if (!response.ok) throw new Error("Could not load your online paint inventory.");
        const saved = await response.json();
        setPaints(Array.isArray(saved) ? saved : []);
      } catch {
        setPaints([]);
      }
    }

    loadPaints();

    window.addEventListener("storage", loadPaints);
    window.addEventListener(
      "paintmix-inventory-updated",
      loadPaints
    );

    return () => {
      window.removeEventListener("storage", loadPaints);
      window.removeEventListener(
        "paintmix-inventory-updated",
        loadPaints
      );
    };
  }, []);

  function calculateRecipe() {
    const grams = Number(batchSize);
    const availableCount = paints.filter(
      (paint) => paint.available
    ).length;

    if (!Number.isFinite(grams) || grams <= 0) {
      setMessage("Enter a valid batch size.");
      setRecipe([]);
      return;
    }

    if (availableCount < 1) {
  setMessage(
    "Add at least one available paint before calculating."
  );
  setRecipe([]);
  return;
}

   const result = estimateMix(
  paints,
  targetColor,
  grams,
  calibrationTests
);

    setRecipe(result);
    setMessage(
      "Experimental suggestion only. Test a small batch before relying on this recipe."
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg border border-slate-300"
          style={{ backgroundColor: targetColor }}
        />
        <div>
          <p className="text-xs text-slate-500">
            Target color
          </p>
          <p className="font-mono font-semibold">
            {targetColor.toUpperCase()}
          </p>
        </div>
      </div>

    


      <p className="text-sm text-slate-500">
        Available paints:{" "}
        {paints.filter((paint) => paint.available).length}
      </p>

<div className="space-y-2">
  <label
    htmlFor="batch-size"
    className="block text-sm font-medium text-slate-700"
  >
    Total Paint Amount (grams)
  </label>

  <input
    id="batch-size"
    type="number"
    min="0.1"
    step="0.1"
    value={batchSize}
    onChange={(e) => setBatchSize(e.target.value)}
    className="w-full rounded-lg border border-slate-300 p-3"
  />
</div>
      <button
        type="button"
        onClick={calculateRecipe}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
      >
        Generate Test Recipe
      </button>

      {message && (
        <p className="text-sm text-amber-700">
          {message}
        </p>
      )}

      {recipe.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="font-semibold">
            <div className="grid grid-cols-2 gap-3">
  <div>
    <div
      className="h-28 rounded-xl border border-slate-300"
      style={{ backgroundColor: targetColor }}
    />
    <p className="mt-2 text-center text-sm font-semibold">
      Target Color
    </p>
    <p className="text-center font-mono text-xs text-slate-500">
      {targetColor.toUpperCase()}
    </p>
  </div>

  <div>
    <div
      className="h-28 rounded-xl border border-slate-300"
      style={{ backgroundColor: predictCalibratedMixColor(recipe, calibrationTests) }}
    />
    <p className="mt-2 text-center text-sm font-semibold">
      Predicted Mix
    </p>
    <p className="text-center font-mono text-xs text-slate-500">
    {predictCalibratedMixColor(recipe, calibrationTests)?.toUpperCase()}
    </p>
  </div>
</div>
            Suggested Mixing Quantities
          </h3>

          {recipe.map((paint, index) => (
            <div
              key={paint.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-md border"
                  style={{ backgroundColor: paint.color }}
                />
                <div>
                  <p className="text-sm font-medium">
                    {paint.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {paint.brand}
                  </p>
                </div>
              </div>

              
<div className="w-44 space-y-2">
  <div className="text-right">
    <span className="font-semibold">
      {paint.grams.toFixed(2)} g
    </span>
    <p className="text-xs text-slate-500">
      {(
        (paint.grams /
          recipe.reduce(
            (sum, item) => sum + item.grams,
            0
          )) *
        100
      ).toFixed(1)}
      %
    </p>
  </div>

  <input
    type="range"
    min="0"
    max="100"
    step="1"
    value={
      (paint.grams /
        recipe.reduce(
          (sum, item) => sum + item.grams,
          0
        )) *
      100
    }
    onChange={(e) =>
      adjustPaint(index, e.target.value)
    }
        className="w-full cursor-pointer accent-blue-600"
  />
</div>
</div>
))}
</div>
)}
</div>
);
}