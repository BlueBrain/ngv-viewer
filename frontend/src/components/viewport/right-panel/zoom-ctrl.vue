
<template>
  <div class="zoom-ctrl-container">
    <span>Zoom</span>
    <Button
      icon="ios-add"
      @click="zoomIn"
    ></Button>
    <Button
      icon="ios-remove"
      @click="zoomOut"
    ></Button>
  </div>
</template>


<script>
  import store from '@/store';

  const interval = 1;

  export default {
    name: 'zoom-ctrl',
    data() {
      return {
        level: 1,
      };
    },
    methods: {
      zoomIn() {
        this.level += interval;
        store.$emit('onZoomChanged', this.level);
      },
      zoomOut() {
        this.level -= interval;
        if (this.level <= 0) this.level = 1;
        store.$emit('onZoomChanged', this.level);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .zoom-ctrl-container {
    margin: 5px 0;
    > span {
      margin-right: 5px;
    }
  }
</style>
