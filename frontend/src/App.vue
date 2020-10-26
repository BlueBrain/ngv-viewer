
<template>
  <div class="app-container">
    <div v-if="mode === 'operational'">
      <top-bar/>
      <viewport-component/>
      <side-panel/>
      <spinner/>
      <circuit-loading-modal />
      <global-modal />
    </div>
    <maintenance-page v-else-if="mode === 'maintenance'"/>
  </div>
</template>


<script>
  import store from '@/store';

  import TopBar from './components/top-bar.vue';
  import Viewport from './components/viewport.vue';
  import SidePanel from './components/side-panel.vue';
  import Spinner from './components/spinner.vue';
  import CircuitLoadingModal from './components/circuit-loading-modal.vue';
  import MaintenancePage from './components/maintenance-page.vue';
  import GlobalModal from './components/global-modal.vue';

  export default {
    name: 'app',
    data() {
      return {
        mode: false,
      };
    },
    async mounted() {
      this.mode = await store.$dispatch('getServerStatus');
      if (this.mode !== 'operational') return;

      store.$dispatch('init');
    },
    components: {
      'top-bar': TopBar,
      'viewport-component': Viewport,
      'side-panel': SidePanel,
      spinner: Spinner,
      'circuit-loading-modal': CircuitLoadingModal,
      'global-modal': GlobalModal,
      'maintenance-page': MaintenancePage,
    },
  };
</script>


<style lang="scss">
  html {
    overflow: hidden;
    height: 100%;
  }

  body {
    height: 100%;
    overflow: auto;
  }

  .app-container {
    height: 100%;
  }

  // TODO: move to separate style file
  .fade-enter-active, .fade-leave-active {
    transition: opacity .2s;
  }
  .fade-enter, .fade-leave-to {
    opacity: 0;
  }

  .fadeHeight-enter-active, .fadeHeight-leave-active {
    transition: all .2s;
    max-height: 200px;
  }
  .fadeHeight-enter, .fadeHeight-leave-to
  {
    opacity: 0;
    max-height: 0px;
  }

  .mt-2 { margin-top: 2px; }
  .mr-2 { margin-right: 2px; }
  .mb-2 { margin-bottom: 2px; }
  .ml-2 { margin-left: 2px; }

  .mt-6 { margin-top: 6px; }
  .mr-6 { margin-right: 6px; }
  .mb-6 { margin-bottom: 6px; }
  .ml-6 { margin-left: 6px; }

  .mt-12 { margin-top: 12px; }
  .mr-12 { margin-right: 12px; }
  .mb-12 { margin-bottom: 12px; }
  .ml-12 { margin-left: 12px; }

  .mt-24 { margin-top: 24px; }
  .mr-24 { margin-right: 24px; }
  .mb-24 { margin-bottom: 24px; }
  .ml-24 { margin-left: 24px; }

  .ivu-collapse-header {
    height: 24px !important;
    line-height: 24px !important;
  }

  .cta-title {
    font-weight: normal;
    font-size: 12px;
    color: #888888;
    margin-bottom: 12px;
  }

  .center-modal {
    display: flex;
    justify-content: center;
    align-content: center;
    align-items: center;

    .ivu-modal {
      top: 0;
    }
  }

  .tooltip-block, .tooltip-block>.ivu-tooltip-rel {
    display: block;
  }

  .text-right {
    text-align: right;
  }

  .float-right {
    float: right;
  }

  .relative {
    position: relative;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .v-align-mid {
    vertical-align: middle;
  }

  .dygraph-label-rotate-right {
    transform: rotate(-90deg);
  }

  .dygraph-ylabel, .dygraph-xlabel {
    text-align: center;
  }
</style>
