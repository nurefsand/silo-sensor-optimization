import { useState, useRef } from "react";
import Navbar from "./components/Navbar";
import ControlPanel from "./components/ControlPanel";
import SiloScene from "./components/SiloScene";
import "./App.css";

function App() {
  // --- State Tanımlamaları ---
  const [siloType, setSiloType] = useState("cylinder");
  const [wireframe, setWireframe] = useState(false);
  const [dims, setDims] = useState({ height: 8, diameter: 4, length: 10, coneHeight: 2 });
  const [sensorFov, setSensorFov] = useState(60);
  const [sensorRange, setSensorRange] = useState(15);
  
  // Analiz sonuçlarını tutacak state
  const [metrics, setMetrics] = useState({ coveragePercent: 0, blindSpotPercent: 100 });

  // Optimizasyon fonksiyonu için referans
  const optimizeRef = useRef(null);

  const updateDim = (key, value) => {
    setDims((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <ControlPanel
          siloType={siloType}
          setSiloType={setSiloType}
          dims={dims}
          updateDim={updateDim}
          wireframe={wireframe}
          setWireframe={setWireframe}
          sensorFov={sensorFov}
          setSensorFov={setSensorFov}
          sensorRange={sensorRange}
          setSensorRange={setSensorRange}
          metrics={metrics}
          // Optimizasyon fonksiyonunu butona bağlıyoruz
          onOptimize={() => optimizeRef.current?.()} 
        />
        <div className="scene-panel">
          <SiloScene
            siloType={siloType}
            dims={dims}
            wireframe={wireframe}
            sensorFov={sensorFov}
            sensorRange={sensorRange}
            onAnalysisUpdate={setMetrics}
            // Referansı SiloScene'e paslıyoruz
            onOptimizeRef={optimizeRef} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;