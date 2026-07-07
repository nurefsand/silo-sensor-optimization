import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSiloMesh } from "../geometry/createSiloGeometry";
import { createSensorMesh } from "../geometry/sensorGeometry";
import { CoverageMap } from "../analysis/coverageMap";
import { generateCandidates } from "../analysis/candidateGenerator";
import { findBestPosition } from "../analysis/optimizer";

// 3D Bilgi Etiketi Üreticisi
function createLabelSprite(text1, text2) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(44, 62, 80, 0.85)';
  ctx.roundRect(0, 0, 512, 256, 32);
  ctx.fill();
  
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = '#2ecc71';
  ctx.fillText(text1, 40, 100);
  
  ctx.fillStyle = '#f39c12';
  ctx.fillText(text2, 40, 180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4, 2, 1);
  return sprite;
}

export default function SiloScene({
  siloType, dims, wireframe, sensorFov, sensorRange, onAnalysisUpdate, onOptimizeRef
}) {
  const mountRef = useRef(null);
  const siloGroupRef = useRef(null);
  const currentBoxRef = useRef(null);
  
  const [sensorPos, setSensorPos] = useState(null);
  const [bestScoreDetails, setBestScoreDetails] = useState(null);

  useEffect(() => {
    setSensorPos(null);
    setBestScoreDetails(null);
  }, [siloType, dims]);

  useEffect(() => {
    if (onOptimizeRef) {
      onOptimizeRef.current = () => {
        if (!currentBoxRef.current) return;
        const candidates = generateCandidates(siloType, dims, currentBoxRef.current);
        const best = findBestPosition(siloType, dims, sensorFov, sensorRange, candidates);
        
        if (best) {
          setSensorPos(new THREE.Vector3(best.x, best.y, best.z));
          setBestScoreDetails(best.scoreDetails); 
        }
      };
    }
  }, [siloType, dims, sensorFov, sensorRange, onOptimizeRef]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f6);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(12, 10, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const siloGroup = new THREE.Group();
    scene.add(siloGroup);
    siloGroupRef.current = siloGroup;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    const frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (mount && mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const group = siloGroupRef.current;
    if (!group) return;
    group.clear();

    const siloMesh = createSiloMesh(siloType, dims, { wireframe });
    group.add(siloMesh);

    const box = new THREE.Box3().setFromObject(siloMesh);
    currentBoxRef.current = box;

    const points = generateCandidates(siloType, dims, box);
    const pointsGroup = new THREE.Group();
    points.forEach((p) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
      mesh.position.copy(p);
      pointsGroup.add(mesh);
    });
    group.add(pointsGroup);

    const pos = sensorPos || new THREE.Vector3(0, box.max.y, 0);

    const sensorMesh = createSensorMesh(siloType, dims);
    sensorMesh.position.set(pos.x, pos.y + 0.1, pos.z);
    group.add(sensorMesh);

    // 3D Bilgi Etiketi (Sprite)
    if (sensorPos && bestScoreDetails) {
      const label = createLabelSprite(
        `Kapsama: %${bestScoreDetails.coverageScore}`, 
        `Skor: ${bestScoreDetails.total}`
      );
      // Sensörün sağ üst çaprazına konumlandırılır
      label.position.set(pos.x + 2, pos.y + 1, pos.z);
      group.add(label);
    }

    const viewHeight = pos.y - box.min.y;
    const viewRadius = viewHeight * Math.tan((sensorFov / 2) * (Math.PI / 180));

    const coneGeo = new THREE.ConeGeometry(viewRadius, viewHeight, 32);
    coneGeo.translate(0, -viewHeight / 2, 0);

    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x4a90e2, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide
    });

    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(pos);
    group.add(cone);

    const analyzer = new CoverageMap(siloType, dims);
    analyzer.applySensorCoverage(pos, sensorFov);
    const metrics = analyzer.getMetrics();
    
    if (onAnalysisUpdate) {
      onAnalysisUpdate({
        coveragePercent: metrics.coveragePercent,
        blindSpot: metrics.blindSpotPercent,
        gridData: metrics.gridData,
        scoreDetails: bestScoreDetails 
      });
    }

  }, [siloType, dims, wireframe, sensorFov, sensorRange, sensorPos, bestScoreDetails, onAnalysisUpdate]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}