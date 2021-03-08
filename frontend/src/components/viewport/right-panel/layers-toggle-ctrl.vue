
<template>
  <div class="layers-toggle-main">
    <div class="container" v-if="showSelector">
      <div><strong>show layers</strong></div>
      <CheckboxGroup
        v-model="layersToShow"
        @on-change=hideLayersChanged
      >
        <Checkbox
          v-for="layerNumber in layersAvailable"
          :key="layerNumber"
          :label="layerNumber"
          :checked="true"
        >
          <span>{{ layerNumber }}</span>
        </Checkbox>
      </CheckboxGroup>
    </div>
  </div>
</template>


<script>
  import store from '@/store';
  import { CurrentDetailedLevel, ColorConvention } from '@/constants';

  export default {
    name: 'layers-toggle-ctrl',
    data() {
      return {
        layersToShow: [],
        layersAvailable: [],
        showSelector: true,
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        const uniqueLayers = Object.keys(ColorConvention.LAYERS);
        this.layersAvailable = uniqueLayers;
        this.layersToShow = uniqueLayers.map(layer => String(layer));

        store.$on('detailedLevelChanged', () => {
          this.showSelector = store.state.currentDetailedLevel === CurrentDetailedLevel.ASTROCYTES;
        });
      },
      hideLayersChanged(param) {
        store.$dispatch('astrocyteLayerFilterChanged', param);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .layers-toggle-main {
    text-align: right;
    max-width: 125px;
  }
</style>
