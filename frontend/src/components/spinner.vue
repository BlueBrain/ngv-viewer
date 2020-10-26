
<template></template>


<script>
  import store from '@/store';

  function createSpinnerConfig({ msg }) {
    const config = {
      render: h => h('div', [
        h('Icon', {
          class: 'spin-icon-load',
          props: { type: 'ios-loading', size: 18 },
        }),
        h('div', msg),
      ]),
    };

    return config;
  }

  export default {
    name: 'spinner',
    mounted() {
      store.$on('showGlobalSpinner', msg => this.show({ msg }));
      store.$on('hideGlobalSpinner', () => this.$Spin.hide());
    },
    methods: {
      show(msg) {
        const config = createSpinnerConfig({ msg });
        this.$Spin.show(config);
      },
    },
  };
</script>


<style>
    .spin-icon-load{
      animation: spin-animation 1s linear infinite;
    }

    @keyframes spin-animation {
        from { transform: rotate(0deg);}
        50%  { transform: rotate(180deg);}
        to   { transform: rotate(360deg);}
    }

</style>
