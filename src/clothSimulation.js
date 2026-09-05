import * as THREE from 'three';

export class ClothSimulation {
  constructor(columns = 30, rows = 38) {
    this.columns = columns;
    this.rows = rows;
    this.count = columns * rows;
    this.positions = Array.from({ length: this.count }, (_, index) => {
      const x = index % columns;
      const y = Math.floor(index / columns);
      return new THREE.Vector3((x / (columns - 1) - 0.5) * 2.7, 2.45 - y / (rows - 1) * 3.25, 0);
    });
    this.previous = this.positions.map((point) => point.clone());
    this.pinned = new Set(Array.from({ length: columns }, (_, x) => x));
    this.restLength = 2.7 / (columns - 1);
    this.time = 0;
  }

  step(delta, settings) {
    const dt = Math.min(delta, 0.033);
    this.time += dt;
    const gravity = new THREE.Vector3(0, settings.gravity * dt * dt, 0);
    const windForce = settings.windSpeed * 0.0009 * Math.sin(this.time * 1.7);
    for (let index = 0; index < this.count; index += 1) {
      if (this.pinned.has(index)) continue;
      const point = this.positions[index];
      const velocity = point.clone().sub(this.previous[index]).multiplyScalar(0.985);
      this.previous[index].copy(point);
      point.add(velocity).add(gravity);
      point.z += windForce * (0.5 + index / this.count);
      point.x += Math.sin(this.time * 1.4 + point.y * 1.3) * settings.windSpeed * 0.00035;
    }
    for (let iteration = 0; iteration < 3; iteration += 1) {
      for (let index = 0; index < this.count; index += 1) {
        const x = index % this.columns;
        const y = Math.floor(index / this.columns);
        if (x === 0) this.positions[index].x = -1.35;
        if (x === this.columns - 1) this.positions[index].x = 1.35;
        if (y === 0) this.positions[index].y = 2.45;
        if (y < this.rows - 1) this.constrain(index, index + this.columns, this.restLength);
        if (x < this.columns - 1) this.constrain(index, index + 1, this.restLength);
      }
    }
  }

  constrain(firstIndex, secondIndex, distance) {
    const first = this.positions[firstIndex];
    const second = this.positions[secondIndex];
    const difference = second.clone().sub(first);
    const correction = difference.multiplyScalar((difference.length() - distance) / difference.length() * 0.5);
    if (!this.pinned.has(firstIndex)) first.add(correction);
    if (!this.pinned.has(secondIndex)) second.sub(correction);
  }

  writeToGeometry(geometry) {
    const position = geometry.attributes.position;
    this.positions.forEach((point, index) => position.setXYZ(index, point.x, point.y, point.z));
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}