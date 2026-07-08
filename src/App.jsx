import { useState, useRef } from 'react';
import Navbar from './components/Navbar';
import SiloScene from './components/SiloScene';
import ControlPanel from './components/ControlPanel';
import './App.css'; 

function App() {
  const [siloType, setSiloType] = useState('cylinder');
  const [wireframe, setWireframe] = useState(false);
  
  const [dims, setDims] = useState({
    diameter: 12.0,
    height: 10.0,
    length: 10.0, 
    width: 4.0,   
    coneHeight: 2.5
  });

  const [sensorFov, setSensorFov] = useState(29);
  const [sensorRange, setSensorRange] = useState(15.0);
  const [sensorCount, setSensorCount] = useState(1);

  const [analysisData, setAnalysisData] = useState(null);
  const onOptimizeRef = useRef(null);

  const updateDim = (key, value) => {
    setDims(prev => ({ ...prev, [key]: value }));
  };

  const handleOptimize = () => {
    if (onOptimizeRef.current) {
      onOptimizeRef.current(); 
    }
  };

  return (
    // Kök sarmalayıcı: Tam ekran, dikey dizilim ve garantili modern yazı tipi
    <div className="app-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' 
    }}>
      
      <Navbar />

      {/* Ana içerik alanı: ControlPanel ve SiloScene yan yana */}
      <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Ekstra sidebar div'i SİLİNDİ! ControlPanel doğrudan eklendi. Beyaz boşluk sorunu çözüldü. */}
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
          sensorCount={sensorCount}
          setSensorCount={setSensorCount}
          metrics={analysisData}
          onOptimize={handleOptimize}
        />

        <div className="scene-container" style={{ flex: 1, position: 'relative' }}>
          <SiloScene
            siloType={siloType}
            dims={dims}
            wireframe={wireframe}
            sensorFov={sensorFov}
            sensorRange={sensorRange}
            sensorCount={sensorCount}
            onAnalysisUpdate={setAnalysisData}
            onOptimizeRef={onOptimizeRef}
          />
        </div>

      </div>
    </div>
  );
}

export default App;