import * as THREE from "three";

export function generateRays(fovDegrees, rings = 8, azimuthSamples = 24) {
  const halfAngleRad = ((fovDegrees / 2) * Math.PI) / 180;
  const baseDir = new THREE.Vector3(0, -1, 0); 
  const arbitrary = new THREE.Vector3(0, 0, 1);
  const tangent = new THREE.Vector3().crossVectors(arbitrary, baseDir).normalize();
  const bitangent = new THREE.Vector3().crossVectors(baseDir, tangent).normalize();

  const directions = [baseDir.clone()];

  for (let r = 1; r <= rings; r++) {
    const theta = (r / rings) * halfAngleRad;
    for (let a = 0; a < azimuthSamples; a++) {
      const phi = (a / azimuthSamples) * Math.PI * 2;
      const dir = new THREE.Vector3()
        .addScaledVector(baseDir, Math.cos(theta))
        .addScaledVector(tangent, Math.sin(theta) * Math.cos(phi))
        .addScaledVector(bitangent, Math.sin(theta) * Math.sin(phi))
        .normalize();
      directions.push(dir);
    }
  }
  return directions;
}

export function executeRaycasting(sensorPosition, fovDegrees, range, targetMeshes) {
  const directions = generateRays(fovDegrees);
  const raycaster = new THREE.Raycaster();
  
  // ÖNEMLİ: Işını, sensörün dikey yüksekliğinden 0.5 metre daha uzun tutuyoruz.
  // Bu sayede ışın asla yerin altına girip gereksiz hesaplama yapmaz.
  raycaster.far = Math.min(range, sensorPosition.y + 0.5);

  const hitResults = [];

  directions.forEach((direction) => {
    raycaster.set(sensorPosition, direction);
    const hits = raycaster.intersectObjects(targetMeshes, false);
    
    const validHits = hits.filter(hit => hit.distance > 0.01);

    if (validHits.length > 0) {
      const firstHit = validHits[0];
      // Y'yi asla 0'ın altına indirme
      if (firstHit.point.y < 0) firstHit.point.y = 0;

      hitResults.push({
        origin: sensorPosition.clone(),
        direction: direction.clone(),
        endPoint: firstHit.point.clone(),
        distance: firstHit.distance,
        isHit: true
      });
    } else {
      // Çarpışma yoksa, raycaster.far sınırında durdur
      hitResults.push({
        origin: sensorPosition.clone(),
        direction: direction.clone(),
        endPoint: sensorPosition.clone().addScaledVector(direction, raycaster.far),
        distance: raycaster.far,
        isHit: false
      });
    }
  });

  return hitResults;
}