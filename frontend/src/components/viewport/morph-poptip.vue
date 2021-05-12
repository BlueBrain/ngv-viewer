
<template>
  <positioned-poptip :position="position" v-show="visible">

    <div class="mb-6">
      <i-button
        type="warning"
        size="small"
        long
        @click="onRemoveMorph()"
      >
        Remove Morphology
      </i-button>
    </div>

  </positioned-poptip>
</template>


<script>
  import store from '@/store';

  import PositionedPoptip from '@/components/shared/positioned-poptip.vue';

  export default {
    name: 'morph-poptip',
    components: {
      'positioned-poptip': PositionedPoptip,
    },
    data() {
      return {
        position: {
          x: -20,
          y: -20,
        },
        morphInfo: null,
        visible: false,
      };
    },
    mounted() {
      store.$on('showMorphPoptip', (context) => {
        this.position = context.clickPosition;

        this.morphInfo = {
          gid: context.data.gid,
          name: context.data.name,
          isNeuron: context.data.isNeuron,
        };
        this.visible = true;
      });
    },
    methods: {
      onRemoveMorph() {
        if (this.morphInfo.isNeuron) {
          store.$emit('removeCellMorphologies', cellMorph => this.morphInfo.gid === cellMorph.gid);
          const morphGids = store.state.circuit.cells.selectedMorphologies;
          store.state.circuit.cells.selectedMorphologies = morphGids.filter(gid => gid !== this.morphInfo.gid);
        } else {
          store.$emit('destroyAstrocyteMorphology');
        }
        store.$emit('onMorphHoverEnd');
        this.visible = false;
      },
    },
  };
</script>
