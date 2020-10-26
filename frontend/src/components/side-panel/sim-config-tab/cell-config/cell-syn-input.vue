
<template>
  <div
    class="sym-input-container-inner"
    :class="{'disabled': !synInput.gid}"
  >
    <p class="mb-6">
      <span :class="{'text-grey': !synInput.valid}">
        Synapses visible:
      </span>
      <i-switch
        size="small"
        v-model="synInput.synapsesVisible"
        :disabled="!synInput.valid"
        @on-change="emitSynInputChange"
      >
      </i-switch>
      <span
        class="cta-title ml-6"
        v-if="!synInput.gid"
      >
        Click on a cell in 3d viewer to select post-synaptic cell
      </span>
    </p>

    <div
      class="close-btn"
      @click="onClose"
    >
      <Icon type="ios-close"></Icon>
    </div>

    <Row :gutter="16" class="mt-6">
      <i-col span="12">
        <Tooltip
          class="tooltip-block"
          content="Please select pre-synaptic cell property"
          placement="top"
          :always="propInputPoptipVisible"
          :disabled="!propInputPoptipVisible"
        >
          <i-select
            v-model="synInput.preSynCellProp"
            :disabled="!synInput.gid"
            :transfer="true"
            size="small"
            placeholder="Prop"
            @on-change="onPreSynCellPropChange"
          >
            <i-option
              v-for="prop in preSynCellProps"
              :value="prop"
              :key="prop"
            >{{ prop }}</i-option>
          </i-select>
        </Tooltip>
      </i-col>
      <i-col span="12">
        <Tooltip
          class="tooltip-block"
          content="Please select value"
          placement="top"
          :disabled="!propValueInputPoptipVisible"
          :always="propValueInputPoptipVisible"
        >
          <i-select
            size="small"
            placeholder="Value"
            v-model="synInput.preSynCellPropVal"
            filterable
            :transfer="true"
            :disabled="!synInput.gid"
            @on-change="onPreSynCellPropValueChange"
          >
            <i-option
              v-for="value in preSynCellPropValues"
              :key="value"
              :value="value"
            >{{ value }}</i-option>
          </i-select>
        </Tooltip>
      </i-col>
    </Row>
    <Row :gutter="16" class="mt-6">
      <i-col span="12">
        <i-form
          :label-width="120"
          @submit.native.prevent
        >
          <FormItem label="delay [ms]">
            <InputNumber
              size="small"
              v-model="synInput.delay"
              :min="0"
              :max="3000"
              :step="10"
              :disabled="!synInput.gid"
              @on-change="emitSynInputChange"
            ></InputNumber>
          </FormItem>
        </i-form>
      </i-col>
      <i-col span="12">
        <i-form
          :label-width="120"
          @submit.native.prevent
        >
          <FormItem label="duration [ms]">
            <InputNumber
              size="small"
              v-model="synInput.duration"
              :min="10"
              :max="3000"
              :step="10"
              :disabled="!synInput.gid"
              @on-change="emitSynInputChange"
            ></InputNumber>
          </FormItem>
        </i-form>
      </i-col>
    </Row>
    <Row :gutter="16" class="mt-6">
      <i-col span="12">
        <i-form
          :label-width="120"
          @submit.native.prevent
        >
          <FormItem label="frequency [Hz]">
            <InputNumber
              v-model="synInput.spikeFrequency"
              :disabled="!synInput.gid"
              :min="1"
              :max="200"
              :step="1"
              size="small"
              placeholder="f, Hz"
              @on-change="emitSynInputChange"
            ></InputNumber>
          </FormItem>
        </i-form>
      </i-col>
      <i-col span="12">
        <i-form
          :label-width="120"
          @submit.native.prevent
        >
          <FormItem label="weight scalar">
            <InputNumber
              v-model="synInput.weightScalar"
              :disabled="!synInput.gid"
              :min="0.1"
              :max="100"
              :step="0.1"
              size="small"
              placeholder="weight scalar"
              @on-change="emitSynInputChange"
            ></InputNumber>
          </FormItem>
        </i-form>
      </i-col>
    </Row>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'cell-syn-input',
    props: ['value', 'filterSet'],
    data() {
      return {
        synInput: this.value,
        preSynCellProps: [],
        preSynCellPropValues: [],
      };
    },
    mounted() {
      this.preSynCellProps = Object.keys(this.filterSet).sort();
    },
    methods: {
      onPreSynCellPropChange() {
        this.synInput.preSynCellPropVal = '';
        this.updateValidity();
        this.updateFilters();
        this.emitSynInputChange();
      },
      onPreSynCellPropValueChange() {
        this.updateValidity();
        this.emitSynInputChange();
      },
      updateValidity() {
        this.synInput.valid = this.synInput.gid
          && this.synInput.preSynCellProp
          && this.synInput.preSynCellPropVal
          && this.preSynCellPropValValid;
      },
      updateFilters() {
        const { synInputs } = store.state.simulation;

        const currentProp = this.synInput.preSynCellProp;
        this.preSynCellPropValues = this.filterSet[currentProp]
          .filter(propValue => !synInputs.find((input) => {
            if (!input.valid) return false;

            return input.preSynCellProp === currentProp
              && input.preSynCellPropVal === propValue
              && input.gid === this.synInput.gid;
          }));
      },
      emitSynInputChange() {
        this.$emit('input', this.synInput);
      },
      onClose() {
        this.$emit('on-close');
      },
    },
    computed: {
      preSynCellPropValValid() {
        return this.preSynCellPropValues.includes(this.synInput.preSynCellPropVal);
      },
      propInputPoptipVisible() {
        return this.synInput.gid
          && !this.synInput.preSynCellProp;
      },
      propValueInputPoptipVisible() {
        return this.synInput.gid
          && !this.propInputPoptipVisible
          && !this.preSynCellPropValValid;
      },
    },
  };
</script>


<style lang="scss" scoped>
  .sym-input-container-inner {
    position: relative;
    border: 1px solid #e9eaec;
    background-color: #d7eafd;
    border-radius: 3px;
    padding: 8px;

    &.disabled {
      background-color: #eee;
    }
  }

  .close-btn {
    position: absolute;
    right: 0;
    top: 0;
    padding: 0 8px;
    font-size: 22px;
    line-height: 22px;
    color: #666;
    opacity: .66;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }

  .text-grey {
    color: #888888;
  }

  .ivu-input-number {
    width: 100%;
  }

  .ivu-form-item {
    margin-bottom: 0;
  }
</style>
