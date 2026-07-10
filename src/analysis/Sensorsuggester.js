import { CoverageMap } from "./coverageMap";
import { findBestMultiPosition } from "./optimizer";

const DEFAULT_MARGINAL_THRESHOLD = 5;

function evaluateCoverage(siloType, dims, sensors) {
  const analyzer = new CoverageMap(siloType, dims);
  analyzer.applyMultiSensorCoverage(sensors);
  return analyzer.getMetrics();
}

// Overlap: kapsanan (hitCount > 0) hücreler arasında, birden fazla sensör
// tarafından görülenlerin (hitCount > 1) oranı. Yeni bir hesaplama DEĞİL -
// zaten evaluateCoverage() içinde üretilen gridData'nın üzerinden sayıyor.
function computeOverlapPercent(gridData) {
  if (!gridData || gridData.length === 0) return 0;

  const coveredCells = gridData.filter((cell) => cell.hitCount > 0);
  if (coveredCells.length === 0) return 0;

  const overlappingCells = coveredCells.filter((cell) => cell.hitCount > 1);
  return (overlappingCells.length / coveredCells.length) * 100;
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 1'den maxCount'a kadar HER sensör sayısı için mevcut findBestMultiPosition
 * ile optimum yerleşimi hesaplar; her adımda coverage, blind spot, overlap ve
 * marjinal kazancı çıkarır. Overlap dahil hepsi TEK bir evaluateCoverage()
 * çağrısından türetiliyor - tekrar hesaplama yok.
 */
export async function analyzeSensorCountRange(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, onProgress) {
  const results = [];

  for (let count = 1; count <= maxCount; count++) {
    const sensors = findBestMultiPosition(siloType, dims, sensorFov, sensorRange, candidatePoints, count, []);
    const metrics = evaluateCoverage(siloType, dims, sensors);

    const previous = results[results.length - 1];
    const marginalGain = previous ? metrics.coveragePercent - previous.coveragePercent : metrics.coveragePercent;

    const entry = {
      count,
      coveragePercent: metrics.coveragePercent,
      blindSpotPercent: metrics.blindSpotPercent,
      overlapPercent: computeOverlapPercent(metrics.gridData),
      marginalGain,
      sensors,
    };

    results.push(entry);
    if (onProgress) onProgress(entry, maxCount);

    await yieldToBrowser();
  }

  return results;
}

export function suggestOptimalCount(results, marginalThreshold = DEFAULT_MARGINAL_THRESHOLD) {
  if (!results || results.length === 0) return null;

  for (let i = 1; i < results.length; i++) {
    if (results[i].marginalGain < marginalThreshold) {
      return results[i - 1];
    }
  }
  return results[results.length - 1];
}

export async function suggestOptimalSensorCount(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, options = {}) {
  const { marginalThreshold = DEFAULT_MARGINAL_THRESHOLD, onProgress } = options;
  const results = await analyzeSensorCountRange(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, onProgress);
  const suggestion = suggestOptimalCount(results, marginalThreshold);
  return { results, suggestion };
}

/**
 * results + suggestion'dan doğal dilde bir karar açıklaması üretir.
 * Saf fonksiyon - hiçbir yeni hesaplama/state gerektirmez, sadece var olan
 * verinin (coveragePercent, overlapPercent, marginalGain) yorumlanmasıdır.
 */
export function buildDecisionExplanation(results, suggestion) {
  if (!suggestion || !results || results.length === 0) return "";

  const nextEntry = results.find((r) => r.count === suggestion.count + 1);

  let text = `${suggestion.count} sensör önerildi çünkü %${suggestion.coveragePercent.toFixed(1)} kapsama sağlıyor`;

  if (suggestion.overlapPercent > 0.5) {
    text += ` (kapsanan alanın %${suggestion.overlapPercent.toFixed(1)}'i sensörler arasında örtüşüyor)`;
  }

  if (nextEntry) {
    text += `; ${nextEntry.count}. sensör yalnızca %${nextEntry.marginalGain.toFixed(1)} ek katkı sağladığı için önerilmedi.`;
  } else {
    text += `. Denenen maksimum sensör sayısına (${results[results.length - 1].count}) ulaşıldı, daha fazlası test edilmedi.`;
  }

  return text;
}