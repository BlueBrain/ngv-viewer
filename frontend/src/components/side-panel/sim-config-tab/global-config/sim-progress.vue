
<template>
  <div class="non-zero-height">
    <transition name="fade">
      <i-progress
        v-if="visible"
        status="active"
        :percent="percent"
        :stroke-width="5"
      ></i-progress>
    </transition>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'sim-progress',
    data() {
      return {
        percent: 0,
        visible: false,
      };
    },
    mounted() {
      store.$on('ws:simulation_result', () => {
        this.visible = true;
        if (this.percent < 100) this.percent += 1;
      });
      store.$on('ws:simulation_finish', () => {
        this.visible = false;
        this.percent = 0;
      });
    },
  };
</script>


<style lang="scss" scoped>
  .non-zero-height {
    min-height: 1px;

  }
</style>
