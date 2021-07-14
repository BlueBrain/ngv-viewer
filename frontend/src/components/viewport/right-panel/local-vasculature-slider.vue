
<template>
  <div class="local-vasculature-slider-container">
    <div class="ctrl-background" v-if="show">
      <span><strong>local vasculature opacity</strong></span>
      <Slider
        v-model="opacity"
        class="custom-slider"
        @on-change="opacityChanged"
      />
    </div>
  </div>
</template>


<script>
  import store from '@/store';
  import { CurrentDetailedLevel, Mesh } from '@/constants';

  export default {
    name: 'local-vasculature-slider',
    data() {
      return {
        opacity: 0,
        show: false,
        boundingVasculature: store.state.circuit.boundingVasculature,
      };
    },
    mounted() {
      this.init();

      store.$on('detailedLevelChanged', () => {
        const boundingVasculatureIsVisible = !!store.state.currentDetailedLevel
          && store.state.currentDetailedLevel !== CurrentDetailedLevel[Mesh.ASTROCYTES];
        this.show = boundingVasculatureIsVisible;

        if (boundingVasculatureIsVisible) {
          this.boundingVasculature.visible = true;
          this.opacityChanged(this.opacity);
        }
      });
    },
    methods: {
      init() {
        this.show = this.boundingVasculature.visible;
        this.opacity = this.boundingVasculature.opacity;
      },
      opacityChanged(newVal) {
        this.boundingVasculature.opacity = newVal;
        store.$emit('changeBoundingVasculatureOpacity');
      },
    },
  };
</script>


<style lang="scss" scoped>
  .local-vasculature-slider-container {
    .custom-slider {
      padding: 0 10px;
    }
  }
</style>
