import * as THREE from "three";

export function generateCandidates(siloType, dims, box) {
  const candidates = [];
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // YATAY SİLİNDİR (Kesin Eksen Tespiti)
  if (siloType === "horizontal") {
    //Bounding box'ın hangi kenarı kullanıcının girdiği "uzunluk" değerine eşit?
    const isXLength = Math.abs(size.x - dims.length) < Math.abs(size.z - dims.length);
    const L = dims.length;
    const R = dims.diameter / 2;

    const lengthSteps = 12; // Uzunluk boyunca nokta sayısı
    const angleSteps = 6;   // Kavis boyunca nokta sayısı

    for (let i = 0; i <= lengthSteps; i++) {
      const lPos = -L / 2 + (L * i / lengthSteps);
      for (let j = 0; j <= angleSteps; j++) {
        // Sadece üst yarım küre (-45° ile +45° arası)
        const angle = -Math.PI / 4 + (Math.PI / 2 * j / angleSteps);
        const heightOffset = R * Math.cos(angle);
        const widthOffset = R * Math.sin(angle);

        // Silindirin merkez Y koordinatına göre kavisli yüksekliği ayarla
        const y = center.y + heightOffset;

        if (isXLength) {
          candidates.push(new THREE.Vector3(center.x + lPos, y, center.z + widthOffset));
        } else {
          candidates.push(new THREE.Vector3(center.x + widthOffset, y, center.z + lPos));
        }
      }
    }
    return candidates;
  }

  // DİKDÖRTGEN SİLOLAR
  if (siloType === "rect") {
    const isXLength = Math.abs(size.x - dims.length) < Math.abs(size.z - dims.length);
    const L = dims.length;
    const W = dims.width;
    
    const lSteps = 10;
    const wSteps = 4;
    for (let i = 0; i <= lSteps; i++) {
      const lPos = -L / 2 + (L * i / lSteps);
      for (let j = 0; j <= wSteps; j++) {
        const wPos = -W / 2 + (W * j / wSteps);
        if (isXLength) {
          candidates.push(new THREE.Vector3(center.x + lPos, box.max.y, center.z + wPos));
        } else {
          candidates.push(new THREE.Vector3(center.x + wPos, box.max.y, center.z + lPos));
        }
      }
    }
    return candidates;
  }

  // DİKEY SİLOLAR (Silindir, Koni Çatı vb. - Kutupsal Tarama)
  const R = dims.diameter / 2;
  const rings = 5;
  const segments = 12;

  for (let r = 0; r <= rings; r++) {
    const currentRadius = (R * r) / rings;
    let yPos = box.max.y;

    if (siloType === "cone_roof") {
      const coneH = dims.coneHeight || 2.5;
      yPos = box.max.y - (currentRadius / R) * coneH;
    }

    const currentSegments = r === 0 ? 1 : segments;
    for (let s = 0; s < currentSegments; s++) {
      const angle = (s * Math.PI * 2) / currentSegments;
      const x = center.x + currentRadius * Math.cos(angle);
      const z = center.z + currentRadius * Math.sin(angle);
      candidates.push(new THREE.Vector3(x, yPos, z));
    }
  }

  return candidates;
}