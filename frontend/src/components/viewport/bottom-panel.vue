
<template>
  <div class="bottom-panel-container">

    <div class="relative">
      <hover-object-info class="hover-object-info-container" />
    </div>

    <color-palette />

  </div>
</template>


<script>
  import ColorPalette from './bottom-panel/color-palette.vue';
  import HoverObjectInfo from './bottom-panel/hover-object-info.vue';

  export default {
    components: {
      'color-palette': ColorPalette,
      'hover-object-info': HoverObjectInfo,
    },
  };
</script>


<style lang="scss" scoped>
  .bottom-panel-container {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;

    .hover-object-info-container {
      position: absolute;
      left: 12px;
      bottom: 12px;
    }
  }
</style>
