
<template>
  <div class="right-panel-container">
    <div class="clipboard-ids ctrl-background">
      <clipboard-ids />
    </div>
    <div class="counter-ids ctrl-background">
      <counter-ids />
    </div>
    <div class="meshes-toggle ctrl-background">
      <meshes-toggle-ctrl />
    </div>
    <div class="local-vasc-slider ctrl-background">
      <local-vasculature-slider />
    </div>
    <div class="layers-toggle ctrl-background">
      <layers-toggle-ctrl />
    </div>
    <div class="screenshot-ctrl ctrl-background">
      <screenshot-ctrl />
    </div>
  </div>
</template>


<script>
  import ScreenshotCtrl from './right-panel/screenshot-ctrl.vue';
  import MeshesToggleCtrl from './right-panel/meshes-toggle-ctrl.vue';
  import ClipboardIds from './right-panel/clipboard-ids.vue';
  import CounterIds from './right-panel/counter-ids.vue';
  import LayersToggleCtrl from './right-panel/layers-toggle-ctrl.vue';
  import LocalVasculatureSlider from './right-panel/local-vasculature-slider.vue';


  export default {
    components: {
      'screenshot-ctrl': ScreenshotCtrl,
      'meshes-toggle-ctrl': MeshesToggleCtrl,
      'clipboard-ids': ClipboardIds,
      'counter-ids': CounterIds,
      'layers-toggle-ctrl': LayersToggleCtrl,
      'local-vasculature-slider': LocalVasculatureSlider,
    },
  };
</script>


<style lang="scss" scoped>
  .right-panel-container {
    position: absolute;
    bottom: 80px;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .ctrl-background {
      background-color: #ffffffcc;
      padding: 5px;
      border-radius: 5px;
      margin-bottom: 5px;
    }
  }
</style>
