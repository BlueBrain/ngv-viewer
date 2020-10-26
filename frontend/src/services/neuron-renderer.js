
import throttle from 'lodash/throttle';
import get from 'lodash/get';
import difference from 'lodash/difference';
import pick from 'lodash/pick';

import {
  Color, TextureLoader, WebGLRenderer, Scene, Fog, AmbientLight, PointLight, Vector2,
  Raycaster, PerspectiveCamera, Object3D, BufferAttribute, BufferGeometry,
  PointsMaterial, DoubleSide, VertexColors, Geometry, Points, Vector3, MeshLambertMaterial,
  SphereBufferGeometry, CylinderGeometry, Mesh, LineSegments, LineBasicMaterial, EdgesGeometry,
  Matrix4, WebGLRenderTarget,
} from 'three';

import { saveAs } from 'file-saver';
import { TweenLite, TimelineLite } from 'gsap';

import TrackballControls from '@/services/trackball-controls';

// TODO: refactor to remove store operations
// and move them to vue viewport component
import store from '@/store';
import eachAsync from '@/tools/each-async';
import utils from '@/tools/neuron-renderer-utils';


const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 50000;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xfefdfb;
// TODO: make it possible to switch bg color
// const BACKGROUND_COLOR = 0x272821;
const HOVER_BOX_COLOR = 0xffdf00;
const EXC_SYN_GL_COLOR = new Color(0xe48457).toArray();
const INH_SYN_GL_COLOR = new Color(0x0080ff).toArray();
const HOVERED_NEURON_GL_COLOR = new Color(0xf26d21).toArray();
const HOVERED_SYN_GL_COLOR = new Color(0xf26d21).toArray();

const SQUARE_DOT_SCALE = 1.3;

// TODO: calculate in runtime
const HEADER_HEIGHT = 36;

const ALL_SEC_TYPES = [
  'soma',
  'axon',
  'apic',
  'dend',
  'myelin',
];

const COLOR_DIFF_RANGE = 1;
const HALF_PI = Math.PI * 0.5;

const neuronTexture = new TextureLoader().load('/neuron-texture.png');
const synapseTexture = new TextureLoader().load('/ball.png');

const defaultSecRenderFilter = t => store.state.simulation.view.axonsVisible || t !== 'axon';


class NeuronRenderer {
  constructor(canvas, config) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    this.ctrl = new utils.RendererCtrl();

    const { clientWidth, clientHeight } = canvas.parentElement;

    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    this.scene = new Scene();
    this.scene.background = new Color(BACKGROUND_COLOR);
    this.scene.fog = new Fog(FOG_COLOR, NEAR, FAR);
    this.scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR));

    this.pickingScene = new Scene();
    this.pickingTexture = new WebGLRenderTarget(1, 1);
    this.pickingPixelBuffer = new Uint8Array(4);

    this.mouseNative = new Vector2();
    this.mouseGl = new Vector2();

    this.raycaster = new Raycaster();

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 1, 100000);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.zoomSpeed = 0.4;
    this.controls.rotateSpeed = 0.8;

    this.hoveredMesh = null;
    this.hoveredNeuron = null;
    this.hoveredSynapse = null;
    this.highlightedNeuron = null;
    this.mousePressed = false;

    this.secMarkerObj = new Object3D();
    this.scene.add(this.secMarkerObj);

    this.cellMorphologyObj = new Object3D();
    this.scene.add(this.cellMorphologyObj);

    this.pickingCellMorphologyObj = new Object3D();
    this.pickingScene.add(this.pickingCellMorphologyObj);

    const segInjTexture = new TextureLoader().load('/seg-inj-texture.png');
    const segRecTexture = new TextureLoader().load('/seg-rec-texture.png');

    this.recMarkerMaterial = new MeshLambertMaterial({
      color: 0x00bfff,
      opacity: 0.6,
      map: segRecTexture,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    });

    this.injMarkerMaterial = new MeshLambertMaterial({
      color: 0xffa500,
      opacity: 0.6,
      map: segInjTexture,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    });

    this.synapseMaterial = new PointsMaterial({
      vertexColors: VertexColors,
      size: store.state.simulation.synapseSize,
      transparent: true,
      alphaTest: 0.5,
      sizeAttenuation: true,
      map: synapseTexture,
    });

    this.onHoverExternalHandler = config.onHover;
    this.onHoverEndExternalHandler = config.onHoverEnd;
    this.onClickExternalHandler = config.onClick;

    this.initEventHandlers();
    this.startRenderLoop();
  }

  initNeuronCloud(cloudSize) {
    const positionBuffer = new Float32Array(cloudSize * 3);
    const colorBuffer = new Float32Array(cloudSize * 3);

    this.neuronCloud = {
      positionBufferAttr: new BufferAttribute(positionBuffer, 3),
      colorBufferAttr: new BufferAttribute(colorBuffer, 3),
    };

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.neuronCloud.positionBufferAttr);
    geometry.setAttribute('color', this.neuronCloud.colorBufferAttr);

    const material = new PointsMaterial({
      vertexColors: VertexColors,
      size: store.state.circuit.somaSize,
      opacity: 0.85,
      transparent: true,
      alphaTest: 0.2,
      sizeAttenuation: true,
      map: neuronTexture,
    });

    this.neuronCloud.points = new Points(geometry, material);

    // TODO: measure performance improvement
    this.neuronCloud.points.matrixAutoUpdate = false;
    this.neuronCloud.points.updateMatrix();

    this.neuronCloud.points.name = 'neuronCloud';
    this.neuronCloud.points.frustumCulled = false;
    this.scene.add(this.neuronCloud.points);

    // picking cloud setup
    const pickingColorBuffer = new Float32Array(cloudSize * 3);
    const tmpColor = new Color();
    for (let i = 0; i < cloudSize; i += 1) {
      tmpColor.setHex(i + 1);
      pickingColorBuffer[i * 3] = tmpColor.r;
      pickingColorBuffer[i * 3 + 1] = tmpColor.g;
      pickingColorBuffer[i * 3 + 2] = tmpColor.b;
    }

    const pickingColorBufferAttr = new BufferAttribute(pickingColorBuffer, 3);
    const pickingGeometry = new BufferGeometry();
    pickingGeometry.setAttribute('position', this.neuronCloud.positionBufferAttr);
    pickingGeometry.setAttribute('color', pickingColorBufferAttr);

    const pickingMaterial = new PointsMaterial({
      vertexColors: VertexColors,
      size: store.state.circuit.somaSize / SQUARE_DOT_SCALE,
      sizeAttenuation: true,
      map: neuronTexture,
    });

    this.pickingNeuronCloud = new Points(pickingGeometry, pickingMaterial);
    this.pickingNeuronCloud.frustumCulled = false;
    this.pickingScene.add(this.pickingNeuronCloud);

    const highlightedNeuronGeometry = new Geometry();
    const highlightedNeuronMaterial = new PointsMaterial({
      size: 0,
      transparent: true,
      opacity: 0,
      map: neuronTexture,
    });

    highlightedNeuronGeometry.vertices.push(new Vector3(0, 0, 0));

    this.highlightedNeuron = new Points(
      highlightedNeuronGeometry,
      highlightedNeuronMaterial,
    );

    this.highlightedNeuron.frustumCulled = false;
    this.scene.add(this.highlightedNeuron);
  }

  destroyNeuronCloud() {
    if (!this.neuronCloud) return;

    this.scene.remove(this.neuronCloud.points);
    utils.disposeMesh(this.neuronCloud.points);
    this.neuronCloud = null;
    this.ctrl.renderOnce();
  }

  initSynapseCloud(cloudSize) {
    const positionBuffer = new Float32Array(cloudSize * 3);
    const colorBuffer = new Float32Array(cloudSize * 3);

    this.synapseCloud = {
      positionBufferAttr: new BufferAttribute(positionBuffer, 3),
      colorBufferAttr: new BufferAttribute(colorBuffer, 3),
    };

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.synapseCloud.positionBufferAttr);
    geometry.setAttribute('color', this.synapseCloud.colorBufferAttr);

    this.synapseCloud.points = new Points(geometry, this.synapseMaterial);
    this.synapseCloud.points.name = 'synapseCloud';
    this.synapseCloud.points.frustumCulled = false;
    this.scene.add(this.synapseCloud.points);
  }

  destroySynapseCloud() {
    if (!this.synapseCloud) return;

    this.scene.remove(this.synapseCloud.points);
    utils.disposeMesh(this.synapseCloud.points);
    this.synapseCloud = null;
    this.ctrl.renderOnce();
  }

  clearScene() {
    this.destroyNeuronCloud();
    this.destroySynapseCloud();
    this.removeCellMorphologies(() => true);
    this.disposeSecMarkers();
    this.ctrl.renderOnce();
  }

  alignCamera() {
    this.neuronCloud.points.geometry.computeBoundingSphere();
    const { center, radius } = this.neuronCloud.points.geometry.boundingSphere;
    this.camera.position.x = center.x;
    this.camera.position.y = center.y;

    const distance = radius / Math.tan(Math.PI * this.camera.fov / 360) * 1.15;

    this.camera.position.z = distance + center.z;
    this.controls.target = center;
    this.ctrl.renderOnce();
  }

  resetCameraUp() {
    this.camera.up.set(0, 1, 0);
    this.ctrl.renderOnce();
  }

  centerCellMorph(gid) {
    const controlsTargetVec = new Vector3();

    this.cellMorphologyObj.traverse((child) => {
      const childSectionName = get(child, 'userData.type');
      const childGid = get(child, 'userData.neuron.gid');
      if (childSectionName !== 'soma' || childGid !== gid) return;

      controlsTargetVec.copy(child.position);
    });

    const { orientation } = store.state.simulation.morphology[gid];

    const cellQuat = utils.quatFromArray3x3(orientation);

    const cameraPositionVec = new Vector3(0, 0, 300)
      .applyQuaternion(cellQuat)
      .add(controlsTargetVec);

    const up = new Vector3(0, 1, 0).applyQuaternion(cellQuat).normalize();
    this.camera.up = up;

    const animateCamera = () => {
      TweenLite
        .to(this.camera.position, 0.15, pick(cameraPositionVec, ['x', 'y', 'z']))
        .eventCallback('onUpdate', () => { this.controls.target.copy(controlsTargetVec); });
    };

    TweenLite
      .to(this.controls.target, 0.15, pick(controlsTargetVec, ['x', 'y', 'z']))
      .eventCallback('onComplete', animateCamera);

      this.ctrl.renderFor(500);
  }

  updateSynapses() {
    const { synapses } = store.state.simulation;
    const { positionBufferAttr, colorBufferAttr } = this.synapseCloud;

    synapses.forEach((synapse, neuronIndex) => {
      if (!synapse.visible) {
        // TODO: find a better way to hide part of the cloud
        positionBufferAttr.setXYZ(neuronIndex, 10000, 10000, 10000);
        return;
      }

      const position = [synapse.postXCenter, synapse.postYCenter, synapse.postZCenter];

      const color = synapse.type >= 100 ? EXC_SYN_GL_COLOR : INH_SYN_GL_COLOR;

      positionBufferAttr.setXYZ(neuronIndex, ...position);
      colorBufferAttr.setXYZ(neuronIndex, ...color);
    });

    this.synapseCloud.points.geometry.attributes.position.needsUpdate = true;
    this.synapseCloud.points.geometry.attributes.color.needsUpdate = true;
    this.synapseCloud.points.geometry.computeBoundingSphere();

    this.ctrl.renderOnce();
  }

  showNeuronCloud() {
    this.neuronCloud.points.visible = true;
    this.ctrl.renderOnce();
  }

  hideNeuronCloud() {
    this.neuronCloud.points.visible = false;
    this.ctrl.renderOnce();
  }

  removeCellMorphologies(filterFunction) {
    const cellMorphObjsToRemove = [];
    this.cellMorphologyObj.children.forEach((obj) => {
      if (filterFunction(obj.userData)) cellMorphObjsToRemove.push(obj);
    });

    // TODO: refactor
    cellMorphObjsToRemove.forEach((obj) => {
      this.cellMorphologyObj.remove(obj);
      const toRemove = obj.children.map(child => child);
      toRemove.forEach(o => utils.disposeMesh(o));
    });

    this.ctrl.renderOnce();
  }

  hideCellMorphology() {
    this.cellMorphologyObj.visible = false;
    this.ctrl.renderOnce();
  }

  showMorphology(secTypes = ALL_SEC_TYPES.filter(defaultSecRenderFilter)) {
    const gids = store.state.circuit.simAddedNeurons.map(n => n.gid);

    const { morphology } = store.state.simulation;

    const addSecOperations = [];

    gids.forEach((gid, cellIndex) => {
      let cellObj3d = this.cellMorphologyObj.children.find(cell => get(cell, 'userData.gid') === gid);

      if (!cellObj3d) {
        cellObj3d = new Object3D();
        cellObj3d.userData = {
          gid,
          secTypes: [],
        };
        this.cellMorphologyObj.add(cellObj3d);
      }

      const secTypesToAdd = difference(secTypes, cellObj3d.userData.secTypes);
      if (!secTypesToAdd.length) return;

      cellObj3d.userData.secTypes.push(...secTypesToAdd);

      const neuronIndex = gid - 1;
      const neuron = store.$get('neuron', neuronIndex);
      const { sections } = morphology[gid];

      const colorDiff = (((2 * COLOR_DIFF_RANGE * cellIndex) / gids.length)) - COLOR_DIFF_RANGE;

      const materialMap = utils.generateSecMaterialMap(colorDiff);

      const addSecOperation = eachAsync(sections, (section) => {
        const pts = section.points;

        const secMesh = section.type === 'soma' ?
          utils.createSomaMeshFromPoints(pts, materialMap[section.type].clone()) :
          utils.createSecMeshFromPoints(pts, materialMap[section.type].clone());

        secMesh.name = 'morphSection';
        secMesh.userData = {
          neuron,
          type: section.type,
          id: section.id,
          name: section.name,
        };

        cellObj3d.add(secMesh);
      }, sec => secTypesToAdd.includes(sec.type));

      addSecOperations.push(addSecOperation);
    });

    const stopRender = this.ctrl.renderUntilStopped();

    Promise.all(addSecOperations).then(() => {
      store.$dispatch('morphRenderFinished');
      stopRender();
    });

    this.cellMorphologyObj.visible = true;
  }

  showAxons() {
    const axonsAdded = this.cellMorphologyObj.children
      .every(cellMesh => cellMesh.userData.secTypes.includes('axon'));

    if (!axonsAdded) {
      this.showMorphology(['axon']);
      return;
    }

    const materialsToAnimate = [];
    this.cellMorphologyObj.traverse((obj) => {
      if (obj instanceof Mesh && get(obj, 'userData.type') === 'axon') {
        materialsToAnimate.push(obj.material);
      }
    });

    materialsToAnimate.forEach((m) => { m.visible = true; });

    const stopRender = this.ctrl.renderUntilStopped();
    const onAnimationEnd = () => {
      store.$dispatch('showAxonsFinished');
      stopRender();
    };

    TweenLite
      .to(materialsToAnimate, 0.3, { opacity: 1 })
      .eventCallback('onComplete', onAnimationEnd);
  }

  hideAxons() {
    const materialsToAnimate = [];
    this.cellMorphologyObj.traverse((obj) => {
      if (obj instanceof Mesh && get(obj, 'userData.type') === 'axon') {
        materialsToAnimate.push(obj.material);
      }
    });

    const stopRender = this.ctrl.renderUntilStopped();
    const onAnimationEnd = () => {
      materialsToAnimate.forEach((m) => { m.visible = false; });
      store.$dispatch('hideAxonsFinished');
      stopRender();
    };

    TweenLite
      .to(materialsToAnimate, 0.3, { opacity: 0 })
      .eventCallback('onComplete', onAnimationEnd);
  }

  addSecMarker(config) {
    const minSecMarkerLength = 12;

    const { morphology } = store.state.simulation;

    const pts = morphology[config.gid].sections
      .find(sec => config.sectionName === sec.name)
      .points;

    const secMarkerObj3d = new Object3D();
    const secMarkerGeo = new Geometry();

    if (config.sectionType === 'soma') {
      const position = utils.getSomaPositionFromPoints(pts);
      const radius = utils.getSomaRadiusFromPoints(pts);

      const material = config.type === 'recording' ? this.recMarkerMaterial : this.injMarkerMaterial;
      const somaBufferedGeometry = new SphereBufferGeometry(radius * 1.05, 14, 14);
      const somaMesh = new Mesh(somaBufferedGeometry, material.clone());
      somaMesh.position.copy(position);
      somaMesh.updateMatrix();
      somaMesh.matrixAutoUpdate = false;

      somaMesh.name = 'sectionMarker';
      somaMesh.userData = Object.assign({ skipHoverDetection: true }, config);

      secMarkerObj3d.add(somaMesh);
      secMarkerObj3d.name = 'sectionMarker';
      secMarkerObj3d.userData = Object.assign({ skipHoverDetection: true }, config);

      this.secMarkerObj.add(secMarkerObj3d);
      return;
    }

    let i = 0;
    while (i + 1 < pts.length) {
      const vstart = new Vector3(pts[i][0], pts[i][1], pts[i][2]);
      const diameters = [pts[i][3]];

      let vend;
      while (!vend) {
        const tmpEndVec = new Vector3(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);

        if (
          vstart.distanceTo(tmpEndVec) >= minSecMarkerLength ||
          i + 2 === pts.length
        ) {
          vend = tmpEndVec;
        }

        diameters.push(pts[i + 1][3]);

        i += 1;
      }

      const d = Math.max(...diameters);

      const distance = vstart.distanceTo(vend);
      const position = vend.clone().add(vstart).divideScalar(2);

      const dDelta = 3 / Math.ceil(Math.sqrt(d));
      const secMarkerD = (d * 1.2) + dDelta;

      const geometry = new CylinderGeometry(
        secMarkerD,
        secMarkerD,
        distance,
        18,
        1,
        true,
      );

      const orientation = new Matrix4();
      const offsetRotation = new Matrix4();
      orientation.lookAt(vstart, vend, new Vector3(0, 1, 0));
      offsetRotation.makeRotationX(HALF_PI);
      orientation.multiply(offsetRotation);
      geometry.applyMatrix4(orientation);

      const cylinder = new Mesh(geometry);
      cylinder.position.copy(position);
      cylinder.updateMatrix();
      secMarkerGeo.merge(cylinder.geometry, cylinder.matrix);
    }

    const material = config.type === 'recording' ? this.recMarkerMaterial : this.injMarkerMaterial;
    const secMarkerMesh = new Mesh(secMarkerGeo, material.clone());
    secMarkerMesh.updateMatrix();
    secMarkerMesh.matrixAutoUpdate = false;
    // TODO: remove redundancy of names and userData of Obj3D and child Meshes
    secMarkerMesh.name = 'sectionMarker';
    secMarkerMesh.userData = Object.assign({ skipHoverDetection: true }, config);
    secMarkerObj3d.add(secMarkerMesh);

    secMarkerObj3d.name = 'sectionMarker';
    secMarkerObj3d.userData = Object.assign({ skipHoverDetection: true }, config);
    this.secMarkerObj.add(secMarkerObj3d);

    this.ctrl.renderOnce();
  }

  removeSecMarker(secMarkerConfig) {
    // TODO: refactor
    const cfg = secMarkerConfig;
    const secMarkerObj3d = this.secMarkerObj.children
      .find(obj3d => obj3d.userData.sectionName === cfg.sectionName && obj3d.userData.type === cfg.type);

    this.secMarkerObj.remove(secMarkerObj3d);
    utils.disposeMesh(secMarkerObj3d.children[0]);

    this.ctrl.renderOnce();
  }

  removeSectionMarkers(filterFunction) {
    const secMarkerConfigsToRemove = [];

    this.secMarkerObj.children.forEach((child) => {
      if (filterFunction(child.userData)) secMarkerConfigsToRemove.push(child.userData);
    });

    secMarkerConfigsToRemove.forEach(secMarkerConfig => this.removeSecMarker(secMarkerConfig));

    this.ctrl.renderOnce();
  }

  hideSectionMarkers() {
    this.secMarkerObj.visible = false;
    this.ctrl.renderOnce();
  }

  showSectionMarkers() {
    this.secMarkerObj.visible = true;
    this.ctrl.renderOnce();
  }

  disposeSecMarkers() {
    this.scene.remove(this.secMarkerObj);
    this.secMarkerObj.traverse((child) => {
      if (child instanceof Mesh) utils.disposeMesh(child);
    });

    this.secMarkerObj = new Object3D();
    this.scene.add(this.secMarkerObj);
    this.ctrl.renderOnce();
  }

  setNeuronCloudPointSize(size) {
    this.neuronCloud.points.material.size = size;
    this.pickingNeuronCloud.material.size = size / SQUARE_DOT_SCALE;
    this.ctrl.renderOnce();
  }

  setMorphSynapseSize(size) {
    this.synapseCloud.points.material.size = size;
    this.ctrl.renderOnce();
  }

  downloadScreenshot() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      physicallyCorrectColors: true,
    });

    renderer.setSize(clientWidth * 3, clientHeight * 3);

    renderer.render(this.scene, this.camera);
    const circuitName = process.env.VUE_APP_CIRCUIT_NAME;
    const gidsStr = store.state.circuit.simAddedNeurons.map(n => n.gid).join('_');
    const timestamp = Date.now();
    const fileName = `${circuitName}__gids_${gidsStr}__${timestamp}.png`;
    renderer.domElement.toBlob(blob => saveAs(blob, fileName));
    renderer.dispose();
  }

  updateNeuronCloud() {
    this.neuronCloud.points.geometry.attributes.position.needsUpdate = true;
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;
    this.ctrl.renderOnce();
  }

  initEventHandlers() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    this.renderer.domElement.addEventListener('mousemove', throttle(this.onMouseMove.bind(this), 100), false);
    this.controls.addEventListener('change', this.ctrl.renderOnce.bind(this));
    window.addEventListener('resize', this.onResize.bind(this), false);
  }

  onMouseDown(e) {
    this.mousePressed = true;
    this.mouseNative.set(e.clientX, e.clientY);
  }

  onMouseUp(e) {
    this.mousePressed = false;
    if (e.clientX !== this.mouseNative.x || e.clientY !== this.mouseNative.y) return;

    const clickedMesh = this.getMeshByNativeCoordinates(e.clientX, e.clientY);
    if (!clickedMesh) return;

    this.onClickExternalHandler({
      type: clickedMesh.object.name,
      index: clickedMesh.index,
      data: clickedMesh.object.userData,
      clickPosition: {
        x: e.clientX,
        y: e.clientY,
      },
    });
  }

  onMouseMove(e) {
    this.ctrl.renderFor(2000);
    if (e.buttons) return;

    const mesh = this.getMeshByNativeCoordinates(e.clientX, e.clientY);

    if (
      mesh
      && this.hoveredMesh
      && mesh.object.uuid === this.hoveredMesh.object.uuid
      && this.hoveredMesh.index === mesh.index
    ) return;

    if (this.hoveredMesh) {
      this.onHoverEnd(this.hoveredMesh);
      this.hoveredMesh = null;
    }

    if (mesh) {
      this.onHover(mesh);
      this.hoveredMesh = mesh;
    }
  }

  onMouseWheel() {
    this.ctrl.renderFor(2000);
  }

  onControlChange() {
    this.ctrl.renderOnce();
  }

  onHover(mesh) {
    switch (mesh.object.name) {
    case 'neuronCloud': {
      this.onNeuronHover(mesh.index);
      break;
    }
    case 'morphSection': {
      this.onMorphSectionHover(mesh);
      break;
    }
    case 'synapseCloud': {
      this.onSynapseHover(mesh.index);
      break;
    }
    default: {
      break;
    }
    }
  }

  onHoverEnd(mesh) {
    switch (mesh.object.name) {
    case 'neuronCloud': {
      this.onNeuronHoverEnd(mesh.index);
      break;
    }
    case 'morphSection': {
      this.onMorphSectionHoverEnd(mesh);
      break;
    }
    case 'synapseCloud': {
      this.onSynapseHoverEnd(mesh.index);
      break;
    }
    default: {
      break;
    }
    }
  }

  onNeuronHover(neuronIndex) {
    this.onHoverExternalHandler({
      type: 'cloudNeuron',
      neuronIndex,
    });

    this.hoveredNeuron = [
      neuronIndex,
      this.neuronCloud.colorBufferAttr.getX(neuronIndex),
      this.neuronCloud.colorBufferAttr.getY(neuronIndex),
      this.neuronCloud.colorBufferAttr.getZ(neuronIndex),
    ];
    this.neuronCloud.colorBufferAttr.setXYZ(neuronIndex, ...HOVERED_NEURON_GL_COLOR);
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;

    this.ctrl.renderOnce();
  }

  onNeuronHoverEnd(neuronIndex) {
    this.onHoverEndExternalHandler({
      neuronIndex,
      type: 'cloudNeuron',
    });

    this.neuronCloud.colorBufferAttr.setXYZ(...this.hoveredNeuron);
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredNeuron = null;

    this.ctrl.renderOnce();
  }

  onSynapseHover(synapseIndex) {
    this.onHoverExternalHandler({
      synapseIndex,
      type: 'synapse',
    });

    this.hoveredSynapse = [
      synapseIndex,
      this.synapseCloud.colorBufferAttr.getX(synapseIndex),
      this.synapseCloud.colorBufferAttr.getY(synapseIndex),
      this.synapseCloud.colorBufferAttr.getZ(synapseIndex),
    ];
    this.synapseCloud.colorBufferAttr.setXYZ(synapseIndex, ...HOVERED_SYN_GL_COLOR);
    this.synapseCloud.points.geometry.attributes.color.needsUpdate = true;

    this.ctrl.renderOnce();
  }

  onSynapseHoverEnd(synapseIndex) {
    this.onHoverEndExternalHandler({
      synapseIndex,
      type: 'synapse',
    });

    this.synapseCloud.colorBufferAttr.setXYZ(...this.hoveredSynapse);
    this.synapseCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredSynapse = null;

    this.ctrl.renderOnce();
  }

  onMorphSectionHover(mesh) {
    const geometry = new EdgesGeometry(mesh.object.geometry);
    const material = new LineBasicMaterial({
      color: HOVER_BOX_COLOR,
      linewidth: 2,
    });
    this.hoverBox = new LineSegments(geometry, material);

    mesh.object.getWorldPosition(this.hoverBox.position);
    mesh.object.getWorldQuaternion(this.hoverBox.rotation);
    this.hoverBox.name = mesh.object.name;
    this.hoverBox.userData = Object.assign({ skipHoverDetection: true }, mesh.object.userData);
    this.scene.add(this.hoverBox);

    this.onHoverExternalHandler({
      type: 'morphSection',
      data: mesh.object.userData,
    });

    this.ctrl.renderOnce();
  }

  onMorphSectionHoverEnd(mesh) {
    this.scene.remove(this.hoverBox);
    utils.disposeMesh(this.hoverBox);
    this.hoverBox = null;

    this.onHoverEndExternalHandler({
      type: 'morphSection',
      data: mesh.object.userData,
    });

    this.ctrl.renderOnce();
  }

  highlightMorphCell(gid) {
    const materialsToShow = [];
    const materialsToHide = [];

    if (this.morphCellHighlightAnimation) this.morphCellHighlightAnimation.kill();

    // TODO: refactor to avoid repetitions
    this.cellMorphologyObj.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      if (child.userData.neuron.gid === gid) {
        materialsToShow.push(child.material);
      } else {
        materialsToHide.push(child.material);
      }
    });

    this.secMarkerObj.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      if (child.userData.gid === gid) {
        materialsToShow.push(child.material);
      } else {
        materialsToHide.push(child.material);
      }
    });

    if (this.synapseCloud) {
      materialsToHide.push(this.synapseCloud.points.material);
    }

    this.morphCellHighlightAnimation = new TimelineLite();
    this.morphCellHighlightAnimation
      .to(materialsToHide, 0.3, { opacity: 0.1 })
      .to(materialsToShow, 0.3, { opacity: 1 }, 0);

      this.ctrl.renderFor(1000);
  }

  unhighlightMorphCell() {
    if (this.morphCellHighlightAnimation) this.morphCellHighlightAnimation.kill();

    const materialsToShow = [];
    this.cellMorphologyObj.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      materialsToShow.push(child.material);
    });

    this.secMarkerObj.traverse((child) => {
      if (child instanceof Mesh) materialsToShow.push(child.material);
    });

    if (this.synapseCloud) {
      materialsToShow.push(this.synapseCloud.points.material);
    }

    this.morphCellHighlightAnimation = TweenLite.to(materialsToShow, 0.3, { opacity: 1 });

    this.ctrl.renderFor(500);
  }

  highlightCircuitSoma(gid) {
    if (this.neuronHighlightAnimation) this.neuronHighlightAnimation.kill();

    const neuronIndex = gid - 1;

    this.highlightedNeuron.material.color = new Color(
      // TODO: obtain color from store getter?
      this.neuronCloud.colorBufferAttr.getX(neuronIndex),
      this.neuronCloud.colorBufferAttr.getY(neuronIndex),
      this.neuronCloud.colorBufferAttr.getZ(neuronIndex),
    );

    const position = new Vector3(...store.$get('neuronPosition', neuronIndex));
    this.highlightedNeuron.geometry.vertices[0] = position;

    this.neuronHighlightAnimation = new TimelineLite();
    this.neuronHighlightAnimation
      .to(this.neuronCloud.points.material, 0.3, { size: 8, opacity: 0.3 })
      .to(this.highlightedNeuron.material, 0.3, { size: 48, opacity: 1 }, 0);

    this.neuronHighlightAnimation.eventCallback('onUpdate', () => {
      this.highlightedNeuron.geometry.verticesNeedUpdate = true;
      this.highlightedNeuron.geometry.colorsNeedUpdate = true;
    });

    this.ctrl.renderFor(1000);
  }

  removeCircuitSomaHighlight() {
    if (this.neuronHighlightAnimation) this.neuronHighlightAnimation.kill();

    const { somaSize } = store.state.circuit;

    this.neuronHighlightAnimation = new TimelineLite();
    this.neuronHighlightAnimation
      .to(this.neuronCloud.points.material, 0.3, { size: somaSize, opacity: 0.85 })
      .to(this.highlightedNeuron.material, 0.3, { size: 0, opacity: 0 }, 0);

    this.neuronHighlightAnimation.eventCallback('onUpdate', () => {
      this.highlightedNeuron.geometry.verticesNeedUpdate = true;
      this.highlightedNeuron.geometry.colorsNeedUpdate = true;
    });

    this.ctrl.renderFor(1000);
  }

  onResize() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);

    this.ctrl.renderOnce();
  }

  getMeshByNativeCoordinates(x, y) {
    this.mouseGl.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouseGl.y = -((y - HEADER_HEIGHT) / this.renderer.domElement.clientHeight) * 2 + 1;

    if (this.neuronCloud.points.visible) {
      // doing gpu picking for neuron cloud, otherwise - raycast
      this.camera.setViewOffset(
        this.renderer.domElement.width,
        this.renderer.domElement.height,
        x * window.devicePixelRatio,
        (y - HEADER_HEIGHT) * window.devicePixelRatio,
        1,
        1,
      );

      this.renderer.setRenderTarget(this.pickingTexture);
      this.renderer.render(this.pickingScene, this.camera);
      this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, 1, 1, this.pickingPixelBuffer);
      this.camera.clearViewOffset();

      /* eslint-disable-next-line */
      const id = (this.pickingPixelBuffer[0] << 16) | (this.pickingPixelBuffer[1] << 8) | (this.pickingPixelBuffer[2]);

      if (!id) return null;

      return {
        index: id - 1,
        object: this.neuronCloud.points,
      };
    }

    this.raycaster.setFromCamera(this.mouseGl, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    return intersections
      .find(mesh => !mesh.object.userData.skipHoverDetection && mesh.object.material.visible);
  }

  startRenderLoop() {
    if (this.ctrl.render) {
      this.controls.update();
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this.startRenderLoop.bind(this));
  }
}


export default NeuronRenderer;
