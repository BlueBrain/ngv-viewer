
import 'view-design/dist/styles/iview.css';

import Vue from 'vue';
import ViewUI from 'view-design';
import locale from 'view-design/dist/locale/en-US';

import App from './App.vue';

Vue.use(ViewUI, { locale });

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app');
