
<template>
  <div class="mesh-toggle-main">
    <div class="container">
      <div
        class="row"
        v-for="mesh in meshes"
        :key="mesh.name"
        :class="{ disabled: mesh.disabled }"
      >
        <div class="name">{{ mesh.name }}</div>
        <div class="toggle">
          <i-switch
            size="small"
            :value="mesh.visible"
            @on-change="meshChanges(mesh.name, ...arguments)"
          >
            <span slot="open"></span>
            <span slot="close"></span>
          </i-switch>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
  import store from '@/store';
  import { Mesh, CurrentDetailedLevel } from '@/constants';

  export default {
    name: 'meshes-toggle-ctrl',
    data() {
      return {
        meshes: [],
      };
    },
    mounted() {
      this.init();
      store.$on('detailedLevelChanged', () => {
        const boundingVasculatureIsVisible = !!store.state.currentDetailedLevel
          && store.state.currentDetailedLevel !== CurrentDetailedLevel.ASTROCYTES;
        const mesh = this.meshes.find(mesh => mesh.name === Mesh.BOUNDING_VASCULATURE);
        this.$set(mesh, 'disabled', !boundingVasculatureIsVisible);
      });
    },
    methods: {
      init() {
        const {
          vasculature,
          cells,
          astrocytes,
          boundingVasculature,
        } = store.state.circuit;
        const meshes = [
          { name: Mesh.NEURONS, visible: cells.visible },
          { name: Mesh.ASTROCYTES, visible: astrocytes.visible },
          { name: Mesh.VASCULATURE, visible: vasculature.visible },
          { name: Mesh.BOUNDING_VASCULATURE, visible: boundingVasculature.visible, disabled: true },
        ];
        this.$set(this, 'meshes', meshes);
      },
      meshChanges(meshName, display) {
        switch (meshName) {
        case Mesh.NEURONS: {
          if (display) {
            store.$emit('showCircuit');
          } else {
            store.$emit('hideCircuit');
          }
          break;
        }
        case Mesh.ASTROCYTES: {
          if (display) {
            store.$emit('showAstrocytes');
          } else {
            store.$emit('hideAstrocytes');
          }
          break;
        }
        case Mesh.VASCULATURE: {
          if (display) {
            store.$emit('showVasculature');
          } else {
            store.$emit('hideVasculature');
          }
          break;
        }
        case Mesh.BOUNDING_VASCULATURE: {
          if (display) {
            store.$emit('showBoundingVasculature');
          } else {
            store.$emit('hideBoundingVasculature');
          }
          break;
        }
        default: {
          break;
        }
        }
      },
    },
  };
</script>


<style lang="scss" scoped>
  .mesh-toggle-main {
    .row {
      display: flex;
      justify-content: flex-end;
      &.disabled {
        pointer-events: none;
        opacity: 0.2;
      }
    }
    .name {
      min-width: 75px;
      text-align: end;
      margin-right: 4px;
    }
  }
</style>
