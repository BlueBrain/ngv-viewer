
<template>
  <div class="current-page-title ctrl-background">
    {{ helperText }}
  </div>
</template>


<script>
  import store from '@/store';
  import { PageHelperTitleText } from '@/constants';

  export default {
    name: 'go-back-ctrl',
    data() {
      return {
        helperText: '',
      };
    },
    mounted() {
      store.$on('detailedLevelChanged', () => {
        this.helperText = this.getCurrentText();
      });
      this.helperText = this.getCurrentText();
    },
    methods: {
      getCurrentText() {
        return PageHelperTitleText[store.state.currentDetailedLevel] || '';
      },
    },
  };
</script>


<style scoped>
  .current-page-title {
    font-size: 30px;
    position: absolute;
    left: 100px;
    top: 20px;
  }
</style>
