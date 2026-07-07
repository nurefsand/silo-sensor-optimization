import { SILO_TYPES, FIELD_LABELS, FIELD_RANGES, getSiloTypeConfig } from "../geometry/siloTypes";
import InfoCard from "./InfoCard";
import HeatmapRenderer from "./HeatmapRenderer";
import { OPTIMIZER_WEIGHTS } from "../config/constants"; // Ağırlık sabitleri

const SENSOR_RANGES = {
  fov: { min: 20, max: 120, step: 1 },
  range: { min: 5, max: 50, step: 0.5 },
};

export default function ControlPanel({
  siloType, setSiloType, dims, updateDim, wireframe, setWireframe,
  sensorFov, setSensorFov, sensorRange, setSensorRange,
  metrics, onOptimize,
}) {
  const activeFields = getSiloTypeConfig(siloType).fields;

  // Güvenli değer okumaları (Optional Chaining)
  const coverageVal = metrics?.coveragePercent ?? 0;
  const blindSpotVal = metrics?.blindSpot ?? metrics?.blindSpotPercent ?? 100;

  // Seçili sensörün merkezden uzaklığını matematiksel olarak geri çözme
  const symScore = metrics?.scoreDetails ? parseFloat(metrics.scoreDetails.symmetryScore) / 100 : 1;
  const deviation = ((1 - symScore) * (dims.diameter / 2)).toFixed(2);

  return (
    <div className="control-panel">
      <div className="panel-block">
        <h2 className="panel-block-title">Parametreler</h2>

        <section className="panel-section">
          <h3 className="section-title">Tip</h3>
          <div className="field">
            <label>Silo Tipi</label>
            <select value={siloType} onChange={(e) => setSiloType(e.target.value)}>
              {SILO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Boyutlar</h3>
          {activeFields.map((key) => {
            const range = FIELD_RANGES[key];
            return (
              <div className="field" key={key}>
                <label>
                  <span>{FIELD_LABELS[key]}</span>
                  <span className="field-value">{dims[key]?.toFixed(1)} m</span>
                </label>
                <input
                  type="range" min={range.min} max={range.max} step={range.step}
                  value={dims[key]} onChange={(e) => updateDim(key, parseFloat(e.target.value))}
                />
              </div>
            );
          })}
        </section>

        <section className="panel-section">
          <h3 className="section-title">Sensör Ayarları</h3>
          <div className="field">
            <label>
              <span>Görüş Açısı</span>
              <span className="field-value">{sensorFov?.toFixed(0)}°</span>
            </label>
            <input
              type="range" min={SENSOR_RANGES.fov.min} max={SENSOR_RANGES.fov.max} step={SENSOR_RANGES.fov.step}
              value={sensorFov} onChange={(e) => setSensorFov(parseFloat(e.target.value))}
            />
          </div>
          <div className="field">
            <label>
              <span>Menzil</span>
              <span className="field-value">{sensorRange?.toFixed(1)} m</span>
            </label>
            <input
              type="range" min={SENSOR_RANGES.range.min} max={SENSOR_RANGES.range.max} step={SENSOR_RANGES.range.step}
              value={sensorRange} onChange={(e) => setSensorRange(parseFloat(e.target.value))}
            />
          </div>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Kapsama Analizi</h3>
          <div className="field">
            <label>Kapsama Oranı</label>
            <span className="field-value" style={{ color: '#21ce99', fontWeight: 'bold' }}>
              %{coverageVal.toFixed(1)}
            </span>
          </div>
          <div className="field">
            <label>Kör Nokta</label>
            <span className="field-value" style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
              %{blindSpotVal.toFixed(1)}
            </span>
          </div>

          <button 
            className="optimize-btn" onClick={onOptimize}
            style={{ 
              marginTop: '15px', width: '100%', padding: '10px', cursor: 'pointer',
              backgroundColor: '#4a90e2', color: 'white', border: 'none',
              borderRadius: '4px', fontWeight: 'bold', transition: 'background-color 0.2s'
            }}
          >
            En İyi Konumu Bul ⚡
          </button>
        </section>

        {/* Karar Motoru Raporu */}
        {metrics?.scoreDetails && (
          <section className="panel-section" style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e1e4e8' }}>
            <h3 className="section-title" style={{ color: '#2c3e50', marginBottom: '10px' }}>Karar Algoritması Skoru</h3>
            
            <div className="field" style={{ marginBottom: '8px' }}>
              <label>Toplam Karar Skoru</label>
              <span className="field-value" style={{ fontWeight: 'bold', color: '#f39c12', fontSize: '16px' }}>
                {metrics.scoreDetails.total}
              </span>
            </div>

            {/* AÇIK MATEMATİKSEL FORMÜL */}
            <div style={{ fontSize: '11px', color: '#7f8c8d', background: '#fff', padding: '8px', borderRadius: '4px', marginBottom: '12px', border: '1px dashed #bdc3c7' }}>
              <strong>Optimizasyon Ağırlıkları:</strong><br/>
              (Kapsama × %{OPTIMIZER_WEIGHTS.coverage * 100}) + 
              (Duvar × %{OPTIMIZER_WEIGHTS.wallDistance * 100})<br/>
              (Kenar × %{OPTIMIZER_WEIGHTS.edgeDistance * 100}) + 
              (Simetri × %{OPTIMIZER_WEIGHTS.symmetry * 100})
            </div>

            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Kapsama Etkisi</label>
              <span style={{ fontWeight: '500', color: '#2ecc71' }}>{metrics.scoreDetails.coverageScore}</span>
            </div>
            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Duvar Güvenliği</label>
              <span>{metrics.scoreDetails.wallScore}</span>
            </div>
            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Kenar Skoru</label>
              <span>{metrics.scoreDetails.edgeScore}</span>
            </div>
            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Merkez Simetrisi</label>
              <span>{metrics.scoreDetails.symmetryScore}</span>
            </div>

            <hr style={{ borderColor: '#eee', margin: '12px 0' }}/>
            
            {/* SEÇİLEN SENSÖRÜN MONTAJ VE FİZİKSEL DETAYLARI */}
            <h3 className="section-title" style={{ color: '#2c3e50', fontSize: '12px', marginBottom: '8px' }}>Sensör Montaj Bilgileri</h3>
            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Montaj Yüksekliği</label>
              <span style={{ fontWeight: '500', color: '#2980b9' }}>
                {metrics.scoreDetails.mountHeight 
                  ? metrics.scoreDetails.mountHeight.toFixed(2) 
                  : dims.height.toFixed(2)} m
              </span>
            </div>
            <div className="field" style={{ fontSize: '12px', color: '#666' }}>
              <label>Merkezden Sapma</label>
              <span>{deviation} m</span>
            </div>
          </section>
        )}

        <section className="panel-section panel-section--last">
          <h3 className="section-title">Görünüm</h3>
          <div className="field checkbox-field">
            <label>
              <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.target.checked)} />
              Wireframe görünümü
            </label>
          </div>
        </section>
      </div>

      <div className="panel-divider" />

      <div className="panel-block">
        <h2 className="panel-block-title">Model Bilgisi</h2>
        <InfoCard siloType={siloType} dims={dims} sensorFov={sensorFov} sensorRange={sensorRange} />
      </div>

      {metrics?.gridData && (
        <div className="panel-block" style={{ marginTop: '10px', paddingBottom: '20px' }}>
          <HeatmapRenderer gridData={metrics.gridData} width={240} height={240} />
        </div>
      )}
    </div>
  );
}