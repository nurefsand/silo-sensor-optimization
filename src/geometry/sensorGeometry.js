import * as THREE from "three";

const SENSOR_COLOR = 0x2b2b2f;

/**
 * Sensörün silo üzerindeki montaj noktasını geometriye göre dinamik hesaplar.
 */
export function getSensorMountPosition(type, dims) {
  const radius = dims.diameter / 2;
  const height = dims.height;
  const coneHeight = dims.coneHeight || 0;

  switch (type) {
    case "cylinder":
    case "rect":
      return new THREE.Vector3(0, height, 0);

    case "cone_bottom":
      // Gövde bitişi (koninin başladığı yer)
      return new THREE.Vector3(0, height, 0);

    case "horizontal":
      // Yatay silindirin en üst noktası (merkez Y + yarıçap)
      // Dims.height burada merkez yüksekliği ise, + radius tepeyi verir.
      return new THREE.Vector3(0, radius + radius, 0);

    case "cone_roof":
    case "cone_top_flat_bottom":
      // Gövde yüksekliği + koni çatının tepesi
      return new THREE.Vector3(0, height + coneHeight, 0);

    default:
      return new THREE.Vector3(0, height, 0);
  }
}

/**
 * Sensör mesh'ini oluşturur ve montaj noktasına oturtur.
 */
export function createSensorMesh(type, dims) {
  const mountPos = getSensorMountPosition(type, dims);
  
  // Ölçeklendirme: Silo boyutuna göre orantılı bir sensör
  const scaleRef = Math.min(dims.diameter, dims.height);
  const radius = Math.max(0.15, scaleRef * 0.04);
  const sensorHeight = radius * 1.5;

  const geo = new THREE.CylinderGeometry(radius, radius, sensorHeight, 16);
  const mat = new THREE.MeshStandardMaterial({ 
    color: SENSOR_COLOR,
    metalness: 0.5,
    roughness: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  
  // Sensörün alt yüzeyini tam montaj noktasına oturt
  // mesh.position.y = mountPos.y + (sensorHeight / 2)
  mesh.position.set(mountPos.x, mountPos.y + (sensorHeight / 2), mountPos.z);
  mesh.name = "sensor";

  return mesh;
}