
<template>
  <div>
    <Modal
      v-model="visible"
      class-name="vertical-center-modal"
    >
      <div slot="header">
        <h3>
          <Icon
            class="mr-6 v-align-mid"
            size="18"
            :type="iconTypeStr"
            :color="iconColorStr"
          />
          <span class="v-align-mid">{{ title }}</span>
        </h3>
      </div>

      <span>{{ message }}</span>

      <div slot="footer" class="text-right">
        <i-button
          type="primary"
          size="small"
          @click="hide"
        >
          Ok
        </i-button>
      </div>
    </Modal>
  </div>
</template>


<script>
  import store from '@/store';

  const iconType = {
    info: 'ios-information-circle',
    success: 'ios-checkmark-circle',
    warning: 'ios-alert',
    error: 'ios-close-circle',
  };

  const iconColor = {
    info: '#2db7f5',
    success: '#19be6b',
    warning: '#ff9900',
    error: '#ed4014',
  };

  export default {
    name: 'global-modal',
    data() {
      return {
        visible: false,
        type: 'info',
        title: '',
        message: '',
      };
    },
    methods: {
      show(type, { title, message }) {
        this.type = type;

        this.title = title;
        this.message = message;

        this.visible = true;
      },
      hide() {
        this.visible = false;
      },
    },
    computed: {
      iconTypeStr() {
        return iconType[this.type];
      },
      iconColorStr() {
        return iconColor[this.type];
      },
    },
    mounted() {
      this.showBinded = this.show.bind(this);
      store.$on('showModal', this.showBinded);
    },
    beforeDestroy() {
      store.$off('showModal', this.showBinded);
    },
  };
</script>
