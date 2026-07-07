import * as THREE from "three";

const BODY_COLOR = 0x8ecae6;
const CONE_COLOR = 0x6ba7c9;
const EDGE_COLOR = 0x2c3e50;

function makeMaterial(color, wireframe) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.15,
    roughness: 0.6,
    side: THREE.DoubleSide,
    transparent: !wireframe,
    opacity: wireframe ? 1 : 0.85,
    wireframe,
  });
}

function addEdges(mesh, geometry) {
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: EDGE_COLOR }));
  mesh.add(line);
  return line;
}

/**
 * Silo tipine göre bir Three.js Group üretir. Grup her zaman
 * dünya y=0'da yere oturacak şekilde konumlandırılır.
 *
 * Aşama 5 notu: Kompozit tiplerde (gövde + koni) iki alt geometri
 * birbirine değdiği yerde KAPAK EKLEMİYORUZ (openEnded: true). Aksi halde
 * orada var olmaması gereken hayali bir iç yüzey oluşur ve raycasting
 * ışınları oraya gerçekte olmayan bir "duvara" çarpıp yanlış durur.
 */

export function createSiloMesh(type, dims, options = {}) {
  const { wireframe = false } = options;
  const { height, diameter, length, coneHeight } = dims;
  const radius = diameter / 2;
  const group = new THREE.Group();

  const bodyMat = makeMaterial(BODY_COLOR, wireframe);
  const coneMat = makeMaterial(CONE_COLOR, wireframe);

  if (type === "cylinder") {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32);
    const mesh = new THREE.Mesh(geo, bodyMat);
    mesh.userData.isSiloSurface = true;
    mesh.position.y = height / 2;
    addEdges(mesh, geo);
    group.add(mesh);
  } else if (type === "horizontal") {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 32);
    const mesh = new THREE.Mesh(geo, bodyMat);
    mesh.userData.isSiloSurface = true;
    mesh.rotation.z = Math.PI / 2;
    mesh.position.y = radius;
    addEdges(mesh, geo);
    group.add(mesh);
  } else if (type === "rect") {
    const geo = new THREE.BoxGeometry(diameter, height, length);
    const mesh = new THREE.Mesh(geo, bodyMat);
    mesh.userData.isSiloSurface = true;
    mesh.position.y = height / 2;
    addEdges(mesh, geo);
    group.add(mesh);
  } else if (type === "cone_roof" || type === "cone_top_flat_bottom") {
    // Gövde: üst VE alt kapaksız (openEnded) - taban ayrı bir daire ile kapatılıyor,
    // üst kısım çatı konisinin kendi tabanına bırakılıyor (orada tek, gerçek bir yüzey olsun diye).
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.userData.isSiloSurface = true;
    bodyMesh.position.y = height / 2;
    addEdges(bodyMesh, bodyGeo);
    group.add(bodyMesh);

    // cone_roof ve cone_top_flat_bottom içindeki zemin oluşturma kısmı:
const floorGeo = new THREE.CircleGeometry(radius, 32);
const floorMesh = new THREE.Mesh(floorGeo, bodyMat);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0;
floorMesh.userData.isSiloSurface = true; // ÇÖZÜM: Bu satırı ekliyoruz!
group.add(floorMesh);

    // Çatı konisi: tabanı KAPALI (varsayılan) - gövde ile birleştiği tek gerçek yüzey burası
    // Çatı konisi: tabanı AÇIK hale getirildi (ışınların aşağı geçmesi için)
    const roofGeo = new THREE.ConeGeometry(radius, coneHeight, 32, 1, true);
    const roofMesh = new THREE.Mesh(roofGeo, coneMat);
    roofMesh.userData.isSiloSurface = true;
    roofMesh.position.y = height + coneHeight / 2;
    addEdges(roofMesh, roofGeo);
    group.add(roofMesh);
  } else if (type === "cone_bottom") {
    // Huni: geniş ucu (gövdeyle birleştiği yer) kapaksız, apex zaten doğal olarak kapalı (tek nokta)
    const hopperGeo = new THREE.ConeGeometry(radius, coneHeight, 32, 1, true);
    const hopperMesh = new THREE.Mesh(hopperGeo, coneMat);
    hopperMesh.userData.isSiloSurface = true;
    hopperMesh.rotation.x = Math.PI;
    hopperMesh.position.y = coneHeight / 2;
    addEdges(hopperMesh, hopperGeo);
    group.add(hopperMesh);

    // Gövde: hem alt (huniyle birleşiyor) hem üst (tasarım gereği açık) kapaksız
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.userData.isSiloSurface = true;
    bodyMesh.position.y = coneHeight + height / 2;
    addEdges(bodyMesh, bodyGeo);
    group.add(bodyMesh);

    // cone_bottom bloğunun içine (return group; satırından hemen önceye) eklenecek:
const plugGeo = new THREE.CircleGeometry(0.05, 8); // 5 cm'lik minik bir tapa
const plugMesh = new THREE.Mesh(plugGeo, bodyMat);
plugMesh.rotation.x = -Math.PI / 2;
plugMesh.position.y = 0;
plugMesh.userData.isSiloSurface = true;
group.add(plugMesh);
  }

  return group;
}

/**
 * Silo hacmini m³ cinsinden hesaplar.
 */
export function computeSiloVolume(type, dims) {
  const { height, diameter, length, coneHeight } = dims;
  const r = diameter / 2;

  switch (type) {
    case "cylinder":
      return Math.PI * r * r * height;
    case "horizontal":
      return Math.PI * r * r * length;
    case "rect":
      return diameter * height * length;
    case "cone_roof":
    case "cone_top_flat_bottom":
    case "cone_bottom": {
      const bodyVol = Math.PI * r * r * height;
      const coneVol = (1 / 3) * Math.PI * r * r * coneHeight;
      return bodyVol + coneVol;
    }
    default:
      return 0;
  }
}