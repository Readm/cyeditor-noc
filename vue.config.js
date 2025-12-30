module.exports = {
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
      }
    }
  }
}