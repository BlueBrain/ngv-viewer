
<template>
  <div class="right-panel-container">
    <div class="clipboard-ids">
      <clipboard-ids />
    </div>
    <div class="counter-ids">
      <counter-ids />
    </div>
    <div class="meshes-toggle">
      <meshes-toggle-ctrl />
    </div>
    <div class="local-vasc-slider">
      <local-vasculature-slider />
    </div>
    <div class="microdomain-slider">
      <microdomain-slider />
    </div>
    <div class="screenshot-ctrl">
      <screenshot-ctrl />
    </div>
    <div class="zoom-ctrl">
      <zoom-ctrl />
    </div>
  </div>
</template>


<script>
  import ScreenshotCtrl from './right-panel/screenshot-ctrl.vue';
  import MeshesToggleCtrl from './right-panel/meshes-toggle-ctrl.vue';
  import ClipboardIds from './right-panel/clipboard-ids.vue';
  import CounterIds from './right-panel/counter-ids.vue';
  import LocalVasculatureSlider from './right-panel/local-vasculature-slider.vue';
  import MicrodomainSlider from './right-panel/microdomain-slider.vue';
  import ZoomCtrl from './right-panel/zoom-ctrl.vue';


  export default {
    components: {
      'screenshot-ctrl': ScreenshotCtrl,
      'meshes-toggle-ctrl': MeshesToggleCtrl,
      'clipboard-ids': ClipboardIds,
      'counter-ids': CounterIds,
      'local-vasculature-slider': LocalVasculatureSlider,
      'microdomain-slider': MicrodomainSlider,
      'zoom-ctrl': ZoomCtrl,
    },
  };
</script>


<style lang="scss">
  .right-panel-container {
    position: absolute;
    bottom: 60px;
    right: 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

  }
  /* to be used by the component if needed */
  .ctrl-background {
    background-color: #ffffffcc;
    padding: 5px;
    border-radius: 5px;
    margin-bottom: 5px;
  }
</style>
