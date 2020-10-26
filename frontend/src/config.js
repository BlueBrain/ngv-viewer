
import constants from '@/constants';

const { Entity } = constants;

const circuits = [
  {
    name: 'MOOC',
    type: Entity.CIRCUIT,
    urlName: 'rat-ca1',
    path: '/circuits/mooc/CircuitConfigPR',
    simModel: 'hippocampus',
    description: '',
  },
];

const defaultConfig = {
  singleCircuit: process.env.VUE_APP_SINGLE_CIRCUIT,
};

const devConfig = {
  server: {
    host: 'localhost',
    port: 8888,
  },
};

const prodConfig = {};

const prodMode = process.env.NODE_ENV === 'production';

const config = Object.assign(
  { circuits },
  defaultConfig,
  prodMode ? prodConfig : devConfig,
);

export default config;
