
<template>
  <div class="microdomain-slider-container">
    <div class="ctrl-background" v-if="show">
      <span><strong>{{SliderNames.MICRODOMAIN}}</strong></span>
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
  import { CurrentDetailedLevel, Mesh, SliderNames } from '@/constants';

  export default {
    name: 'microdomain-slider',
    data() {
      return {
        opacity: 0,
        show: false,
        storeMicrodomain: store.state.circuit.microdomain,
        SliderNames,
      };
    },
    mounted() {
      store.$on('detailedLevelChanged', () => {
        const microdomainIsVisible = !!store.state.currentDetailedLevel
          && store.state.currentDetailedLevel !== CurrentDetailedLevel[Mesh.ASTROCYTES];
        this.show = microdomainIsVisible;
        this.opacity = this.storeMicrodomain.opacity;

        if (microdomainIsVisible) {
          this.storeMicrodomain.visible = true;
          this.opacityChanged(this.opacity);
        }
      });
    },
    methods: {
      opacityChanged(newVal) {
        this.storeMicrodomain.opacity = newVal;
        store.$emit('changeMicrodomainOpacity');
      },
    },
  };
</script>


<style lang="scss" scoped>
  .microdomain-slider-container {
    .custom-slider {
      padding: 0 10px;
    }
  }
</style>
