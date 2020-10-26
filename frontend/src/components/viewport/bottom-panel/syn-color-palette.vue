
<template>
    <div
      class="container"
      v-if="colorPalette"
    >
      <div class="palette-container">
        <div
          class="palette-item"
          v-for="(color, paletteKey) in colorPalette"
          :key="paletteKey"
        >
          <small>{{ paletteKey }}</small>
          <div
            class="color-block"
            :style="{'background-color': color}"
          ></div>
        </div>
      </div>
    </div>
</template>


<script>

  export default {
    name: 'syn-color-palette',
    data() {
      return {
        colorPalette: {
          EXC: '#e48457',
          INH: '#0080ff',
        },
      };
    },
  };
</script>


<style scoped lang="scss">
  .container {
    background-color: #fefdfb;
    border-top: 1px solid #bdc2c8;
    padding: 16px 16px 10px 16px;
    position: relative;
  }

  .palette-container {
    margin-top: 3px;
    display: flex;
    flex-wrap: wrap;
    flex: 1 1 100%;
    width: calc(100% - 240px);
    min-height: 24px;
  }

  .palette-item {
    display: flex;
    margin-right: 12px;
    margin-bottom: 6px;
    height: 18px;
    line-height: 18px;
    border: 1px solid #838383;

    small {
      padding: 0 6px;
      min-width: 56px;
    }

    .color-block {
      height: 100%;
      width: 18px;
      display: inline-block;
    }
  }
</style>
