
<template>
  <positioned-poptip :position="position">

    <div
      class="mb-6"
      v-if="section && section.type === 'soma'"
    >
      <i-button
        type="default"
        size="small"
        long
        @click="onSynInputAdd()"
      >
        + Syn inputs
      </i-button>
    </div>

    <div>
      <i-button
        type="warning"
        size="small"
        :disabled="btn.stimulus.disabled"
        @click="onStimulusAdd()"
      >
        + Stimulus
      </i-button>

      <i-button
        type="info"
        size="small"
        class="ml-6"
        :disabled="btn.recording.disabled"
        @click="onRecordingAdd()"
      >
        + Recording
      </i-button>
    </div>

  </positioned-poptip>
</template>


<script>
  import some from 'lodash/some';

  import store from '@/store';

  import PositionedPoptip from '@/components/shared/positioned-poptip.vue';

  export default {
    name: 'morph-section-poptip',
    components: {
      'positioned-poptip': PositionedPoptip,
    },
    data() {
      return {
        position: {
          x: -20,
          y: -20,
        },
        section: null,
        btn: {
          recording: { disabled: false },
          stimulus: { disabled: false },
        },
      };
    },
    mounted() {
      store.$on('showMorphSectionPoptip', (context) => {
        this.position = context.clickPosition;

        this.section = {
          gid: context.data.neuron.gid,
          name: context.data.name,
          type: context.data.type,
        };

        this.updateBtnStatus();
      });
    },
    methods: {
      onStimulusAdd() {
        store.$dispatch('addStimulus', this.section);
        this.updateBtnStatus();
      },
      onRecordingAdd() {
        store.$dispatch('addRecording', this.section);
        this.updateBtnStatus();
      },
      onSynInputAdd() {
        store.$dispatch('addSynInput', this.section.gid);
      },
      updateBtnStatus() {
        const { recordings, stimuli } = store.state.simulation;
        const { name, gid } = this.section;

        this.btn.recording.disabled = some(recordings, r => r.sectionName === name && r.gid === gid);
        this.btn.stimulus.disabled = some(stimuli, s => s.sectionName === name && s.gid === gid);
      },
    },
  };
</script>
