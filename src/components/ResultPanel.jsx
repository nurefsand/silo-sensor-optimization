import { buildDecisionExplanation } from "../analysis/Sensorsuggester";

// Aşama 7.3 + açıklanabilirlik geliştirmesi: sensör sayısı önerisi arayüzü.
// ControlPanel.jsx'ten bilerek ayrı tutuldu - farklı bir sorumluluk
// (mevcut ayarları düzenlemek değil, "kaç sensöre ihtiyacım var" sorusuna cevap).

export default function ResultPanel({
  maxSuggestCount,
  setMaxSuggestCount,
  isAnalyzing,
  progress,
  results,
  suggestion,
  onRunSuggestion,
  onApplySuggestion,
}) {
  const progressPercent = progress ? (progress.count / progress.maxCount) * 100 : 0;

  // Saf türetme - yeni state değil, mevcut results/suggestion'dan hesaplanıyor.
  const explanation = buildDecisionExplanation(results, suggestion);

  return (
    <div className="panel-block">
      <h2 className="panel-block-title">Optimum Sensör Sayısı</h2>

      <div className="field">
        <label>
          <span>Maks. Denenecek Sayı</span>
          <span className="field-value">{maxSuggestCount} Adet</span>
        </label>
        <input
          type="range"
          min={2}
          max={12}
          step={1}
          value={maxSuggestCount}
          disabled={isAnalyzing}
          onChange={(e) => setMaxSuggestCount(parseInt(e.target.value))}
        />
      </div>

      <button
        onClick={onRunSuggestion}
        disabled={isAnalyzing}
        style={{
          marginTop: "10px",
          width: "100%",
          padding: "10px",
          cursor: isAnalyzing ? "not-allowed" : "pointer",
          backgroundColor: isAnalyzing ? "#9db8d8" : "#4a90e2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontWeight: "bold",
        }}
      >
        {isAnalyzing
          ? `Analiz ediliyor (${progress?.count ?? 0}/${progress?.maxCount ?? maxSuggestCount})...`
          : "Optimum Sayıyı Öner"}
      </button>

      {isAnalyzing && (
        <div
          style={{
            marginTop: "8px",
            height: "6px",
            background: "#e1e4e8",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: "#4a90e2",
              transition: "width 0.15s ease",
            }}
          />
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ marginTop: "14px" }}>
          {/* Başlık satırı */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "6px",
              padding: "0 8px 4px",
              fontSize: "10px",
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            <span style={{ minWidth: "70px" }}>Sensör</span>
            <span style={{ minWidth: "48px" }}>Kapsama</span>
            <span style={{ minWidth: "48px" }}>Kör Nokta</span>
            <span style={{ minWidth: "48px" }}>Örtüşme</span>
            <span style={{ width: "50px" }} />
          </div>

          {results.map((entry) => {
            const isSuggested = suggestion && entry.count === suggestion.count;
            return (
              <div
                key={entry.count}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 8px",
                  marginBottom: "4px",
                  borderRadius: "4px",
                  background: isSuggested ? "#eaf4ff" : "transparent",
                  border: isSuggested ? "1px solid #4a90e2" : "1px solid transparent",
                  fontSize: "12px",
                }}
              >
                <span style={{ fontWeight: isSuggested ? "bold" : "normal", minWidth: "70px" }}>
                  {entry.count} sensör {isSuggested && "★"}
                </span>
                <span style={{ color: "#21ce99", minWidth: "48px" }}>
                  %{entry.coveragePercent.toFixed(1)}
                </span>
                <span style={{ color: "#ff4d4f", minWidth: "48px" }}>
                  %{entry.blindSpotPercent.toFixed(1)}
                </span>
                <span style={{ color: "#f39c12", minWidth: "48px" }}>
                  %{entry.overlapPercent.toFixed(1)}
                </span>
                <button
                  onClick={() => onApplySuggestion(entry)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    cursor: "pointer",
                    border: "1px solid #4a90e2",
                    background: "white",
                    color: "#4a90e2",
                    borderRadius: "3px",
                    width: "50px",
                  }}
                >
                  Uygula
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Optimizasyon Özeti paneli - mevcut suggestion/results verisini yorumluyor */}
      {suggestion && !isAnalyzing && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#2c3e50",
            background: "#f8f9fa",
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #e1e4e8",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "12.5px" }}>
            Optimizasyon Özeti
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
            <span>Önerilen sensör sayısı: <strong>{suggestion.count}</strong></span>
            <span>Kapsama: <strong style={{ color: "#21ce99" }}>%{suggestion.coveragePercent.toFixed(1)}</strong></span>
            <span>Kör Nokta: <strong style={{ color: "#ff4d4f" }}>%{suggestion.blindSpotPercent.toFixed(1)}</strong></span>
            <span>Örtüşme: <strong style={{ color: "#f39c12" }}>%{suggestion.overlapPercent.toFixed(1)}</strong></span>
            <span>Son sensörün katkısı: <strong>%{suggestion.marginalGain.toFixed(1)}</strong></span>
          </div>

          <div style={{ paddingTop: "8px", borderTop: "1px dashed #d5d5d5", lineHeight: 1.5 }}>
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
}