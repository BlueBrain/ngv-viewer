
<template>
  <div>
    <p
      v-if="isNoRecordings"
      class="cta-title"
    >
      Pick a cell section or press plus button below to add recording
    </p>
    <div
      else
      class="recordings-group"
      v-for="(recordingsSet, gid) of recordings"
      :key="gid"
    >
      <gid-label :gid="gid"/>

      <div class="recordings-container">
        <Tag
          closable
          class="recording-tag"
          v-for="recording of recordingsSet"
          :key="recording.sectionName"
          @on-close="removeRecording(recording)"
        >
          <span
            @mouseover="onSectionLabelHover(recording)"
            @mouseleave="onSectionLabelUnhover()"
          >
            {{ recording.sectionName  || '---' }}
          </span>
        </Tag>
      </div>

    </div>
    <div class="tmp-recording-container mt-12">
      <transition
        name="fade"
        mode="out-in"
      >
        <div v-if="tmpRecording">
          <Tag
            type="border"
            closable
            @on-close="removeTmpRecording()"
          >
            GID: ---, sec: ---
          </Tag>
          <span class="cta-title ml-6">
            Click on a section in 3d viewer to make a selection
          </span>
        </div>
        <i-button
          v-else
          size="small"
          @click="addTmpRecording()"
        >
          Add recording
        </i-button>
      </transition>
    </div>
  </div>
</template>


<script>
  import groupBy from 'lodash/groupBy';

  import store from '@/store';
  import GidLabel from '@/components/shared/gid-label.vue';

  export default {
    name: 'cell-recordings',
    components: {
      'gid-label': GidLabel,
    },
    data() {
      return {
        tmpRecording: null,
        recordings: {},
      };
    },
    methods: {
      removeRecording(recording) {
        store.$dispatch('removeRecording', recording);
      },
      addTmpRecording() {
        this.tmpRecording = {
          gid: null,
          sectionName: null,
        };
        this.updateWaitingSecSelection();
      },
      removeTmpRecording() {
        this.tmpRecording = null;
        this.updateWaitingSecSelection();
      },
      updateWaitingSecSelection() {
        store.$dispatch('setWaitingSecSelection', !!this.tmpRecording || this.tmpStimulus);
      },
      onSectionLabelHover(section) {
        store.$dispatch('simConfigSectionLabelHovered', section.gid);
      },
      onSectionLabelUnhover() {
        store.$dispatch('simConfigSectionLabelUnhovered');
      },
    },
    computed: {
      isNoRecordings() {
        return !(Object.keys(this.recordings).length);
      },
    },
    mounted() {
      store.$on('updateRecordings', () => {
        this.recordings = groupBy(store.$get('recordings'), recording => recording.gid);
        // this.uncollapsePanel(PANEL.recordings);
      });
      store.$on('morphSectionSelected', (section) => {
        if (this.tmpRecording && !store.$get('isRecordingPresent', section)) {
          store.$dispatch('addRecording', {
            gid: section.neuron.gid,
            name: section.name,
            type: section.type,
          });
          this.removeTmpRecording();
        }
      });
    },
  };
</script>


<style lang="scss" scoped>
  .tmp-recording-container {
    .ivu-tag {
      margin: 0;
    }
  }

  .recordings-group {
    margin-bottom: 12px;

    h4 {
      margin: 12px 0 6px 0;
      cursor: help;
    }
  }

  .recording-tag.ivu-tag {
    background-color: rgba(#00bfff, .3);
  }
</style>
