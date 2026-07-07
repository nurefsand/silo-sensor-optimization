import * as THREE from "three";

export function getFlatRoofZone(box, ringCount = 3, angularSteps = 8) {
  const points = [];
  const size = box.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z) / 2;
  const topY = box.max.y; // Silonun uzaydaki fiziksel en tepe noktası

  points.push(new THREE.Vector3(0, topY, 0));

  const rStep = R / ringCount;
  const aStep = (Math.PI * 2) / angularSteps;

  for (let r = rStep; r <= R; r += rStep) {
    for (let a = 0; a < Math.PI * 2; a += aStep) {
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      points.push(new THREE.Vector3(x, topY, z));
    }
  }
  return points;
}

export function getConeRoofZone(box, coneHeight = 2, ringCount = 4, angularSteps = 8) {
  const points = [];
  const size = box.getSize(new THREE.Vector3());
  const R = Math.max(size.x, size.z) / 2;
  const topY = box.max.y; 

  points.push(new THREE.Vector3(0, topY, 0));

  const rStep = R / ringCount;
  const aStep = (Math.PI * 2) / angularSteps;

  for (let r = rStep; r <= R; r += rStep) {
    const currentY = topY - coneHeight * (r / R);
    for (let a = 0; a < Math.PI * 2; a += aStep) {
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      points.push(new THREE.Vector3(x, currentY, z));
    }
  }
  return points;
}

export function getHorizontalZone(box, lengthSteps = 5, angularSteps = 5) {
  const points = [];
  const size = box.getSize(new THREE.Vector3());
  
  // Modelin hangi eksende (X mi Z mi) uzandığını otomatik tespit et (Ters yaylanma çözüm noktası)
  const isXAxis = size.x > size.z;
  
  const length = isXAxis ? size.x : size.z;
  const R = (isXAxis ? size.z : size.x) / 2;
  
  const topY = box.max.y;
  const centerY = topY - R; // Silindirin merkez ekseni

  const startAngle = -Math.PI / 4; 
  const endAngle = Math.PI / 4;
  const aStep = (endAngle - startAngle) / (angularSteps - 1);
  const lStep = length / lengthSteps;
  const startL = -length / 2;

  for (let l = startL; l <= length / 2; l += lStep) {
    for (let a = startAngle; a <= endAngle; a += aStep) {
      const arcW = R * Math.sin(a);
      const arcH = R * Math.cos(a);
      const y = centerY + arcH;

      // Eksene göre X ve Z'yi otomatik yerleştir
      const x = isXAxis ? l : arcW;
      const z = isXAxis ? arcW : l;
      
      points.push(new THREE.Vector3(x, y, z));
    }
  }
  return points;
}