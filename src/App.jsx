import { useState, useRef } from 'react';
import Navbar from './components/Navbar';
import SiloScene from './components/SiloScene';
import ControlPanel from './components/ControlPanel';
import ResultPanel from './components/ResultPanel';
import './app.css'; 

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

  // --- Sprint 7: "Optimum Sensör Sayısı" önerisi için state ve ref'ler ---
  const [maxSuggestCount, setMaxSuggestCount] = useState(6);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestionProgress, setSuggestionProgress] = useState(null);
  const [suggestionResults, setSuggestionResults] = useState([]);
  const [suggestionBest, setSuggestionBest] = useState(null);
  const onSuggestRef = useRef(null);
  const onApplySuggestionRef = useRef(null);

  const updateDim = (key, value) => {
    setDims(prev => ({ ...prev, [key]: value }));
  };

  const handleOptimize = () => {
    if (onOptimizeRef.current) {
      onOptimizeRef.current(); 
    }
  };

  // sensorSuggester.js artık async - burada da await ediyoruz
  const handleRunSuggestion = async () => {
    if (!onSuggestRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setSuggestionResults([]);
    setSuggestionBest(null);
    setSuggestionProgress({ count: 0, maxCount: maxSuggestCount });

    const result = await onSuggestRef.current(maxSuggestCount, (entry, maxCount) => {
      setSuggestionProgress({ count: entry.count, maxCount });
      setSuggestionResults((prev) => [...prev, entry]);
    });

    if (result) {
      setSuggestionBest(result.suggestion);
    }
    setIsAnalyzing(false);
  };

  // ÖNEMLİ: sensorCount'u ÖNCE değiştiriyoruz, SONRA pozisyonları uyguluyoruz.
  // Aksi halde SiloScene'deki `multiPositions.length === sensorCount` kontrolü
  // eşleşmez ve önerilen pozisyonlar yerine eşit-aralıklı diziliş kullanılır.
  const handleApplySuggestion = (entry) => {
    setSensorCount(entry.count);
    if (onApplySuggestionRef.current) {
      onApplySuggestionRef.current(entry);
    }
  };

  return (
    <div className="app-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' 
    }}>
      
      <Navbar />

      <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
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

          <div className="panel-divider" />

          <ResultPanel
            maxSuggestCount={maxSuggestCount}
            setMaxSuggestCount={setMaxSuggestCount}
            isAnalyzing={isAnalyzing}
            progress={suggestionProgress}
            results={suggestionResults}
            suggestion={suggestionBest}
            onRunSuggestion={handleRunSuggestion}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>

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
            onSuggestRef={onSuggestRef}
            onApplySuggestionRef={onApplySuggestionRef}
          />
        </div>

      </div>
    </div>
  );
}

export default App;