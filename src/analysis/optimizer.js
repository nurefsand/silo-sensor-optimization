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

export function findBestPosition(siloType, dims, sensorFov, sensorRange, candidatePoints) {
  if (!candidatePoints || candidatePoints.length === 0) return null;

  let bestPoint = null;
  let maxTotalScore = -1;

  candidatePoints.forEach((point) => {
    const analyzer = new CoverageMap(siloType, dims);
    
    // ÇÖKME BURADAYDI: Eski applySensorCoverage yerine yeni array formatını kullanıyoruz.
    // Optimizer şimdilik tek bir aday noktayı test ettiği için onu 1 elemanlı dizi olarak yolluyoruz.
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