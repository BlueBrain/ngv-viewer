
<template>
  <div class="container button-back" v-if="showBackArrow">
    <Icon
      size="40"
      type="ios-arrow-round-back"
      @click="goBack"
    />
  </div>
</template>


<script>
  import store from '@/store';
  import { CurrentDetailedLevel, Mesh } from '@/constants';

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
          && store.state.currentDetailedLevel !== CurrentDetailedLevel[Mesh.ASTROCYTES];
      });
    },
    methods: {
      goBack() {
        switch (store.state.currentDetailedLevel) {
        case CurrentDetailedLevel[Mesh.EFFERENTS]:
          store.state.currentDetailedLevel = CurrentDetailedLevel[Mesh.ASTROCYTES];
          store.$dispatch('goToAstrocyteDetailedLevel');
          break;
        case CurrentDetailedLevel[Mesh.SYNAPSES]:
          store.state.currentDetailedLevel = CurrentDetailedLevel[Mesh.EFFERENTS];
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
    left: 15px;
    top: 15px;
  }
  .button-back {
    border-color: #2e8cf040;
    border-width: 2px;
    border-style: solid;
    border-radius: 50px;
    transition: all .2s ease-in-out;
  }
  .button-back:hover {
    background-color: #2e8cf040;
    transform: scale(1.4);
  }
</style>
