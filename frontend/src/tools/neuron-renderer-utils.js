
import {
  Mesh,
  Vector3,
  SphereBufferGeometry,
  Matrix4,
  MeshLambertMaterial,
  Color,
  DoubleSide,
  Quaternion,
} from 'three';

import * as chroma from 'chroma-js';

const baseMorphColors = {
  soma: chroma('#A9A9A9'),
  axon: chroma('#0080FF'),
  apic: chroma('#C184C1'),
  dend: chroma('#FF0033'),
  myelin: chroma('#F5F5F5'),
};


class RendererCtrl {
  countinuousRenderCounter = 0;

  once = true;

  stopTime = null;

  get render() {
    if (this.countinuousRenderCounter) return true;

    if (this.stopTime) {
      const now = Date.now();
      if (this.stopTime > now) return true;

      this.stopTime = null;
      return false;
    }

    const { once } = this;
    this.once = false;
    return once;
  }

  renderOnce() {
    this.once = true;
  }

  renderFor(time) {
    const now = Date.now();
    if (this.stopTime && this.stopTime > now + time) return;
    this.stopTime = now + time;
  }

  renderUntilStopped() {
    this.countinuousRenderCounter += 1;
    return () => { this.countinuousRenderCounter -= 1; };
  }
}

function disposeMesh(obj) {
  obj.geometry.dispose();
  obj.material.dispose();
}

function getSomaPositionFromPoints(pts) {
  let position;

  if (pts.length === 1) {
    position = new Vector3().fromArray(pts[0]);
  } else if (pts.length === 3) {
    position = new Vector3().fromArray(pts[0]);
  } else {
    position = pts
      .reduce((vec, pt) => vec.add(new Vector3().fromArray(pt)), new Vector3())
      .divideScalar(pts.length);
  }

  return position;
}

function getSomaRadiusFromPoints(pts) {
  const position = getSomaPositionFromPoints(pts);
  let radius;

  if (pts.length === 1) {
    // eslint-disable-next-line
    radius = pts[0][3];
  } else if (pts.length === 3) {
    const secondPt = new Vector3().fromArray(pts[1]);
    const thirdPt = new Vector3().fromArray(pts[2]);
    radius = (position.distanceTo(secondPt) + position.distanceTo(thirdPt)) / 2;
  } else {
    radius = Math.max(...pts.map(pt => position.distanceTo(new Vector3().fromArray(pt))));
  }

  return radius;
}

function createSomaMeshFromPoints(pts, material) {
  if (pts.length < 3) return new Mesh(); // not enough information

  const position = getSomaPositionFromPoints(pts);
  const radius = getSomaRadiusFromPoints(pts);

  const geometry = new SphereBufferGeometry(radius, 14, 14);
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.updateMatrix();

  return mesh;
}

function generateSecMaterialMap(colorDiff) {
  const materialMap = Object.entries(baseMorphColors).reduce((map, [secType, chromaColor]) => {
    const glColor = chromaColor
      .brighten(colorDiff)
      .desaturate(colorDiff)
      .gl();

    const color = new Color(...glColor);
    const material = new MeshLambertMaterial({ color, transparent: true });
    material.side = DoubleSide;

    return Object.assign(map, { [secType]: material });
  }, {});

  return materialMap;
}

function rotMatrix4x4FromArray3x3(array3x3) {
  const rotMatrix = new Matrix4();

  rotMatrix.set(
    ...array3x3.reduce((acc, row) => ([...acc, ...row, 0]), []),
    0, 0, 0, 1,
  );

  return rotMatrix;
}

function quatFromArray3x3(array3x3) {
  const rotationMatrix = rotMatrix4x4FromArray3x3(array3x3);

  const quaternion = new Quaternion().setFromRotationMatrix(rotationMatrix);

  return quaternion;
}

export default {
  disposeMesh,
  createSomaMeshFromPoints,
  getSomaPositionFromPoints,
  getSomaRadiusFromPoints,
  generateSecMaterialMap,
  quatFromArray3x3,
  RendererCtrl,
};
