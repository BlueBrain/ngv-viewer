
<template>
  <Modal
    class-name="vertical-center-modal circuit-loading-modal"
    v-model="visible"
    :closable="false"
    :mask-closable="false"
  >
    <div slot="header">
      <h3>Loading circuit data</h3>
    </div>

    <div slot="footer">
      <p class="description">
        Loading cell properties. For big circuits this might take a while.
      </p>

      <div
        v-if="props.length"
        class="progress-container mt-24"
      >
        <Row
          :gutter="12"
          type="flex"
        >
          <i-col span="4">
            <transition name="vertical-slide">
              <div
                class="prop-label"
                :key="currentPropIdx"
              >
                {{ props[currentPropIdx].name }}
              </div>
            </transition>
            &nbsp; <!-- prevent column collapse due to prop-label out of flow -->
          </i-col>
          <i-col span="20">
            <i-progress
              :key="currentPropIdx"
              :percent="props[currentPropIdx].totalProgress"
            />
          </i-col>
        </Row>
      </div>
    </div>
  </Modal>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'circuit-loading-modal',
    data() {
      return {
        props: [],
        progress: 0,
        visible: false,
        currentPropIdx: 0,
      };
    },
    mounted() {
      store.$on('showCircuitLoadingModal', ({ cellProps }) => {
        this.currentPropIdx = 0;
        this.visible = true;

        this.props = ['position', ...cellProps].map(prop => ({
          name: prop,
          indexProgress: 0,
          valuesProgress: 0,
          totalProgress: 0,
        }));
      });

      store.$on('setCircuitLoadingProgress', ({ cellProp, progress, progressType }) => {
        const propObj = this.props.find(p => p.name === cellProp);
        if (!propObj) {
          throw new Error(`Property ${cellProp} hasn't been found in circuit loading modal`);
        }

        if (cellProp === 'position') {
          propObj.totalProgress = progress;
        } else {
          propObj[progressType] = progress;
          propObj.totalProgress = Math.trunc((propObj.valuesProgress + propObj.indexProgress) / 2);
        }

        if (propObj.totalProgress === 100 && (this.currentPropIdx < (this.props.length - 1))) {
          this.currentPropIdx += 1;
        }
      });

      store.$on('hideCircuitLoadingModal', () => { this.visible = false; });
    },
  };
</script>


<style lang="scss">
  .vertical-center-modal{
    display: flex;
    align-items: center;
    justify-content: center;

    .ivu-modal{
      top: 0;
    }
  }

  .circuit-loading-modal {
    .ivu-modal-body {
      display: none;
    }

    .ivu-modal-footer {
      text-align: left;
    }

    .description {
      color: #555555;
      margin-bottom: 12px;
    }
  }

  .prop-label {
    position: absolute;
    font-weight: bold;
    text-transform: capitalize;
  }

  .vertical-slide-leave-active, .vertical-slide-enter-active {
    transition: transform 1s, opacity 1s;
  }
  .vertical-slide-enter {
    transform: translateY(16px);
    opacity: 0;
  }
  .vertical-slide-leave-to {
    transform: translateY(-16px);
    opacity: 0;
    color: #19be6b;
  }

  .progress-container {
    height: 24px;
  }
</style>
