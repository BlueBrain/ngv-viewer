
<template>
  <div id="container">
    <canvas
      :class="{'cursor-crosshair': selectionMode}"
      :id="canvasId"
    />
    <morph-section-poptip/>
    <bottom-panel/>
  </div>
</template>


<script>
  import store from '@/store';
  import NeuronRenderer from '@/services/neuron-renderer';
  import BottomPanel from './viewport/bottom-panel.vue';
  import MorphSectionPoptip from './viewport/morph-section-poptip.vue';

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
      'morph-section-poptip': MorphSectionPoptip,
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
      store.$on('setSynapseSize', size => this.renderer.setMorphSynapseSize(size));
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
      store.$on('initSynapseCloud', cloudSize => this.renderer.initSynapseCloud(cloudSize));
      store.$on('updateSynapses', () => this.renderer.updateSynapses());

      store.$on('setSelectionMode', (selectionMode) => { this.selectionMode = selectionMode; });

      store.$on('centerCellMorph', section => this.renderer.centerCellMorph(section.neuron.gid));

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
    },
    methods: {
      onHover(obj) {
        switch (obj.type) {
        case 'cloudNeuron': {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('neuronHovered', neuron);
          break;
        }
        case 'synapse': {
          store.$dispatch('synapseHovered', obj.synapseIndex);
          break;
        }
        case 'morphSection': {
          store.$dispatch('morphSectionHovered', obj);
          break;
        }
        default: {
          break;
        }
        }
      },
      onHoverEnd(obj) {
        switch (obj.type) {
        case 'cloudNeuron': {
          const neuron = store.$get('neuron', obj.neuronIndex);
          store.$dispatch('neuronHoverEnded', neuron);
          break;
        }
        case 'synapse': {
          store.$dispatch('synapseHoverEnded', obj.synapseIndex);
          break;
        }
        case 'morphSection': {
          store.$dispatch('morphSectionHoverEnded', obj);
          break;
        }
        default: {
          break;
        }
        }
      },
      onClick(obj) {
        switch (obj.type) {
        case 'neuronCloud': {
          const neuron = store.$get('neuron', obj.index);
          store.$dispatch('neuronClicked', neuron);
          break;
        }
        case 'morphSection': {
          store.$dispatch('morphSectionClicked', obj);
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
        const { cells } = store.state.circuit;

        const { positionBufferAttr, colorBufferAttr } = this.renderer.neuronCloud;

        for (let neuronIdx = 0; neuronIdx < cells.meta.count; neuronIdx += 1) {
          if (!globalFilterIndex[neuronIdx] || !connectionFilterIndex[neuronIdx]) {
            // FIXME: switch to opacity attribute
            positionBufferAttr.setXYZ(neuronIdx, 10000, 10000, 10000);
          } else {
            const neuronPosition = store.$get('neuronPosition', neuronIdx);

            const propIndex = cells.prop[neuronProp].index[neuronIdx];
            const propValue = cells.prop[neuronProp].values[propIndex];
            const glColor = palette[propValue];

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
    width: calc(100% - 620px);
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
