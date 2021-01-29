
module.exports = {
  lintOnSave: false,
  configureWebpack: {
    devtool: 'source-map',
  },
  publicPath: process.env.VUE_APP_BASE_URL || '/',
};
