
<template>
  <div
    class="hover-object-info-container opacity-transition"
    :class="{opaque: !visible}"
  >
    <h4>{{ content.header }}</h4>
    <div v-if="content.items">
      <div
        v-for="(item, index) in content.items"
        :key="index"
      >
        <h5 v-if="item.subHeader">
          {{ item.subHeader }}
        </h5>

        <div v-if="item.type === 'text'">
          <p>{{ item.data }}</p>
        </div>

        <div v-else-if="item.type === 'table'">
          <div class="object-info-table">
            <div class="object-info-row">
              <div v-for="(val, key) in item.data" :key="key">
                {{ key }}
              </div>
            </div>
            <div class="object-info-row">
              <div v-for="(val, key) in item.data" :key="key" >
                {{ val }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'hover-object-info',
    data() {
      return {
        visible: false,
        content: {},
      };
    },
    mounted() {
      store.$on('showHoverObjectInfo', (content) => {
        this.content = content;
        this.visible = true;
      });
      store.$on('hideHoverObjectInfo', () => { this.visible = false; });
    },
  };
</script>


<style lang="scss" scoped>
  h4 {
    margin-bottom: 12px;
  }

  .hover-object-info-container {
    padding: 6px;
    background-color: white;
    border: 1px solid #dddee1;
    border-radius: 4px;
    min-width: 240px;
  }

  .object-info-row {
    display: inline-block;
    margin-right: 24px;
    max-width: 200px;
    overflow-x: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .opacity-transition {
    transition: opacity 0.3s ease-in-out;
  }

  .opaque {
    opacity: 0;
  }
</style>
