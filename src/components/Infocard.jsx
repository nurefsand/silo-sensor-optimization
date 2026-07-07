import { getSiloTypeConfig, FIELD_LABELS } from "../geometry/siloTypes";
import { computeSiloVolume } from "../geometry/createSiloGeometry";

// Kontrol panelinin "Model Bilgisi" bölümü içine gömülü render edilir (bkz. ControlPanel.jsx).
export default function InfoCard({ siloType, dims, sensorFov, sensorRange }) {
  const config = getSiloTypeConfig(siloType);
  const volume = computeSiloVolume(siloType, dims);

  return (
    <div className="model-info-card">
      <div className="info-card-row">
        {config.fields.map((key) => (
          <span key={key}>
            {FIELD_LABELS[key]}: <strong>{dims[key].toFixed(1)} m</strong>
          </span>
        ))}
      </div>

      {/* Sprint 2: sensör bilgileri de bilgi kartına eklendi */}
      <div className="info-card-row">
        <span>
          Sensör Açısı: <strong>{sensorFov.toFixed(0)}°</strong>
        </span>
        <span>
          Sensör Menzili: <strong>{sensorRange.toFixed(1)} m</strong>
        </span>
      </div>

      <div className="info-card-volume">
        Hacim: <strong>{volume.toFixed(1)} m³</strong>
      </div>
    </div>
  );
}