<template>
  <div class="demo-wrapper">
    <div class="demo-actions">
      <button @click="logNetwork">Log JSON</button>
      <button @click="resetNetwork">Reset</button>
      <button @click="buildNetwork" style="background-color: #e6f7ff; border-color: #1890ff; color: #1890ff;">Build & Deploy</button>
      
      <span style="border-left: 1px solid #ddd; padding-left: 10px; display: flex; gap: 5px;">
        <button @click="toggleMode" style="font-size: 12px; min-width: 90px;">
          {{ advanceMode === 'step' ? 'Mode: Step' : 'Mode: Target' }} ↻
        </button>
        <input type="number" v-model="advanceCycle" style="width: 70px" />
        <button @click="advanceSimulation">
          {{ advanceMode === 'step' ? 'Step' : 'Advance To' }}
        </button>
      </span>

      <div v-if="connected" style="color: green; margin-left: 10px; align-self: center;">● WS Connected</div>
      <div v-else style="color: red; margin-left: 10px; align-self: center;">○ WS Disconnected</div>
    </div>
    <cy-editor
      ref="demoEditor"
      class="cy-editor"
      :network="networkValue"
      :cy-config="cyConfig"
      :editor-config="editorConfig"
      @network-change="handleNetworkChange"
    />
    <div class="network-preview">
      <div class="preview-title">实时 Network JSON</div>
      <pre>{{ formattedNetwork }}</pre>
    </div>
  </div>
</template>

<script>
import cyEditor from './cyeditor.js'
import { loadNetworks, resetNetwork, advanceTo, addNetwork } from '../src/api/networkService'

export default {
  name: 'App',
  components: {
    cyEditor
  },
  data () {
    return {
      networkValue: {
        version: '1.0.0',
        cycle: 0,
        nodes: [],
        edges: []
      },
      latestNetwork: null,
      cyConfig: {},
      editorConfig: {
        lineType: 'taxi'
      },
      advanceCycle: 100,
      advanceMode: 'step',
      connected: false,
      ws: null
    }
  },
  computed: {
    formattedNetwork () {
      return JSON.stringify(this.latestNetwork || this.networkValue, null, 2)
    }
  },
  async mounted () {
    await this.refreshNetwork() // Initial load
    this.setupWebSocket()
  },
  beforeDestroy () {
    if (this.ws) {
      this.ws.close()
    }
  },
  methods: {
    setupWebSocket () {
      // Use proxy: connect to same host/port as the web page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      // console.log('Connecting to WS:', wsUrl) // Debug
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WS Connected')
        this.connected = true
      }

      this.ws.onclose = () => {
        console.log('WS Disconnected')
        this.connected = false
        // Try reconnect after 2s
        setTimeout(() => this.setupWebSocket(), 2000)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // data should be CyNetwork object
          console.log('WS Update:', data)
          this.networkValue = data
          this.latestNetwork = data

          const editorComponent = this.$refs.demoEditor
          if (editorComponent && editorComponent.cyEditor) {
            // Reload only if needed or specific optimization.
            // For CyEditor, loadNetwork is usually full reload.
            editorComponent.cyEditor.loadNetwork(this.networkValue)
          }
        } catch (e) {
          console.error('WS Message Error:', e)
        }
      }
    },
    handleNetworkChange ({ network }) {
      this.latestNetwork = network
    },
    logNetwork () {
      console.log('Current Network JSON:', this.latestNetwork || this.networkValue)
    },
    async refreshNetwork () {
      try {
        const networks = await loadNetworks()
        if (networks && networks.length > 0) {
          this.networkValue = networks[0]
          this.latestNetwork = this.networkValue
          const editorComponent = this.$refs.demoEditor
          if (editorComponent && editorComponent.cyEditor) {
            editorComponent.cyEditor.loadNetwork(this.networkValue)
          }
        }
      } catch (e) {
        console.error('Failed to load network:', e)
      }
    },
    async resetNetwork () {
      try {
        await resetNetwork({})
        // No need to manual refresh if WS is connected, but good to be safe
      } catch (e) {
        console.error('Reset failed', e)
      }
    },
    async buildNetwork () {
      try {
        const payload = this.latestNetwork || this.networkValue

        console.log('Building network with:', payload)
        await addNetwork(payload)
        // Backend should broadcast new state via WS
        await this.refreshNetwork()
        this.advanceCycle = 100
        this.advanceMode = 'step'
      } catch (e) {
        console.error('Build failed', e)
        alert('Build failed: ' + e.message)
      }
    },
    toggleMode () {
      this.advanceMode = this.advanceMode === 'step' ? 'to' : 'step'
      const current = (this.latestNetwork && this.latestNetwork.cycle) || 0
      if (this.advanceMode === 'step') {
        this.advanceCycle = 100
      } else {
        this.advanceCycle = current + 100
      }
    },
    async advanceSimulation () {
      try {
        let cycle = Number(this.advanceCycle)
        // If Step mode, target = current + input
        if (this.advanceMode === 'step') {
          const current = (this.latestNetwork && this.latestNetwork.cycle) || 0
          cycle = current + cycle
        }

        await advanceTo(cycle)
      } catch (e) {
        console.error('Advance failed', e)
      }
    }
  }
}
</script>

<style scoped lang="stylus">
  .demo-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .demo-actions {
    display: flex;
    gap: 12px;
  }

  .demo-actions button {
    padding: 6px 14px;
    cursor: pointer;
  }

  .cy-editor {
    width: 100%;
    height: 600px;
    position: relative;
  }

  .network-preview {
    border: 1px solid #eaeaea;
    border-radius: 6px;
    padding: 12px;
    background: #fff;
  }

  .network-preview pre {
    margin: 0;
    max-height: 200px;
    overflow: auto;
    font-size: 12px;
  }

  .preview-title {
    font-weight: bold;
    margin-bottom: 8px;
  }
</style>
