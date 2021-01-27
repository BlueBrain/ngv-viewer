
<template>
  <div class="container">
    <Icon
      size="80"
      type="ios-arrow-round-back"
      @click="goBack"
      v-if="showBackArrow"
    />
  </div>
</template>


<script>
  import store from '@/store';
  import { CurrentDetailedLevel } from '@/constants';

  export default {
    name: 'go-back-ctrl',
    data() {
      return {
        showBackArrow: false,
      };
    },
    mounted() {
      store.$on('detailedLevelChanged', () => {
        this.showBackArrow = !!store.state.currentDetailedLevel
          && store.state.currentDetailedLevel !== CurrentDetailedLevel.ASTROCYTES;
      });
    },
    methods: {
      goBack() {
        switch (store.state.currentDetailedLevel) {
        case CurrentDetailedLevel.EFFERENTS:
          store.state.currentDetailedLevel = CurrentDetailedLevel.ASTROCYTES;
          store.$dispatch('goToAstrocyteDetailedLevel');
          break;
        case CurrentDetailedLevel.SYNAPSES:
          store.state.currentDetailedLevel = CurrentDetailedLevel.EFFERENTS;
          store.$dispatch('goToEfferentDetailedLevel');
          break;
        default:
          break;
        }
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    position: absolute;
    left: 5px;
    top: 5px;
  }
</style>
