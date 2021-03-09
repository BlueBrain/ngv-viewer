
<template>
  <div
    v-if="name && isExpert"
    class="clipboard-ids-container ctrl-background"
  >
    <span class="name">{{name}}</span>
    <span
      class="container"
      @click="onCopy"
    >
      <Icon type="ios-copy-outline" size="16"></Icon>
      <span v-if="copied">Copied</span>
    </span>
    <span
      class="container"
      @click="onDownload"
    >
      <Icon type="ios-cloud-download-outline" size="16"></Icon>
      <span v-if="downloading">Downloading</span>
    </span>
  </div>
</template>


<script>
  import store from '@/store';
  import { saveAs } from 'file-saver';

  export default {
    name: 'clipboard-ids',
    data() {
      return {
        name: '',
        data: [],
        copied: false,
        downloading: false,
      };
    },
    mounted() {
      this.init();
    },
    computed: {
      isExpert() {
        return window.location.href.includes('expert');
      },
    },
    methods: {
      init() {
        store.$on('updateClipboardIds', (newData) => {
          this.name = newData.name;
          this.data = newData.data;
        });
      },
      onDownload() {
        this.downloading = true;
        const blob = new Blob([JSON.stringify(this.data)], { type: 'application/json' });
        const name = this.name.replaceAll(' ', '_');
        saveAs(blob, `${name}.json`);
        setTimeout(() => { this.downloading = false; }, 2000);
      },
      onCopy() {
        const text = JSON.stringify(this.data);
        navigator.clipboard.writeText(text).then(() => {
          this.copied = true;
          setTimeout(() => { this.copied = false; }, 2000);
        });
      },
    },
  };
</script>


<style lang="scss" scoped>
  .clipboard-ids-container {
    .name {
      margin-right: 5px;
    }
    .container {
      cursor: pointer;
      padding: 4px 7px 6px 7px;
      background-color: white;
      border: 1px solid #dddee1;
      border-radius: 4px;

      &:hover {
        box-shadow: 0 1px 6px rgba(202, 69, 69, 0.2);
      }
    }
  }
</style>
