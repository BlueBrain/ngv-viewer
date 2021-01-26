
<template>
  <div class="container">
    <div class="name-container">
      <span>Layer</span>
    </div>
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

    <div
      class="extra-color-container"
      v-if="extraColorPaletteArray.length"
    >
      <div
        v-for="extraColor in extraColorPaletteArray"
        :key="extraColor.key"
        class="extra-color-container"
      >
        <div class="name-container">{{ extraColor.name }}</div>

        <div class="palette-container">
          <div class="palette-item">
            <small></small>
            <div
              class="color-block"
              :style="{'background-color': extraColor.color}"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
  import * as chroma from 'chroma-js';

  import store from '@/store';
  import { colors } from '@/constants.js';

  export default {
    name: 'color-palette',
    data() {
      return {
        colorPalette: {},
        extraColorPaletteArray: [],
      };
    },
    mounted() {
      this.updateColorPalette();

      store.$on('resetPalette', () => {
        this.colorPalette = {};
      });
      store.$on('updateColorPalette', () => this.updateColorPalette());
      store.$on('initNeuronColor', this.generatePalette);
    },
    methods: {
      generatePalette() {
        // colors taken from https://bbpteam.epfl.ch/project/issues/browse/NGVDISS-127
        const prop = ['layer'];
        const colorPalette = Object.keys(colors.LAYERS).reduce((acc, key) => {
          const value = colors.LAYERS[key];
          acc[key] = chroma(value).gl();
          return acc;
        }, {});

        store.state.circuit.color = {
          palette: colorPalette,
          neuronProp: prop,
        };

        this.generateExtraPalette();
      },

      generateExtraPalette() {
        this.extraColorPaletteArray = Object.keys(colors.extraPalette).map((key) => {
          const value = colors.extraPalette[key];
          return {
            key,
            color: value.color,
            name: value.name,
          };
        });
      },

      updateColorPalette() {
        const glColorPalette = store.state.circuit.color.palette;
        const colorKeys = Object.keys(glColorPalette).sort();
        this.colorPalette = colorKeys.reduce((palette, colorKey) => {
          const color = chroma.gl(...glColorPalette[colorKey]).css();
          return Object.assign(palette, { [colorKey]: color });
        }, {});
      },
    },
  };
</script>


<style scoped lang="scss">
  .container {
    background-color: #fefdfb;
    border-top: 1px solid #bdc2c8;
    padding: 16px 16px 10px 16px;
    position: relative;
    display: flex;
    align-items: center;
  }

  .palette-container {
    display: flex;
    flex-wrap: wrap;
  }

  .name-container {
    margin-right: 10px;
  }

  .extra-color-container {
    margin-left: 20px;
    display: flex;
    flex-wrap: wrap;
  }

  .palette-item {
    display: flex;
    margin-right: 12px;
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
