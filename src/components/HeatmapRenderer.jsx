import React, { useEffect, useRef } from 'react';

export default function HeatmapRenderer({ gridData, width = 240, height = 240 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!gridData || gridData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Silonun X ve Z sınırlarını dinamik bul
    const xs = gridData.map(p => p.x);
    const zs = gridData.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, width, height);

    // Grid yoğunluğuna göre nokta boyutunu dinamik ayarla (Çok kalabalıksa küçült)
    const pointSize = Math.max(3, Math.min(width / Math.sqrt(gridData.length), 15));

    gridData.forEach(point => {
      // 3D koordinatları 2D Canvas piksellerine haritala (Padding bırakarak)
      const cx = ((point.x - minX) / rangeX) * (width - 40) + 20;
      const cy = ((point.z - minZ) / rangeZ) * (height - 40) + 20;

      // ÇOKLU SENSÖR RENK SKALASI (Overlap Algoritması)
      if (point.hitCount === 0) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';   // Kırmızı: Kör Nokta (Hiçbir sensör görmüyor)
      } else if (point.hitCount === 1) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.85)';  // Yeşil: Tekil Kapsama (1 sensör görüyor)
      } else {
        ctx.fillStyle = 'rgba(41, 128, 185, 0.85)';  // Koyu Mavi: Kesişim / Overlap (2+ sensör görüyor)
      }
      
      // Yuvarlak noktalar çiz
      ctx.beginPath();
      ctx.arc(cx, cy, pointSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [gridData, width, height]); // Veriler veya boyut değiştiğinde yeniden çizilir

  return (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Kapsama Haritası (Kuşbakışı)</h4>
      
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ display: 'block', margin: '0 auto', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #eee' }} 
      />
      
      {/* ÇOKLU SENSÖR LEJANTI */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: 'rgba(46, 204, 113, 0.85)', borderRadius: '50%' }}></span> Tekil Kapsama
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: 'rgba(41, 128, 185, 0.85)', borderRadius: '50%' }}></span> Kesişim (Overlap)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: 'rgba(231, 76, 60, 0.85)', borderRadius: '50%' }}></span> Kör Nokta
        </span>
      </div>
    </div>
  );
}