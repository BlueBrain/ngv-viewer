
<template>
  <div id="container">
    <go-back-ctrl/>
    <page-helper-title/>
    <canvas
      :class="{'cursor-crosshair': selectionMode}"
      :id="canvasId"
    />
    <morph-section-poptip/>
    <bottom-panel/>
    <right-panel/>
  </div>
</template>


<script>
  import store from '@/store';
  import NeuronRenderer from '@/services/neuron-renderer';
  import { Mesh as MeshType } from '@/constants';
  import BottomPanel from './viewport/bottom-panel.vue';
  import GoBackCtrl from './viewport/go-back-ctrl.vue';
  import MorphSectionPoptip from './viewport/morph-poptip.vue';
  import RightPanel from './viewport/right-panel.vue';
  import PageHelperTitle from './viewport/page-helper-title.vue';

  export default {
    name: 'viewport-component',
    data() {
      return {
        canvasId: 'canvas',
        selectionMode: false,
      };
    },
    components: {
      'bottom-panel': BottomPanel,
      'go-back-ctrl': GoBackCtrl,
      'morph-section-poptip': MorphSectionPoptip,
      'right-panel': RightPanel,
      'page-helper-title': PageHelperTitle,
    },
    mounted() {
      const canvas = document.getElementById(this.canvasId);
      this.renderer = new NeuronRenderer(canvas, {
        onHover: this.onHover.bind(this),
        onHoverEnd: this.onHoverEnd.bind(this),
        onClick: this.onClick.bind(this),
      });
      // TODO: refactor
      store.$on('circuitLoaded', this.initRenderer.bind(this));
      store.$on('setSomaSize', size => this.renderer.setNeuronCloudPointSize(size));
      store.$on('redrawCircuit', this.redrawNeurons.bind(this));
      store.$on('showCellMorphology', () => this.renderer.showMorphology());
      store.$on('showSectionMarkers', () => this.renderer.showSectionMarkers());
      store.$on('removeSectionMarkers', filterFunction => this.renderer.removeSectionMarkers(filterFunction));
      store.$on('removeCellMorphologies', filterFunction => this.renderer.removeCellMorphologies(filterFunction));
      store.$on('downloadScreenshot', () => this.renderer.downloadScreenshot());
      store.$on('removeCellMorphology', () => {
        this.renderer.hideCellMorphology();
        this.renderer.hideSectionMarkers();
        this.renderer.destroySynapseCloud();
      });
      store.$on('updateSynapses', () => this.renderer.updateSynapses());

      store.$on('setSelectionMode', (selectionMode) => { this.selectionMode = selectionMode; });

      store.$on('hideCircuit', () => this.renderer.hideNeuronCloud());
      store.$on('showCircuit', () => this.renderer.showNeuronCloud());

      store.$on('resetCameraUp', () => this.renderer.resetCameraUp());

      store.$on('showAxons', () => this.renderer.showAxons());
      store.$on('hideAxons', () => this.renderer.hideAxons());

      store.$on('highlightMorphCell', gid => this.renderer.highlightMorphCell(gid));
      store.$on('unhighlightMorphCell', () => this.renderer.unhighlightMorphCell());

      store.$on('highlightCircuitSoma', gid => this.renderer.highlightCircuitSoma(gid));
      store.$on('removeCircuitSomaHighlight', () => this.renderer.removeCircuitSomaHighlight());

      store.$on('addSecMarker', config => this.renderer.addSecMarker(config));
      store.$on('removeSecMarker', config => this.renderer.removeSecMarker(config));

      store.$on('clearScene', () => this.renderer.clearScene());

      store.$on('loadVasculature', () => this.renderer.loadVasculature());
      store.$on('showVasculature', () => this.renderer.showVasculatureCloud());
      store.$on('hideVasculature', () => this.renderer.hideVasculatureCloud());
      store.$on('createBoundingVasculature', boundingBox => this.renderer.createBoundingVasculature(boundingBox));
      store.$on('destroyBoundingVasculature', () => this.renderer.destroyBoundingVasculature());
      store.$on('changeBoundingVasculatureOpacity', () => this.renderer.changeBoundingVasculatureOpacity());

      store.$on('loadAstrocytesSomas', somasObj => this.renderer.loadAstrocytesSomas(somasObj));
      store.$on('destroyAstrocytesCloud', () => this.renderer.destroyAstrocytesCloud());
      store.$on('showAstrocytes', () => this.renderer.showAstrocyteCloud());
      store.$on('hideAstrocytes', () => this.renderer.hideAstrocyteCloud());

      store.$on('createEfferentNeurons', neuronIds => this.renderer.createEfferentNeurons(neuronIds));
      store.$on('showEfferentNeuronsCloud', () => this.renderer.showEfferentNeuronsCloud());
      store.$on('hideEfferentNeuronsCloud', () => this.renderer.hideEfferentNeuronsCloud());
      store.$on('destroyEfferentNeuronsCloud', () => this.renderer.destroyEfferentNeuronsCloud());

      store.$on('showAstrocyteMorphology', morphObj => this.renderer.showAstrocyteMorphology(morphObj));
      store.$on('showAstrocyteSynapses', synapseLocations => this.renderer.showSynapseLocations(synapseLocations));
      store.$on('destroySynapseLocations', () => this.renderer.destroySynapseLocations());
      store.$on('destroyAstrocyteMorphology', () => this.renderer.destroyAstrocyteMorphology());
      store.$on('onMorphHoverEnd', () => this.renderer.onMorphHoverEnd());

      store.$on('createAstrocyteMicrodomain', microdomainObj => this.renderer.createAstrocyteMicrodomain(microdomainObj));
      store.$on('destroyAstrocyteMicrodomain', () => this.renderer.destroyAstrocyteMicrodomain());
      store.$on('changeMicrodomainOpacity', () => this.renderer.changeMicrodomainOpacity());

      store.$on('onZoomChanged', newValue => this.renderer.onZoomChanged(newValue));
    },
    methods: {
      onHover(obj) {
        switch (obj.type) {
        case MeshType.NEURONS: {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('neuronHovered', neuron);
          break;
        }
        case MeshType.MORPHOLOGY: {
          store.$dispatch('morphHovered', obj);
          break;
        }
        case MeshType.ASTROCYTES: {
          const astrocyte = store.$get('astrocyte', obj.astrocyteIndex);
          store.$dispatch('astrocyteHovered', astrocyte);
          break;
        }
        case MeshType.EFFERENTS: {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('efferentNeuronHovered', neuron);
          break;
        }
        case MeshType.SYNAPSES: {
          store.$dispatch('astrocyteSynapseHovered', obj.astrocyteSynapseIndex);
          break;
        }
        default: {
          break;
        }
        }
      },
      onHoverEnd(obj) {
        switch (obj.type) {
        case MeshType.NEURONS: {
          store.$dispatch('neuronHoverEnded');
          break;
        }
        case MeshType.MORPHOLOGY: {
          store.$dispatch('morphHoverEnded');
          break;
        }
        case MeshType.ASTROCYTES: {
          store.$dispatch('astrocyteHoveredEnded');
          break;
        }
        case MeshType.EFFERENTS: {
          store.$dispatch('efferentNeuronHoveredEnded');
          break;
        }
        case MeshType.SYNAPSES: {
          store.$dispatch('astrocyteSynapseHoveredEnded');
          break;
        }
        default: {
          break;
        }
        }
      },
      onClick(obj) {
        switch (obj.type) {
        case MeshType.NEURONS: {
          const neuron = store.$get('neuron', obj.index);
          store.$dispatch('neuronClicked', neuron);
          break;
        }
        case MeshType.MORPHOLOGY: {
          store.$dispatch('morphClicked', obj);
          break;
        }
        case MeshType.ASTROCYTES: {
          const astrocyte = store.$get('astrocyte', obj.index);
          store.$dispatch('astrocyteClicked', astrocyte);
          break;
        }
        case MeshType.EFFERENTS: {
          store.$dispatch('efferentNeuronClicked', obj.index);
          break;
        }
        default: {
          break;
        }
        }
      },
      initRenderer() {
        const neuronSetSize = store.state.circuit.cells.meta.count;
        this.renderer.initNeuronCloud(neuronSetSize);
        this.redrawNeurons();
        this.renderer.alignCamera();
      },
      redrawNeurons() {
        const {
          globalFilterIndex,
          connectionFilterIndex,
          color: {
            palette,
            neuronProp,
          },
        } = store.state.circuit;
        const { cells, filterLayers } = store.state.circuit;

        const { positionBufferAttr, colorBufferAttr } = this.renderer.neuronCloud;

        for (let neuronIdx = 0; neuronIdx < cells.meta.count; neuronIdx += 1) {
          if (!globalFilterIndex[neuronIdx] || !connectionFilterIndex[neuronIdx]) {
            // FIXME: switch to opacity attribute
            positionBufferAttr.setXYZ(neuronIdx, 10000, 10000, 10000);
          } else {
            const propIndex = cells.prop[neuronProp].index[neuronIdx];
            const neuronLayer = cells.prop[neuronProp].values[propIndex];
            // this two elements will filter the layer.
            let color = null;
            let hiddenPosition = null;
            if (filterLayers?.length && !filterLayers.includes(String(neuronLayer))) {
              color = [1, 1, 1, 1];
              hiddenPosition = [-10000, -10000, -10000];
            }
            const neuronPosition = hiddenPosition || store.$get('neuronPosition', neuronIdx);
            const glColor = color || palette[neuronLayer];
            positionBufferAttr.setXYZ(neuronIdx, ...neuronPosition);
            colorBufferAttr.setXYZ(neuronIdx, ...glColor);
          }
        }

        this.renderer.updateNeuronCloud();
      },
    },
  };
</script>


<style scoped lang="scss">
  #container {
    position: absolute;
    top: 36px;
    width: calc(100% - 2px);
    height: calc(100% - 36px);
  }

  .cursor-crosshair {
    cursor: crosshair;
  }

  .bottom-panel-ctrl {
    height: 232px;
    position: relative;

    .color-by-ctrl {
      position: absolute;
      z-index: 10;
      right: 51px;
      bottom: 12px;
      height: 40px;
      width: 220px;
      background-color: white;
      border: 1px solid #dddee1;
      border-right: none;
    }
  }
</style>
