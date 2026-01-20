const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'tests/e2e/**/*.cy.js',
    supportFile: false,
    video: true,
    setupNodeEvents (on, config) {
      // implement node event listeners here
    }
  }
})
