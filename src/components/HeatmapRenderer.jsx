import React, { useEffect, useRef } from 'react';
import { HEATMAP_COLORS } from '../config/constants';

export default function HeatmapRenderer({ gridData, width = 250, height = 250 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!gridData || gridData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const xs = gridData.map(p => p.x);
    const zs = gridData.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    ctx.clearRect(0, 0, width, height);
    const pointSize = Math.max(3, Math.min(width / Math.sqrt(gridData.length), 15));

    gridData.forEach(point => {
      const cx = ((point.x - minX) / rangeX) * (width - 40) + 20;
      const cy = ((point.z - minZ) / rangeZ) * (height - 40) + 20;

      if (point.covered === 1) {
        ctx.fillStyle = HEATMAP_COLORS.FULL;
      } else if (point.covered === 0.5) {
        ctx.fillStyle = HEATMAP_COLORS.PARTIAL;
      } else {
        ctx.fillStyle = HEATMAP_COLORS.BLIND;
      }
      
      ctx.beginPath();
      ctx.arc(cx, cy, pointSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [gridData, width, height]); 

  return (
    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Kapsama Haritası (Kuşbakışı)</h4>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ display: 'block', margin: '0 auto', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #eee' }} 
      />
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: HEATMAP_COLORS.FULL, borderRadius: '50%' }}></span> Tam
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: HEATMAP_COLORS.PARTIAL, borderRadius: '50%' }}></span> Kısmi
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', background: HEATMAP_COLORS.BLIND, borderRadius: '50%' }}></span> Kör Nokta
        </span>
      </div>
    </div>
  );
}