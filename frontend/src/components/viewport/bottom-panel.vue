
<template>
  <div class="bottom-panel-container">

    <div class="relative">
      <hover-object-info class="hover-object-info-container" />
    </div>

    <div class="screenshot-ctrl">
      <screenshot-ctrl />
    </div>

    <transition name="fade">
      <div class="circuit-panel" v-if="mode === 'cellSelection'">
        <color-palette />
        <div class="soma-size-ctrl">
          <soma-size-ctrl />
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
  import SomaSizeCtrl from './bottom-panel/soma-size-ctrl.vue';
  import SynapseSizeCtrl from './bottom-panel/synapse-size-ctrl.vue';
  import HoverObjectInfo from './bottom-panel/hover-object-info.vue';
  import AxonVisibilityCtrl from './bottom-panel/axon-visibility-ctrl.vue';
  import SectionAlignmentCtrl from './bottom-panel/section-alignment-ctrl.vue';
  import ScreenshotCtrl from './bottom-panel/screenshot-ctrl.vue';

  // Simulation config components
  import SynColorPalette from './bottom-panel/syn-color-palette.vue';

  export default {
    components: {
      'color-palette': ColorPalette,
      'soma-size-ctrl': SomaSizeCtrl,
      'syn-color-palette': SynColorPalette,
      'synapse-size-ctrl': SynapseSizeCtrl,
      'hover-object-info': HoverObjectInfo,
      'axon-visibility-ctrl': AxonVisibilityCtrl,
      'section-alignment-ctrl': SectionAlignmentCtrl,
      'screenshot-ctrl': ScreenshotCtrl,
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
  .bottom-panel-container {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;

    .soma-size-ctrl, .synapse-size-ctrl {
      position: absolute;
      right: 12px;
      top: -224px;
    }

    .section-alignment-ctrl {
      position: absolute;
      right: 12px;
      top: -260px;
    }

    .screenshot-ctrl {
      position: absolute;
      right: 52px;
      top: -41px;
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
  }
</style>
