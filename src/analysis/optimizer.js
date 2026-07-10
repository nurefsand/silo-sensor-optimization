import { CoverageMap } from "./coverageMap";
import { OPTIMIZER_WEIGHTS } from "../config/constants";

function calculateDistanceMetrics(point, siloType, dims) {
  const R = (siloType === "horizontal" ? dims.length : dims.diameter) / 2;
  const d = Math.sqrt(point.x * point.x + point.z * point.z);
  const distanceToWall = Math.max(0, R - d);

  const safeDistance = R * 0.3;
  let wallScore = distanceToWall >= safeDistance ? 1 : Math.pow(distanceToWall / safeDistance, 2);
  let edgeScore = Math.max(0, 1 - Math.pow(d / R, 2));
  let symmetryScore = Math.max(0, 1 - (d / R));

  return { wallScore, edgeScore, symmetryScore };
}

// TEK SENSÖR İÇİN (değişmedi)
export function findBestPosition(siloType, dims, sensorFov, sensorRange, candidatePoints) {
  if (!candidatePoints || candidatePoints.length === 0) return null;

  let bestPoint = null;
  let maxTotalScore = -1;

  const analyzer = new CoverageMap(siloType, dims);

  candidatePoints.forEach((point) => {
    analyzer.reset();
    analyzer.applyMultiSensorCoverage([{ pos: point, fov: sensorFov }]);

    const metrics = analyzer.getMetrics();
    const coverageScore = metrics.coveragePercent / 100;

    const { wallScore, edgeScore, symmetryScore } = calculateDistanceMetrics(point, siloType, dims);

    const totalScore =
      (coverageScore * OPTIMIZER_WEIGHTS.coverage) +
      (wallScore * OPTIMIZER_WEIGHTS.wallDistance) +
      (edgeScore * OPTIMIZER_WEIGHTS.edgeDistance) +
      (symmetryScore * OPTIMIZER_WEIGHTS.symmetry);

    if (totalScore > maxTotalScore) {
      maxTotalScore = totalScore;
      bestPoint = {
        ...point,
        coverage: metrics.coveragePercent,
        blindSpot: metrics.blindSpotPercent,
        gridData: metrics.gridData,
        scoreDetails: {
          total: (totalScore * 100).toFixed(1),
          coverageScore: (coverageScore * 100).toFixed(1),
          wallScore: (wallScore * 100).toFixed(1),
          edgeScore: (edgeScore * 100).toFixed(1),
          symmetryScore: (symmetryScore * 100).toFixed(1),
          mountHeight: point.y
        }
      };
    }
  });

  return bestPoint;
}

function computeCoverage(siloType, dims, sensors) {
  const analyzer = new CoverageMap(siloType, dims);
  analyzer.applyMultiSensorCoverage(sensors);
  return analyzer.getMetrics().coveragePercent;
}

function isTooCloseToOthers(point, others, minDist = 1.0) {
  return others.some((s) => {
    const dist = Math.sqrt(Math.pow(s.pos.x - point.x, 2) + Math.pow(s.pos.z - point.z, 2));
    return dist < minDist;
  });
}

// ÇOKLU SENSÖR İÇİN
// Sprint notu: Bu fonksiyon iki aşamalı çalışır:
//  1) EKLEME: initialPositions, count'tan azsa, eksik sensörleri greedy şekilde ekler
//     (eskiden de vardı, korundu).
//  2) İYİLEŞTİRME (YENİ): initialPositions zaten count kadarsa (senin kullanım şeklin bu),
//     her sensörü sırayla çıkarıp daha iyi bir aday varsa DEĞİŞTİRİR - ama sadece skor
//     GERÇEKTEN artıyorsa. Bu yüzden sonuç, başlangıç diziliminden ASLA daha kötü olamaz.
export function findBestMultiPosition(siloType, dims, sensorFov, sensorRange, candidatePoints, count, initialPositions = []) {
  let placedSensors = initialPositions.map((pos) => ({ pos, fov: sensorFov }));

  // --- Aşama 1: eksik sensörleri greedy ekle (initialPositions count'tan azsa) ---
  while (placedSensors.length < count) {
    let bestCandidate = null;
    let maxCoverageGain = -1;

    candidatePoints.forEach((point) => {
      if (isTooCloseToOthers(point, placedSensors)) return;

      const testSensors = [...placedSensors, { pos: point, fov: sensorFov }];
      const coverage = computeCoverage(siloType, dims, testSensors);

      if (coverage > maxCoverageGain) {
        maxCoverageGain = coverage;
        bestCandidate = point;
      }
    });

    if (bestCandidate) {
      placedSensors.push({ pos: bestCandidate, fov: sensorFov });
    } else {
      break;
    }
  }

  // --- Aşama 2: mevcut dizilimi iyileştir (coordinate descent / local search) ---
  // Her sensörü tek tek çıkarıp yerine daha iyi bir aday var mı diye bakıyoruz.
  // "Daha iyi" = MEVCUT toplam kapsamadan kesinlikle yüksek olan skor.
  // Böyle bir aday yoksa sensör olduğu yerde kalır - yani hiçbir zaman geriye gidiş olmaz.
  const MAX_PASSES = 5;
  let improvedInLastPass = true;
  let passCount = 0;

  while (improvedInLastPass && passCount < MAX_PASSES) {
    improvedInLastPass = false;
    passCount++;

    for (let i = 0; i < placedSensors.length; i++) {
      const others = placedSensors.filter((_, idx) => idx !== i);
      const currentScore = computeCoverage(siloType, dims, placedSensors);

      let bestReplacement = null;
      let bestReplacementScore = currentScore; // sadece BUNDAN kesinlikle iyisini kabul et

      candidatePoints.forEach((point) => {
        if (isTooCloseToOthers(point, others)) return;

        const testSensors = [...others, { pos: point, fov: sensorFov }];
        const score = computeCoverage(siloType, dims, testSensors);

        if (score > bestReplacementScore) {
          bestReplacementScore = score;
          bestReplacement = point;
        }
      });

      if (bestReplacement) {
        placedSensors[i] = { pos: bestReplacement, fov: sensorFov };
        improvedInLastPass = true;
      }
    }
  }

  return placedSensors;
}