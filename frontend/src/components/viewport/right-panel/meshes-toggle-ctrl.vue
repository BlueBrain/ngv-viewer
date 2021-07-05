
<template>
  <div class="mesh-toggle-main">
    <div class="container ctrl-background">
      <span><strong>hide / show</strong></span>
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
  import { Mesh } from '@/constants';
  import { CurrentDetailedLevel } from '@/constants.js';

  export default {
    name: 'meshes-toggle-ctrl',
    data() {
      return {
        meshes: [],
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        const {
          vasculature,
          cells,
          astrocytes,
        } = store.state.circuit;
        const meshes = [
          { name: Mesh.NEURONS, visible: cells.visible },
          { name: Mesh.ASTROCYTES, visible: astrocytes.visible },
          { name: Mesh.VASCULATURE, visible: vasculature.visible, disabled: true },
        ];
        this.$set(this, 'meshes', meshes);

        store.$on('vasculatureLoaded', () => {
          const vascMesh = this.meshes.find(m => m.name === Mesh.VASCULATURE);
          this.$set(vascMesh, 'disabled', false);
        });

        store.$on('detailedLevelChanged', () => {
          const neuronToggle = meshes.find(m => m.name === Mesh.NEURONS);
          const astrocyteToggle = meshes.find(m => m.name === Mesh.ASTROCYTES);

          if (store.state.currentDetailedLevel === CurrentDetailedLevel.ASTROCYTES) {
            neuronToggle.disabled = false;
            astrocyteToggle.disabled = false;
            astrocyteToggle.visible = true;
          } else {
            neuronToggle.disabled = true;
            astrocyteToggle.visible = false;
            astrocyteToggle.disabled = true;
          }
        });
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
    .container {
      text-align: end;
    }
  }
</style>
