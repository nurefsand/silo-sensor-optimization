import { CoverageMap } from "./coverageMap";
import { findBestMultiPosition, computeSetScore } from "./optimizer";

const DEFAULT_SCORE_TOLERANCE = 0.01;

function evaluateCoverage(siloType, dims, sensors) {
  const analyzer = new CoverageMap(siloType, dims);
  analyzer.applyMultiSensorCoverage(sensors);
  return analyzer.getMetrics();
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 1'den maxCount'a kadar HER sensör sayısı için mevcut findBestMultiPosition
 * ile optimum yerleşimi hesaplar; her adımda coverage, blind spot, overlap,
 * distribution ve totalScore'u çıkarır. overlapPercent artık tek kaynaktan
 * (CoverageMap.getMetrics, kapsanan-alan-bazlı) geliyor - ayrı bir hesaplama
 * yok. totalScore da optimizer.js'teki computeSetScore() ile aynı formülü
 * (tek kaynak) kullanıyor.
 */
export async function analyzeSensorCountRange(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, onProgress) {
  const results = [];

  for (let count = 1; count <= maxCount; count++) {
    const sensors = findBestMultiPosition(siloType, dims, sensorFov, sensorRange, candidatePoints, count, []);
    const metrics = evaluateCoverage(siloType, dims, sensors);
    const totalScore = computeSetScore(siloType, dims, sensors);

    const entry = {
      count,
      coveragePercent: metrics.coveragePercent,
      blindSpotPercent: metrics.blindSpotPercent,
      overlapPercent: metrics.overlapPercent,
      distributionScore: metrics.distributionScore,
      totalScore,
      sensors,
    };

    results.push(entry);
    if (onProgress) onProgress(entry, maxCount);

    await yieldToBrowser();
  }

  return results;
}

/**
 * Strateji C: TotalScore'un global maksimumunu bulur, sonra en DÜŞÜK count'tan
 * başlayarak bu maksimuma "scoreTolerance" içinde kalan İLK sonucu döndürür.
 */
export function suggestOptimalCount(results, scoreTolerance = DEFAULT_SCORE_TOLERANCE) {
  if (!results || results.length === 0) return null;

  const maxTotalScore = results.reduce(
    (max, r) => (r.totalScore > max ? r.totalScore : max),
    -Infinity
  );
  const acceptableScore = maxTotalScore - scoreTolerance;

  for (const r of results) {
    if (r.totalScore >= acceptableScore) {
      return r;
    }
  }

  // Teorik güvenli fallback (normalde buraya hiç düşülmez, çünkü global
  // maksimumu üreten sonuç her zaman acceptableScore koşulunu sağlar).
  return results[results.length - 1];
}

export async function suggestOptimalSensorCount(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, options = {}) {
  const { scoreTolerance = DEFAULT_SCORE_TOLERANCE, onProgress } = options;
  const results = await analyzeSensorCountRange(siloType, dims, sensorFov, sensorRange, candidatePoints, maxCount, onProgress);
  const suggestion = suggestOptimalCount(results, scoreTolerance);
  return { results, suggestion };
}

/**
 * results + suggestion'dan doğal dilde bir karar açıklaması üretir.
 * Saf fonksiyon - hiçbir yeni hesaplama/state gerektirmez. Global maksimum
 * TotalScore ve tolerans üzerinden anlatım kuruyor - karar mekanizması
 * (suggestOptimalCount) da aynı mantığı kullanıyor.
 */
export function buildDecisionExplanation(results, suggestion, scoreTolerance = DEFAULT_SCORE_TOLERANCE) {
  if (!suggestion || !results || results.length === 0) return "";

  const maxTotalScore = results.reduce(
    (max, r) => (r.totalScore > max ? r.totalScore : max),
    -Infinity
  );
  const bestEntry = results.find((r) => r.totalScore === maxTotalScore);

  let text = `${suggestion.count} sensör önerildi; bu yerleşim ${suggestion.totalScore.toFixed(4)} TotalScore ile`;

  if (bestEntry && bestEntry.count === suggestion.count) {
    text += ` en yüksek skoru sağlıyor`;
  } else {
    text += ` en yüksek skora (${maxTotalScore.toFixed(4)}, ${bestEntry.count} sensörle) ${scoreTolerance.toFixed(2)} tolerans içinde ulaşıyor`;
  }

  text += `; %${suggestion.coveragePercent.toFixed(1)} kapsama sağlıyor`;

  if (suggestion.overlapPercent > 0.5) {
    text += ` (kapsanan alanın %${suggestion.overlapPercent.toFixed(1)}'i sensörler arasında örtüşüyor)`;
  }

  const cheaperExists = results.some((r) => r.count < suggestion.count);
  if (cheaperExists) {
    text += `. Daha az sensörle bu skora ${scoreTolerance.toFixed(2)} tolerans içinde ulaşılamıyor.`;
  } else {
    text += `.`;
  }

  return text;
}