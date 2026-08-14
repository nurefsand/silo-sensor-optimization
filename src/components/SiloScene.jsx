import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSiloMesh } from "../geometry/createSiloGeometry";
import { createSensorMesh } from "../geometry/sensorGeometry";
import { CoverageMap } from "../analysis/coverageMap";
import { generateCandidates } from "../analysis/candidateGenerator";
import { findBestPosition, findBestMultiPosition } from "../analysis/optimizer";
import { suggestOptimalSensorCount } from "../analysis/Sensorsuggester";

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
  siloType, dims, wireframe, sensorFov, sensorRange, sensorCount = 1,
  onAnalysisUpdate, onOptimizeRef,
  onSuggestRef, onApplySuggestionRef, // Aşama 7.2: yeni prop'lar
}) {
  const mountRef = useRef(null);
  const siloGroupRef = useRef(null);
  const currentBoxRef = useRef(null);
  
  const [sensorPos, setSensorPos] = useState(null);
  const [multiPositions, setMultiPositions] = useState([]);
  const [bestScoreDetails, setBestScoreDetails] = useState(null);

  // EKSEN FARKINDALIKLI ÇOKLU SENSÖR YERLEŞİM ALGORİTMASI
  const getEquidistantPositions = (count, box) => {
    const positions = [];
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (count === 1) {
      positions.push(sensorPos || new THREE.Vector3(center.x, box.max.y, center.z));
      return positions;
    }
    
    if (siloType === "horizontal" || siloType === "rect") {
      const isXLength = Math.abs(size.x - dims.length) < Math.abs(size.z - dims.length);
      const length = dims.length;
      const step = length / count;
      const start = (-length / 2) + (step / 2);

      for (let i = 0; i < count; i++) {
        const offset = start + (i * step);
        if (isXLength) {
          positions.push(new THREE.Vector3(center.x + offset, box.max.y, center.z));
        } else {
          positions.push(new THREE.Vector3(center.x, box.max.y, center.z + offset));
        }
      }
      return positions;
    }

    const R = Math.max(size.x, size.z) / 2;
    const radius = R * 0.5;
    
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const x = center.x + radius * Math.cos(angle);
      const z = center.z + radius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, box.max.y, z));
    }
    return positions;
  };

  // DÜZELTME: Sensör sayısı değişince eski optimizasyon verilerini temizle
  useEffect(() => {
    setSensorPos(null);
    setMultiPositions([]);
    setBestScoreDetails(null);
  }, [siloType, dims, sensorCount]);

  useEffect(() => {
    if (onOptimizeRef) {
      onOptimizeRef.current = () => {
        if (!currentBoxRef.current) return;
        
        const candidates = generateCandidates(siloType, dims, currentBoxRef.current);
        
        if (sensorCount === 1) {
          const best = findBestPosition(siloType, dims, sensorFov, sensorRange, candidates);
          if (best) {
            setSensorPos(new THREE.Vector3(best.x, best.y, best.z));
            setBestScoreDetails(best.scoreDetails);
            setMultiPositions([]);
          }
        } else {
          const initialPositions = getEquidistantPositions(sensorCount, currentBoxRef.current);
          const bestSensors = findBestMultiPosition(siloType, dims, sensorFov, sensorRange, candidates, sensorCount, initialPositions);
          
          if (bestSensors) {
            setMultiPositions(bestSensors.map(s => new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z)));
            setBestScoreDetails(null);
          }
        }
      };
    }
  }, [siloType, dims, sensorFov, sensorRange, sensorCount, onOptimizeRef]);

  // --- Aşama 7.2 (1/2): "Optimum sayıyı öner" - analiz döngüsünü tetikler ---
  // candidates/box'a ihtiyaç duyduğu için (App.jsx'in erişemediği currentBoxRef),
  // bu fonksiyon burada, mevcut onOptimizeRef ile birebir aynı desende tanımlanıyor.
  useEffect(() => {
    if (onSuggestRef) {
      onSuggestRef.current = async (maxCount, onProgress) => {
        if (!currentBoxRef.current) return null;
        const candidates = generateCandidates(siloType, dims, currentBoxRef.current);
        return suggestOptimalSensorCount(siloType, dims, sensorFov, sensorRange, candidates, maxCount, { onProgress });
      };
    }
  }, [siloType, dims, sensorFov, sensorRange, onSuggestRef]);

  // --- Aşama 7.2 (2/2): önerilen bir sayının pozisyonlarını DOĞRUDAN uygula ---
  // sensorSuggester zaten o count için en iyi pozisyonları hesapladığı için
  // burada optimizer'ı TEKRAR çalıştırmıyoruz - doğrudan multiPositions'a yazıyoruz.
  // Not: App.jsx bu fonksiyonu çağırmadan HEMEN ÖNCE sensorCount'u entry.count'a
  // eşitlemeli, aksi halde render efektindeki `multiPositions.length === sensorCount`
  // kontrolü eşleşmez ve pozisyonlar yerine tekrar eşit-aralıklı diziliş kullanılır.
  useEffect(() => {
    if (onApplySuggestionRef) {
      onApplySuggestionRef.current = (entry) => {
        if (!entry || !entry.sensors) return;
        setMultiPositions(entry.sensors.map(s => new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z)));
        setBestScoreDetails(null);
        setSensorPos(null);
      };
    }
  }, [onApplySuggestionRef]);

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
      mesh.position.set(p.x, p.y, p.z);
      pointsGroup.add(mesh);
    });
    group.add(pointsGroup);

    // DÜZELTME: Çoklu pozisyonların sayısı sensör sayısıyla eşleşiyorsa kullan
    const positions = (multiPositions.length === sensorCount && sensorCount > 1) 
      ? multiPositions 
      : getEquidistantPositions(sensorCount, box);
      
    const sensorsData = [];

    positions.forEach((pos, index) => {
      const sensorMesh = createSensorMesh(siloType, dims);
      sensorMesh.position.set(pos.x, pos.y, pos.z);
      group.add(sensorMesh);

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

      if (index === 0 && sensorCount === 1 && bestScoreDetails) {
        const label = createLabelSprite(`Kapsama: %${bestScoreDetails.coverageScore}`, `Skor: ${bestScoreDetails.total}`);
        label.position.set(pos.x + 2, pos.y + 1, pos.z);
        group.add(label);
      }

      sensorsData.push({ pos, fov: sensorFov });
    });

    const analyzer = new CoverageMap(siloType, dims);
    analyzer.applyMultiSensorCoverage(sensorsData);
    const metrics = analyzer.getMetrics();
    
    if (onAnalysisUpdate) {
      onAnalysisUpdate({
        coveragePercent: metrics.coveragePercent,
        blindSpot: metrics.blindSpotPercent,
        gridData: metrics.gridData,
        scoreDetails: sensorCount === 1 ? bestScoreDetails : null 
      });
    }

  }, [siloType, dims, wireframe, sensorFov, sensorRange, sensorCount, sensorPos, multiPositions, bestScoreDetails, onAnalysisUpdate]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}