const path = require('path')

module.exports = {
  // 配置输出目录为 ../web/static
  outputDir: path.resolve(__dirname, '../web/static'),

  // 配置公共路径
  publicPath: '/',

  // 不生成 source map 以减小体积
  productionSourceMap: false,

  // 配置页面（用于 npm run build:app）
  pages: {
    index: {
      entry: 'examples/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'FlowSim Network Editor'
    }
  },

  devServer: {
    disableHostCheck: true,
    proxy: {
      '/ws': {
        target: 'http://localhost:8081',
        ws: true,
        changeOrigin: true
      },
      '/load_networks': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/reset_network': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/advance_to': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/build_network': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/load_preset': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
}