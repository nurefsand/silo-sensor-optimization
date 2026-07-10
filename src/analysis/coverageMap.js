export class CoverageMap {
  constructor(siloType, dims, resolution = 0.1) {
    this.siloType = siloType;
    this.dims = dims;
    this.resolution = resolution;
    this.grid = [];
    this.validCellCount = 0;
    this._initializeGrid();
  }

  _initializeGrid() {
    let width = this.dims.diameter;
    let length = (this.siloType === "horizontal" || this.siloType === "rect") ? this.dims.length : this.dims.diameter;
    this.cols = Math.ceil(width / this.resolution);
    this.rows = Math.ceil(length / this.resolution);

    for (let r = 0; r < this.rows; r++) {
      const rowArray = [];
      for (let c = 0; c < this.cols; c++) {
        const x = (c + 0.5) * this.resolution - (width / 2);
        const z = (r + 0.5) * this.resolution - (length / 2);
        
        let isValid = true;
        if (this.siloType !== "rect" && this.siloType !== "horizontal") {
          if (x * x + z * z > (width / 2) * (width / 2)) isValid = false;
        }

        if (isValid) {
          rowArray.push(0); 
          this.validCellCount++;
        } else {
          rowArray.push(-1); 
        }
      }
      this.grid.push(rowArray);
    }
  }

  // OPTİMİZASYON İÇİN GEREKLİ METOT
  reset() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== -1) {
          this.grid[r][c] = 0;
        }
      }
    }
  }

  applyMultiSensorCoverage(sensors) {
    let width = this.dims.diameter;
    let length = (this.siloType === "horizontal" || this.siloType === "rect") ? this.dims.length : this.dims.diameter;

    sensors.forEach(sensor => {
      const pos = sensor.pos;
      const fovDegrees = sensor.fov;
      const radius = Math.abs(pos.y) * Math.tan((fovDegrees / 2) * (Math.PI / 180));

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] === -1) continue;

          const cellX = (c + 0.5) * this.resolution - (width / 2);
          const cellZ = (r + 0.5) * this.resolution - (length / 2);

          const dist = Math.sqrt(Math.pow(cellX - pos.x, 2) + Math.pow(cellZ - pos.z, 2));
          
          if (dist <= radius) {
            this.grid[r][c] += 1; 
          }
        }
      }
    });
  }

  getMetrics() {
    let coveredCount = 0;
    const gridData = [];

    let width = this.dims.diameter;
    let length = (this.siloType === "horizontal" || this.siloType === "rect") ? this.dims.length : this.dims.diameter;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== -1) {
          const hitCount = this.grid[r][c];
          
          if (hitCount > 0) coveredCount++;

          const x = (c + 0.5) * this.resolution - (width / 2);
          const z = (r + 0.5) * this.resolution - (length / 2);

          gridData.push({ x, z, hitCount: hitCount });
        }
      }
    }

    const coveragePercent = this.validCellCount === 0 ? 0 : (coveredCount / this.validCellCount) * 100;
    
    return {
      coveragePercent: coveragePercent,
      blindSpotPercent: 100 - coveragePercent,
      gridData: gridData 
    };
  }
}