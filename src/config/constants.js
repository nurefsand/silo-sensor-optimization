export const OPTIMIZER_WEIGHTS = {
  coverage: 0.70,
  wallDistance: 0.15,
  edgeDistance: 0.10,
  symmetry: 0.05
};

export const HEATMAP_COLORS = {
  FULL: 'rgba(46, 204, 113, 0.85)',   // Yeşil - Tam Kapsama
  PARTIAL: 'rgba(241, 196, 15, 0.85)', // Sarı - Kısmi Kapsama (Gelecek tahıl eğimleri için ideal)
  BLIND: 'rgba(231, 76, 60, 0.85)'     // Kırmızı - Kör Nokta
};