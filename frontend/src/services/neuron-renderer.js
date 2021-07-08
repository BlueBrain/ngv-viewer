
import throttle from 'lodash/throttle';
import get from 'lodash/get';
import difference from 'lodash/difference';
import pick from 'lodash/pick';

import {
  Color, TextureLoader, WebGLRenderer, Scene, Fog, AmbientLight, PointLight, Vector2,
  Raycaster, PerspectiveCamera, Object3D, BufferAttribute, BufferGeometry,
  PointsMaterial, DoubleSide, VertexColors, Geometry, Points, Vector3, MeshLambertMaterial,
  Mesh, LineSegments, LineBasicMaterial, EdgesGeometry,
  WebGLRenderTarget, Float32BufferAttribute, Box3, Plane, FrontSide,
} from 'three';

import { saveAs } from 'file-saver';
import { TweenLite, TimelineLite } from 'gsap';

import TrackballControls from '@/services/trackball-controls';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// TODO: refactor to remove store operations
// and move them to vue viewport component
import store from '@/store';
import utils from '@/tools/neuron-renderer-utils';
import config from '@/config';
import createMorph from '@/tools/morph-smoother';

import {
  Mesh as MeshType,
  ColorConvention,
  CurrentDetailedLevel,
  CounterIdText,
  NeuronParts,
} from '@/constants';

// used for the textures
const { baseUrl } = config;

const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 50000;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xfefdfb;
// TODO: make it possible to switch bg color
// const BACKGROUND_COLOR = 0x272821;
const HOVER_BOX_COLOR = 0xffdf00;
const HOVERED_NEURON_GL_COLOR = new Color(0xf26d21).toArray();
const HOVERED_SYN_GL_COLOR = new Color(0xf26d21).toArray();

const SQUARE_DOT_SCALE = 1.3;

// TODO: calculate in runtime
const HEADER_HEIGHT = 36;

const ALL_SEC_TYPES = [
  NeuronParts.SOMA,
  NeuronParts.AXON,
  NeuronParts.APIC,
  NeuronParts.DEND,
  'myelin',
];

const COLOR_DIFF_RANGE = 1;

const neuronTexture = new TextureLoader().load(`${baseUrl}/neuron-texture.png`);
const astrocyteTexture = new TextureLoader().load(`${baseUrl}/astrocyte.png`);

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
    this.renderer.localClippingEnabled = true;

    this.scene = new Scene();
    this.scene.background = new Color(BACKGROUND_COLOR);
    this.scene.fog = new Fog(FOG_COLOR, NEAR, FAR);
    this.scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR));

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
    this.mousePressed = false;

    this.cellMorphologyObj = new Object3D();
    this.scene.add(this.cellMorphologyObj);

    this.pointCloudMaterial = new PointsMaterial({
      vertexColors: true,
      size: store.state.circuit.somaSize,
      opacity: 0.85,
      transparent: true,
      alphaTest: 0.2,
      sizeAttenuation: true,
      map: neuronTexture,
    });

    this.pointAstrocyteCloudMaterial = this.pointCloudMaterial.clone();
    this.pointAstrocyteCloudMaterial.map = astrocyteTexture;

    this.onHoverExternalHandler = config.onHover;
    this.onHoverEndExternalHandler = config.onHoverEnd;
    this.onClickExternalHandler = config.onClick;

    this.initEventHandlers();
    this.startRenderLoop();

    // TODO: fetch this info from backend
    this.vasculatureBoundingBox = new Box3(
      new Vector3(-132.29698, 633.47186, 173.26953),
      new Vector3(822.297, 2085.0, 1026.7305),
    );
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

    // clip only neurons that are inside the vasculature / circuit bbox
    const planes = this.generateClippingPlanes(store.state.circuit.cells.meta.bbox);
    const newMat = this.pointCloudMaterial.clone();
    newMat.clippingPlanes = planes;

    this.neuronCloud.points = new Points(geometry, newMat);

    // TODO: measure performance improvement
    this.neuronCloud.points.matrixAutoUpdate = false;
    this.neuronCloud.points.updateMatrix();

    this.neuronCloud.points.name = 'neuronCloud';
    this.neuronCloud.points.frustumCulled = false;
    this.neuronCloud.points.visible = store.state.circuit.cells.visible;
  }

  destroyNeuronCloud() {
    if (!this.neuronCloud) return;

    this.scene.remove(this.neuronCloud.points);
    utils.disposeMesh(this.neuronCloud.points);
    this.neuronCloud = null;
    this.ctrl.renderOnce();
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

  showNeuronCloud() {
    const { cells } = store.state.circuit;
    cells.visible = true;
    this.neuronCloud.points.visible = cells.visible;
    this.scene.add(this.neuronCloud.points);
    this.ctrl.renderOnce();
  }

  hideNeuronCloud() {
    const { cells } = store.state.circuit;
    cells.visible = false;
    this.neuronCloud.points.visible = cells.visible;
    this.scene.remove(this.neuronCloud.points);
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

  // eslint-disable-next-line class-methods-use-this
  generateMorphology(morphObj) {
    const {
      cellObj3d,
      gid,
      secTypes = ALL_SEC_TYPES.filter(defaultSecRenderFilter),
      sections,
      addSecOperations,
      cellIndex = 0,
      gids = [gid],
      type,
    } = morphObj;

    const secTypesToAdd = difference(secTypes, cellObj3d.userData.secTypes);
    if (!secTypesToAdd.length) return;

    cellObj3d.userData.secTypes.push(...secTypesToAdd);

    let hoverInfo = {};
    if (type === MeshType.NEURONS) {
      const neuronIndex = gid - 1;
      const neuron = store.$get('neuron', neuronIndex);
      hoverInfo = neuron;
    }
    if (type === MeshType.ASTROCYTES) {
      const astrocyteIndex = gid - 1;
      const astrocyte = store.$get('astrocyte', astrocyteIndex);
      hoverInfo = astrocyte;
    }

    const colorDiff = (((2 * COLOR_DIFF_RANGE * cellIndex) / gids.length)) - COLOR_DIFF_RANGE;

    const materialMap = utils.generateSecMaterialMap(colorDiff);

    sections.forEach((section) => {
      const pts = section.points;

      const secMesh = section.type === 'soma'
        ? utils.createSomaMeshFromPoints(pts, materialMap[section.type].clone())
        : utils.createSecMeshFromPoints(pts, materialMap[section.type].clone());

      secMesh.name = 'morphSection';
      secMesh.userData = {
        hoverInfo,
        type: section.type,
        id: section.id,
        name: section.name,
      };

      cellObj3d.add(secMesh);
    });
    addSecOperations.push(Promise.resolve());
  }

  showMorphology() {
    const gids = store.state.circuit.cells.selectedMorphologies;

    const morphology = store.state.circuit.cells.morphologyData;

    gids.forEach((gid) => {
      const hoverInfo = { gid, isNeuron: true };
      this.cellMorphologyObj.add(createMorph(morphology[gid], hoverInfo));
    });
    this.cellMorphologyObj.visible = true;
    this.ctrl.renderOnce();
  }

  setNeuronCloudPointSize(size) {
    if (this.neuronCloud?.points?.material?.size) {
      this.neuronCloud.points.material.size = size;
    }
    if (this.astrocyteCloud?.points?.material?.size) {
      this.astrocyteCloud.points.material.size = size;
    }
    if (this.efferentNeuronsCloud?.points?.material?.size) {
      this.efferentNeuronsCloud.points.material.size = size;
    }
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
    case 'morph': {
      this.onMorphHover(mesh);
      break;
    }
    case 'astrocyteCloud': {
      this.onAstrocyteHover(mesh.index);
      break;
    }
    case 'efferentNeurons': {
      this.onEfferentNeuronHover(mesh.index);
      break;
    }
    case 'astrocyteSynapses': {
      this.onAstrocyteSynapseHover(mesh.index);
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
    case 'morph': {
      this.onMorphHoverEnd(mesh);
      break;
    }
    case 'astrocyteCloud': {
      this.onAstrocyteHoverEnd(mesh.index);
      break;
    }
    case 'efferentNeurons': {
      this.onEfferentNeuronHoverEnd(mesh.index);
      break;
    }
    case 'astrocyteSynapses': {
      this.onAstrocyteSynapseHoverEnd(mesh.index);
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

  onMorphHover(mesh) {
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
      type: 'morph',
      data: mesh.object.userData,
    });

    this.ctrl.renderOnce();
  }

  onMorphHoverEnd() {
    if (!this.hoverBox) return;
    this.scene.remove(this.hoverBox);
    utils.disposeMesh(this.hoverBox);
    this.hoverBox = null;

    this.ctrl.renderOnce();
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

  loadVasculature() {
    const fileUrl = store.state.circuitConfig.vasculatureGlbUrl;
    this.vasculatureCloud = {
      mesh: null,
    };

    const vasculatureColors = ColorConvention.extraPalette.VASCULATURE;

    const onLoad = (gltf) => {
      const newMat = new MeshLambertMaterial({
        color: vasculatureColors.color,
      });

      const [mesh] = gltf.scene.children;
      mesh.geometry.computeFaceNormals();
      mesh.geometry.computeVertexNormals();
      mesh.material = newMat;
      mesh.name = 'vasculature';
      mesh.visible = store.state.circuit.vasculature.visible;
      this.vasculatureCloud.mesh = mesh;
      store.$emit('vasculatureLoaded');
      console.log('Vasculature loaded');
    };

    const onProgress = () => {};

    const onError = (error) => { console.error(error); };

    const loader = new GLTFLoader();
    loader.load(fileUrl, onLoad, onProgress, onError);
  }

  showVasculatureCloud() {
    const { vasculature } = store.state.circuit;
    vasculature.visible = true;
    this.vasculatureCloud.mesh.visible = vasculature.visible;
    this.scene.add(this.vasculatureCloud.mesh);
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('VASCULATURE', true);
  }

  hideVasculatureCloud() {
    const { vasculature } = store.state.circuit;
    vasculature.visible = false;
    this.vasculatureCloud.mesh.visible = vasculature.visible;
    this.scene.remove(this.vasculatureCloud.mesh);
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('VASCULATURE', false);
  }

  onAstrocyteHover(raycastIndex) {
    const astrocyteIndex = store.state.circuit.astrocytes.raycastMapping[raycastIndex];
    this.onHoverExternalHandler({
      type: 'astrocyteCloud',
      astrocyteIndex,
    });

    this.hoveredAstrocyte = [
      raycastIndex,
      this.astrocyteCloud.colorBufferAttr.getX(raycastIndex),
      this.astrocyteCloud.colorBufferAttr.getY(raycastIndex),
      this.astrocyteCloud.colorBufferAttr.getZ(raycastIndex),
    ];
    this.astrocyteCloud.colorBufferAttr.setXYZ(raycastIndex, ...HOVERED_NEURON_GL_COLOR);
    this.astrocyteCloud.points.geometry.attributes.color.needsUpdate = true;

    this.ctrl.renderOnce();
  }

  onAstrocyteHoverEnd(astrocyteIndex) {
    this.onHoverEndExternalHandler({
      type: 'astrocyteCloud',
      astrocyteIndex,
    });

    this.astrocyteCloud.colorBufferAttr.setXYZ(...this.hoveredAstrocyte);
    this.astrocyteCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredAstrocyte = null;

    this.ctrl.renderOnce();
  }

  showAstrocyteCloud() {
    const { astrocytes } = store.state.circuit;
    astrocytes.visible = true;
    this.astrocyteCloud.points.visible = astrocytes.visible;
    this.ctrl.renderOnce();
  }

  hideAstrocyteCloud() {
    const { astrocytes } = store.state.circuit;
    astrocytes.visible = false;
    this.astrocyteCloud.points.visible = astrocytes.visible;
    this.ctrl.renderOnce();
  }

  loadAstrocytesSomas(astrocyteSomasObj) {
    const {
      positions: somaPositionArray,
      layers,
    } = astrocyteSomasObj || store.state.circuit.astrocytes;
    const { visible } = store.state.circuit.astrocytes;
    const { filterLayers } = store.state.circuit;

    store.state.currentDetailedLevel = CurrentDetailedLevel.ASTROCYTES;

    const colorPalette = store.state.circuit.color.palette;
    const newPositions = [];
    const newLayerColors = [];
    // Raycast show added id that is different to the real one.
    let raycastIndex = 0;
    const raycastMapping = {};
    somaPositionArray.forEach((position, index) => {
      const layerNumber = layers[index];
      if (filterLayers?.length && !filterLayers.includes(String(layerNumber))) return;

      newPositions.push(position);
      // remove the transparency argument
      const [r, g, b] = colorPalette[layerNumber];
      newLayerColors.push([r, g, b]);
      raycastMapping[raycastIndex] = index;
      raycastIndex += 1;
    });

    store.state.circuit.astrocytes.filterLayers = filterLayers;
    store.state.circuit.astrocytes.raycastMapping = raycastMapping;
    store.state.circuit.astrocytes.astrocyteSomasObj = astrocyteSomasObj;

    const positions = new Float32Array(newPositions.flat());
    const colorBuffer = new Float32Array(newLayerColors.flat());

    this.astrocyteCloud = {
      positionBufferAttr: new BufferAttribute(positions, 3),
      colorBufferAttr: new BufferAttribute(colorBuffer, 3),
    };

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.astrocyteCloud.positionBufferAttr);
    geometry.setAttribute('color', this.astrocyteCloud.colorBufferAttr);

    this.astrocyteCloud.points = new Points(geometry, this.pointAstrocyteCloudMaterial);

    this.astrocyteCloud.points.name = 'astrocyteCloud';
    this.astrocyteCloud.points.frustumCulled = false;
    this.astrocyteCloud.points.visible = store.state.circuit.astrocytes.visible;
    this.scene.add(this.astrocyteCloud.points);
    this.ctrl.renderOnce();

    store.$emit('updateClipboardIds', {
      name: CounterIdText.ASTROCYTES,
      data: newPositions,
    });
    store.$emit('detailedLevelChanged');
  }

  destroyAstrocytesCloud() {
    if (!this.astrocyteCloud?.points) return;

    this.scene.remove(this.astrocyteCloud.points);
    this.astrocyteCloud = null;
    this.ctrl.renderOnce();
  }

  // eslint-disable-next-line class-methods-use-this
  getNeuronColors(neurons) {
    const colorPalette = store.state.circuit.color.palette;
    return neurons.map((neuron) => {
      // remove the transparency argument
      const [r, g, b] = colorPalette[neuron.layer];
      return [r, g, b];
    });
  }

  createEfferentNeurons(efferentNeuronIds) {
    this.hideNeuronCloud();
    this.hideAstrocyteCloud();
    store.state.currentDetailedLevel = CurrentDetailedLevel.EFFERENTS;
    store.state.circuit.efferentNeurons.allIds = efferentNeuronIds;

    const effNeuronInsideVascIds = [];
    const effNeuronInsideVascPositions = [];
    const effNeuronInsideVascDetails = [];

    // raycast shows different index than the neuron
    let raycastIndex = 0;
    const raycastMapping = {};
    efferentNeuronIds.forEach((id) => {
      const neuronPosition = store.$get('neuronPosition', id);
      const tempV = new Vector3(neuronPosition[0], neuronPosition[1], neuronPosition[2]);
      const isInsideVasc = this.vasculatureBoundingBox.containsPoint(tempV);

      if (!isInsideVasc) return;

      effNeuronInsideVascIds.push(id);
      effNeuronInsideVascPositions.push(...neuronPosition);
      effNeuronInsideVascDetails.push(store.$get('neuron', id));
      raycastMapping[raycastIndex] = id;
      raycastIndex += 1;
    });

    const effNeuronInsideVascColors = this.getNeuronColors(effNeuronInsideVascDetails).flat();

    this.efferentNeuronsCloud = {
      positionBufferAttr: new Float32BufferAttribute(effNeuronInsideVascPositions, 3),
      colorBufferAttr: new Float32BufferAttribute(effNeuronInsideVascColors, 3),
    };

    const effNeuronGeometry = new BufferGeometry();
    effNeuronGeometry.setAttribute('position', this.efferentNeuronsCloud.positionBufferAttr);
    effNeuronGeometry.setAttribute('color', this.efferentNeuronsCloud.colorBufferAttr);
    effNeuronGeometry.computeBoundingBox();

    const effNeuronMaterial = this.pointCloudMaterial.clone();
    effNeuronMaterial.size = store.state.circuit.somaSize;

    this.efferentNeuronsCloud.points = new Points(effNeuronGeometry, effNeuronMaterial);
    this.efferentNeuronsCloud.points.name = 'efferentNeurons';
    this.efferentNeuronsCloud.points.visible = true;
    store.state.circuit.efferentNeurons.raycastMapping = raycastMapping;

    this.scene.add(this.efferentNeuronsCloud.points);
    this.ctrl.renderOnce();

    store.$emit('updateClipboardIds', {
      name: CounterIdText.EFFERENTS,
      data: efferentNeuronIds,
    });
    store.$emit('detailedLevelChanged');

    store.state.circuit.boundingVasculature.boundingBox = effNeuronGeometry.boundingBox;
    store.$dispatch('createBoundingVasculature');
  }

  destroyEfferentNeuronsCloud() {
    if (!this.efferentNeuronsCloud) return;

    this.scene.remove(this.efferentNeuronsCloud.points);
    this.efferentNeuronsCloud = null;
    this.ctrl.renderOnce();
  }

  showEfferentNeuronsCloud() {
    const { efferentNeurons } = store.state.circuit;
    efferentNeurons.visible = true;
    this.efferentNeuronsCloud.points.visible = efferentNeurons.visible;
    this.ctrl.renderOnce();
  }

  hideEfferentNeuronsCloud() {
    const { efferentNeurons } = store.state.circuit;
    efferentNeurons.visible = false;
    this.efferentNeuronsCloud.points.visible = efferentNeurons.visible;
    this.ctrl.renderOnce();
  }

  onEfferentNeuronHover(raycastIndex) {
    const neuronIndex = store.state.circuit.efferentNeurons.raycastMapping[raycastIndex];
    this.onHoverExternalHandler({
      type: 'efferentNeuronCloud',
      neuronIndex,
      raycastIndex,
    });

    this.hoveredNeuron = [
      raycastIndex,
      this.efferentNeuronsCloud.colorBufferAttr.getX(raycastIndex),
      this.efferentNeuronsCloud.colorBufferAttr.getY(raycastIndex),
      this.efferentNeuronsCloud.colorBufferAttr.getZ(raycastIndex),
    ];
    this.efferentNeuronsCloud.colorBufferAttr.setXYZ(raycastIndex, ...HOVERED_NEURON_GL_COLOR);
    this.efferentNeuronsCloud.points.geometry.attributes.color.needsUpdate = true;

    this.ctrl.renderOnce();
  }

  onEfferentNeuronHoverEnd(raycastIndex) {
    this.onHoverEndExternalHandler({
      raycastIndex,
      type: 'efferentNeuronCloud',
    });

    this.efferentNeuronsCloud.colorBufferAttr.setXYZ(...this.hoveredNeuron);
    this.efferentNeuronsCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredNeuron = null;

    this.ctrl.renderOnce();
  }

  showAstrocyteMorphology(morphObj) {
    const gid = store.state.circuit.astrocytes.selectedWithClick;
    const hoverInfo = { gid, isNeuron: false };
    this.astrocyteMorphologyObj = createMorph(morphObj, hoverInfo);

    if (morphObj.position.length === 3) {
      this.astrocyteMorphologyObj.position.set(
        morphObj.position[0], morphObj.position[1], morphObj.position[2],
      );
    }

    this.astrocyteMorphologyObj.visible = true;
    this.scene.add(this.astrocyteMorphologyObj);

    // center to astrocyte soma
    const position = get(this, 'astrocyteMorphologyObj.position');
    this.controls.target.copy(new Vector3(position.x, position.y, position.z));

    this.ctrl.renderOnce();
  }

  destroyAstrocyteMorphology() {
    if (!this.astrocyteMorphologyObj) return;

    this.scene.remove(this.astrocyteMorphologyObj);
    this.astrocyteMorphologyObj = null;
    this.ctrl.renderOnce();
  }

  createAstrocyteMicrodomain(microdomainObj) {
    // microdomainObj = { 'indexes': [[]], 'vertices': [[]] }
    const microdomainGeometry = new BufferGeometry();
    microdomainGeometry.setIndex(microdomainObj.indexes.flat());
    const vertices = new Float32BufferAttribute(microdomainObj.vertices.flat(), 3);
    microdomainGeometry.setAttribute('position', vertices);
    const material = new MeshLambertMaterial({
      color: ColorConvention.extraPalette.MICRODOMAIN.color,
      transparent: true,
      opacity: store.state.circuit.microdomain.opacity / 100,
      side: DoubleSide,
    });
    microdomainGeometry.computeVertexNormals();
    microdomainGeometry.computeFaceNormals();
    this.astrocyteMicrodomain = {};
    this.astrocyteMicrodomain.mesh = new Mesh(microdomainGeometry, material);
    this.astrocyteMicrodomain.mesh.renderOrder = 1;
    this.astrocyteMicrodomain.mesh.name = 'microdomain';
    this.astrocyteMicrodomain.mesh.visible = store.state.circuit.microdomain.visible;
    this.scene.add(this.astrocyteMicrodomain.mesh);
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('MICRODOMAIN', true);
  }

  changeMicrodomainOpacity() {
    if (!this.astrocyteMicrodomain?.mesh) return;

    const { microdomain } = store.state.circuit;
    microdomain.visible = microdomain.opacity !== 0;

    const { material } = this.astrocyteMicrodomain.mesh;
    material.opacity = microdomain.opacity / 100;
    this.astrocyteMicrodomain.mesh.visible = microdomain.visible;
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('MICRODOMAIN', microdomain.visible);
  }

  destroyAstrocyteMicrodomain() {
    if (!this.astrocyteMicrodomain) return;

    this.scene.remove(this.astrocyteMicrodomain.mesh);
    this.astrocyteMicrodomain = null;
    this.toggleExtraColorPaletteLabels('MICRODOMAIN', false);
    this.ctrl.renderOnce();
  }

  // eslint-disable-next-line class-methods-use-this
  toggleExtraColorPaletteLabels(keyType, newVal) {
    if (!keyType) {
      console.warn('Cannot change extra color palette labels');
      return;
    }
    ColorConvention.extraPalette[keyType].visible = newVal;
    store.$emit('updateExtraColorPalette');
  }

  // eslint-disable-next-line class-methods-use-this
  generateClippingPlanes(boundingBox) {
    return [
      new Plane(new Vector3(1, 0, 0), -boundingBox.min.x),
      new Plane(new Vector3(0, 1, 0), -boundingBox.min.y),
      new Plane(new Vector3(0, 0, 1), -boundingBox.min.z),
      new Plane(new Vector3(-1, 0, 0), boundingBox.max.x),
      new Plane(new Vector3(0, -1, 0), boundingBox.max.y),
      new Plane(new Vector3(0, 0, -1), boundingBox.max.z),
    ];
  }

  createBoundingVasculature() {
    const { boundingBox } = store.state.circuit.boundingVasculature;
    // Generate cutting planes based on efferent neurons bounderies
    if (!this.vasculatureCloud?.mesh?.geometry?.index) {
      console.warn('Vasculature not available');
      return;
    }
    const planes = this.generateClippingPlanes(boundingBox);

    const loadedVasculature = this.vasculatureCloud.mesh;
    this.boundingVasculature = {};
    const newGeom = new BufferGeometry();
    newGeom.setIndex(loadedVasculature.geometry.index);
    newGeom.setAttribute('position', loadedVasculature.geometry.attributes.position);
    newGeom.computeFaceNormals();
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();

    const newMat = loadedVasculature.material.clone();
    newMat.clippingPlanes = planes;
    newMat.depthTest = true;
    newMat.depthWrite = true;
    newMat.transparent = true;
    newMat.opacity = store.state.circuit.boundingVasculature.opacity / 100;
    newMat.side = FrontSide;

    this.boundingVasculature.mesh = new Mesh(newGeom, newMat);
    this.boundingVasculature.mesh.scale.set(
      loadedVasculature.scale.x,
      loadedVasculature.scale.y,
      loadedVasculature.scale.z,
    );
    this.boundingVasculature.mesh.position.set(
      loadedVasculature.position.x,
      loadedVasculature.position.y,
      loadedVasculature.position.z,
    );
    this.boundingVasculature.mesh.name = 'boundingVasculature';
    this.boundingVasculature.mesh.renderOrder = 2;
    this.renderer.localClippingEnabled = true;

    this.boundingVasculature.mesh.visible = store.state.circuit.boundingVasculature.visible;
    store.state.circuit.boundingVasculature.mesh = this.boundingVasculature.mesh;
  }

  destroyBoundingVasculature() {
    if (!this.boundingVasculature) return;

    this.scene.remove(this.boundingVasculature.mesh);
    this.toggleExtraColorPaletteLabels('VASCULATURE', false);
    this.boundingVasculature = null;
    this.ctrl.renderOnce();
  }

  changeBoundingVasculatureOpacity() {
    const { boundingVasculature } = store.state.circuit;
    if (boundingVasculature.opacity === 0) {
      this.destroyBoundingVasculature();
      return;
    }

    if (!this.boundingVasculature?.mesh) {
      this.createBoundingVasculature();
      this.scene.add(this.boundingVasculature.mesh);
    }

    const vasculatureInScene = this.scene.children.filter(c => c.name === 'boundingVasculature');
    if (!vasculatureInScene.length) {
      this.scene.add(this.boundingVasculature.mesh);
    }

    boundingVasculature.visible = boundingVasculature.opacity !== 0;
    const { material } = this.boundingVasculature.mesh;
    material.opacity = boundingVasculature.opacity / 100;
    this.boundingVasculature.mesh.visible = boundingVasculature.visible;
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('VASCULATURE', true);
  }

  getSelectedEfferentNeuron3DObject() {
    this.hideEfferentNeuronsCloud();
    // add efferent neuron soma
    const efferentNeuronSelectedId = store.state.circuit.efferentNeurons.selectedWithClick;
    const efferentNeuron = store.$get('neuron', efferentNeuronSelectedId);
    const efferentNeuronPosition = store.$get('neuronPosition', efferentNeuronSelectedId);

    const efferentNeuronGeometry = new BufferGeometry();
    efferentNeuronGeometry.setAttribute('position', new Float32BufferAttribute(efferentNeuronPosition.flat(), 3));
    const effNeuronColor = this.getNeuronColors([efferentNeuron]).flat();
    efferentNeuronGeometry.setAttribute('color', new Float32BufferAttribute(effNeuronColor, 3));

    const efferentCloudMaterial = this.pointCloudMaterial.clone();

    const efferentSomaCloud = new Points(efferentNeuronGeometry, efferentCloudMaterial);
    return efferentSomaCloud;
  }

  showSynapseLocations(synapses) {
    // raycast shows different index than the neuron
    store.state.circuit.astrocyteSynapses.raycastMapping = { ...synapses.ids };
    store.state.currentDetailedLevel = CurrentDetailedLevel.SYNAPSES;

    const synapseLocations = synapses.locations;
    const synapsePoints = synapseLocations.flat();

    const synColor = new Color(ColorConvention.extraPalette.SYNAPSES.color);
    const synapseColor = synapseLocations.map(() => [synColor.r, synColor.g, synColor.b]).flat();
    ColorConvention.extraPalette.SYNAPSES.visible = true;

    this.astrocyteSynapsesCloud = {
      positionBufferAttr: new Float32BufferAttribute(synapsePoints, 3),
      colorBufferAttr: new Float32BufferAttribute(synapseColor, 3),
    };
    const astrocyteSynapseGeometry = new BufferGeometry();
    astrocyteSynapseGeometry.setAttribute('position', this.astrocyteSynapsesCloud.positionBufferAttr);
    astrocyteSynapseGeometry.setAttribute('color', this.astrocyteSynapsesCloud.colorBufferAttr);

    this.astrocyteSynapsesCloud.points = new Points(astrocyteSynapseGeometry, this.pointCloudMaterial.clone());
    this.astrocyteSynapsesCloud.points.name = 'astrocyteSynapses';

    this.efferentNeuronSelected = this.getSelectedEfferentNeuron3DObject();

    this.scene.add(this.astrocyteSynapsesCloud.points);
    this.scene.add(this.efferentNeuronSelected);
    this.ctrl.renderOnce();

    store.$emit('updateClipboardIds', {
      name: CounterIdText.SYNAPSES,
      data: synapses.ids,
    });
    store.$emit('detailedLevelChanged');
    this.toggleExtraColorPaletteLabels('SYNAPSES', true);
  }

  destroySynapseLocations() {
    if (!this.astrocyteSynapsesCloud) return;

    this.scene.remove(this.astrocyteSynapsesCloud.points);
    this.scene.remove(this.efferentNeuronSelected);
    this.astrocyteSynapsesCloud = null;
    this.efferentNeuronSelected = null;
    this.ctrl.renderOnce();
    this.toggleExtraColorPaletteLabels('SYNAPSES', false);
  }

  onAstrocyteSynapseHover(raycastIndex) {
    const astrocyteSynapseIndex = store.state.circuit.astrocyteSynapses.raycastMapping[raycastIndex];
    this.onHoverExternalHandler({
      astrocyteSynapseIndex,
      type: 'astrocyteSynapse',
    });

    this.hoveredSynapse = [
      raycastIndex,
      this.astrocyteSynapsesCloud.colorBufferAttr.getX(raycastIndex),
      this.astrocyteSynapsesCloud.colorBufferAttr.getY(raycastIndex),
      this.astrocyteSynapsesCloud.colorBufferAttr.getZ(raycastIndex),
    ];
    this.astrocyteSynapsesCloud.colorBufferAttr.setXYZ(raycastIndex, ...HOVERED_SYN_GL_COLOR);
    this.astrocyteSynapsesCloud.points.geometry.attributes.color.needsUpdate = true;

    this.ctrl.renderOnce();
  }

  onAstrocyteSynapseHoverEnd(raycastIndex) {
    const astrocyteSynapseIndex = store.state.circuit.astrocyteSynapses.raycastMapping[raycastIndex];
    this.onHoverEndExternalHandler({
      astrocyteSynapseIndex,
      type: 'astrocyteSynapse',
    });

    this.astrocyteSynapsesCloud.colorBufferAttr.setXYZ(...this.hoveredSynapse);
    this.astrocyteSynapsesCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredSynapse = null;

    this.ctrl.renderOnce();
  }

  onZoomChanged(level) {
    store.$dispatch('setSomaSize', level * 10);
    this.camera.zoom = level;
    this.camera.updateProjectionMatrix();
    this.ctrl.renderOnce();
  }
}

export default NeuronRenderer;
