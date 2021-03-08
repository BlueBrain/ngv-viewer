
<template>
  <div class="bottom-panel-container">

    <div class="relative">
      <hover-object-info class="hover-object-info-container" />
    </div>

    <div class="screenshot-ctrl ctrl-background">
      <screenshot-ctrl />
    </div>

    <transition name="fade">
      <div class="circuit-panel" v-if="mode === 'cellSelection'">
        <color-palette />

        <div class="meshes-toggle ctrl-background">
          <meshes-toggle-ctrl />
        </div>
        <div class="clipboard-ids ctrl-background">
          <clipboard-ids />
        </div>
        <div class="counter-ids ctrl-background">
          <counter-ids />
        </div>
        <div class="layers-toggle ctrl-background">
          <layers-toggle-ctrl />
        </div>
      </div>
      <div class="sim-panel" v-else-if="mode === 'simulationConfig'">
        <syn-color-palette/>
        <div class="axon-visibility-ctrl">
          <axon-visibility-ctrl />
        </div>
        <div class="section-alignment-ctrl">
          <section-alignment-ctrl/>
        </div>
        <div class="synapse-size-ctrl">
          <synapse-size-ctrl />
        </div>
      </div>
    </transition>

  </div>
</template>


<script>
  import store from '@/store';

  // Cell selection components
  import ColorPalette from './bottom-panel/color-palette.vue';
  import SynapseSizeCtrl from './bottom-panel/synapse-size-ctrl.vue';
  import HoverObjectInfo from './bottom-panel/hover-object-info.vue';
  import AxonVisibilityCtrl from './bottom-panel/axon-visibility-ctrl.vue';
  import SectionAlignmentCtrl from './bottom-panel/section-alignment-ctrl.vue';
  import ScreenshotCtrl from './bottom-panel/screenshot-ctrl.vue';
  import MeshesToggleCtrl from './bottom-panel/meshes-toggle-ctrl.vue';
  import ClipboardIds from './bottom-panel/clipboard-ids.vue';
  import CounterIds from './bottom-panel/counter-ids.vue';
  import LayersToggleCtrl from './bottom-panel/layers-toggle-ctrl.vue';

  // Simulation config components
  import SynColorPalette from './bottom-panel/syn-color-palette.vue';

  export default {
    components: {
      'color-palette': ColorPalette,
      'syn-color-palette': SynColorPalette,
      'synapse-size-ctrl': SynapseSizeCtrl,
      'hover-object-info': HoverObjectInfo,
      'axon-visibility-ctrl': AxonVisibilityCtrl,
      'section-alignment-ctrl': SectionAlignmentCtrl,
      'screenshot-ctrl': ScreenshotCtrl,
      'meshes-toggle-ctrl': MeshesToggleCtrl,
      'clipboard-ids': ClipboardIds,
      'counter-ids': CounterIds,
      'layers-toggle-ctrl': LayersToggleCtrl,
    },
    data() {
      return {
        mode: 'cellSelection',
      };
    },
    mounted() {
      store.$on('setBottomPanelMode', (mode) => { this.mode = mode; });
    },
  };
</script>


<style lang="scss" scoped>
  $right-position: 12px; 
  $top-position: -40px; 
  .bottom-panel-container {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;

    .section-alignment-ctrl {
      position: absolute;
      right: $right-position;
      top: $top-position;
    }

    .screenshot-ctrl {
      position: absolute;
      right: $right-position;
      top: $top-position;
    }

    .hover-object-info-container {
      position: absolute;
      left: 12px;
      bottom: 12px;
    }

    .axon-visibility-ctrl {
      position: absolute;
      right: 16px;
      top: 16px;
    }

    .meshes-toggle {
      position: absolute;
      right: $right-position;
      top: $top-position - 130px;
    }

    .clipboard-ids {
      position: absolute;
      right: $right-position;
      top: $top-position;
    }

    .counter-ids {
      position: absolute;
      right: $right-position;
      top: $top-position - 180px;
    }

    .layers-toggle {
      position: absolute;
      right: $right-position - 10px;
      top: $top-position - 35px;
    }
    .ctrl-background {
      background-color: #ffffffcc;
      padding: 5px;
      border-radius: 5px;
    }
  }
</style>
