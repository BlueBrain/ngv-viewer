
<template>
  <div class="container">
    <div class="name-container">
      <span>Layer</span>
    </div>
    <div class="palette-container">
      <CheckboxGroup
        class="palette-container"
        v-model="layersSelected"
        @on-change=hideLayersChanged
      >
        <div
          class="palette-item"
          v-for="(color, paletteKey) in colorPalette"
          :key="paletteKey"
        >
          <Checkbox
            v-if="showLayerCheckboxes"
            class="custom-checkbox"
            :label="paletteKey"
            :checked="true"
          >
          </Checkbox>
          <small v-if="!showLayerCheckboxes">
            {{ paletteKey }}
          </small>
          <div
            class="color-block"
            :style="{'background-color': color}"
          ></div>
        </div>
      </CheckboxGroup>
    </div>

    <div
      class="extra-color-container display-flex"
      v-if="extraColorPaletteArray.length"
    >
      <div
        v-for="extraColor in extraColorPaletteArray"
        :key="extraColor.key"
        class="display-flex"
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
  import { ColorConvention, CurrentDetailedLevel } from '@/constants.js';

  export default {
    name: 'color-palette',
    data() {
      return {
        colorPalette: {},
        extraColorPaletteArray: [],
        showLayerCheckboxes: true,
        layersSelected: [],
      };
    },
    mounted() {
      this.updateColorPalette();

      store.$on('resetPalette', () => {
        this.colorPalette = {};
      });
      store.$on('updateColorPalette', () => this.updateColorPalette());
      store.$on('initNeuronColor', this.generatePalette);
      store.$on('detailedLevelChanged', () => {
        this.showLayerCheckboxes = !!store.state.currentDetailedLevel
          && store.state.currentDetailedLevel === CurrentDetailedLevel.ASTROCYTES;
      });

      store.$on('updateExtraColorPalette', this.generateExtraPalette);
    },
    methods: {
      generatePalette() {
        // colors taken from https://bbpteam.epfl.ch/project/issues/browse/NGVDISS-127
        const prop = ['layer'];
        const colorPalette = Object.keys(ColorConvention.LAYERS).reduce((acc, key) => {
          const value = ColorConvention.LAYERS[key];
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
        this.extraColorPaletteArray = Object.keys(ColorConvention.extraPalette)
          .reduce((acc, key) => {
            const info = ColorConvention.extraPalette[key];
            if (!info.visible) return acc;
            acc.push({ key, color: info.color, name: info.name });
            return acc;
          }, []);
      },

      updateColorPalette() {
        const glColorPalette = store.state.circuit.color.palette;
        const colorKeys = Object.keys(glColorPalette).sort();
        this.colorPalette = colorKeys.reduce((palette, colorKey) => {
          const color = chroma.gl(...glColorPalette[colorKey]).css();
          return Object.assign(palette, { [colorKey]: color });
        }, {});
      },

      hideLayersChanged() {
        store.$dispatch('layerFilterChanged', this.layersSelected);
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
    flex-grow: 1;
  }

  .name-container {
    margin-right: 10px;
  }

  .display-flex {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .palette-item {
    display: flex;
    margin-right: 12px;
    height: 18px;
    line-height: 18px;
    border: 1px solid #838383;

    small {
      padding: 0 8px;
      min-width: 20px;
    }

    .color-block {
      height: 100%;
      width: 18px;
      display: inline-block;
    }

    .custom-checkbox {
      margin-right: 5px;
    }
  }
</style>

<style>
  .palette-item .custom-checkbox .ivu-checkbox-inner {
    margin-right: 5px;
    border: 2px solid black;
    width: 18px;
    height: 18px;
  }
  .palette-item .custom-checkbox .ivu-checkbox {
    margin: -3px 0 0 -3px;
    padding: 2px;
  }
</style>
