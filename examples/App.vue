<template>
  <div class="demo-wrapper">
    <div class="demo-actions">
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

      <span style="border-left: 1px solid #ddd; padding-left: 10px; display: flex; gap: 5px; align-items: center;">
        <select v-model="selectedExample" style="min-width: 150px;">
          <option value="">-- 选择示例网络 --</option>
          <option value="ring_4node.json">环形网络 (4节点)</option>
          <option value="ring_8node.json">环形网络 (8节点)</option>
          <option value="ring_16node.json">环形网络 (16节点)</option>
          <option value="multi_edge_demo.json">多边示例 (2节点)</option>
        </select>
        <button @click="loadExampleNetwork" :disabled="!selectedExample">加载示例</button>
      </span>

      <span style="border-left: 1px solid #ddd; padding-left: 10px; display: flex; gap: 5px; align-items: center;">
        <select v-model="presetName">
          <option value="bi_ring">Bi-Ring</option>
        </select>
        <input type="number" v-model.number="presetNodes" style="width: 50px" title="Nodes" />
        <button @click="loadPresetNetwork">动态生成</button>
      </span>
    </div>
    <cy-editor
      ref="demoEditor"
      class="cy-editor"
      :network="networkValue"
      :cy-config="cyConfig"
      :editor-config="editorConfig"
      @network-change="handleNetworkChange"
      @show-json="logNetwork"
      @select="handleSelect"
      @unselect="handleUnselect"
    />
    
    <!-- Inspector Panel -->
    <div v-if="selectedData" class="inspector-panel">
      <div class="preview-title">Element Info</div>
      <json-viewer
        :value="selectedData"
        :expand-depth="2"
        boxed
        sort
      ></json-viewer>
    </div>

    <div class="network-preview">
      <div class="preview-title">实时 Network JSON</div>
      <json-viewer
        :value="latestNetwork || networkValue"
        :expand-depth="1"
        boxed
        sort
      ></json-viewer>
    </div>

    <!-- Modal for Full JSON Log -->
    <div v-if="showLogModal" class="modal-overlay" @click.self="showLogModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Current Network JSON</h3>
          <button @click="showLogModal = false">Close</button>
        </div>
        <div class="modal-body">
          <json-viewer
            :value="latestNetwork || networkValue"
            :expand-depth="2"
            boxed
            sort
          ></json-viewer>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import cyEditor from './cyeditor.js'
import { loadNetworks, resetNetwork, advanceTo, addNetwork, loadPreset } from '../src/api/networkService'
import JsonViewer from 'vue-json-viewer'

export default {
  name: 'App',
  components: {
    cyEditor,
    JsonViewer
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
        lineType: 'taxi',
        elementsInfo: false // Disable default panel in favor of our custom one
      },
      advanceCycle: 100,
      advanceMode: 'step',
      connected: false,
      ws: null,
      presetName: 'bi_ring',
      presetNodes: 16,
      showLogModal: false,
      selectedData: null,
      selectedExample: ''
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
          console.log('WS Update - cycle:', data.cycle)

          // 更新数据但不重新加载网络（避免重置位置）
          this.networkValue = data
          this.latestNetwork = data

          // 不调用 loadNetwork，只更新必要的状态数据
          // loadNetwork 会重置所有节点位置，我们应该避免这样做
          // const editorComponent = this.$refs.demoEditor
          // if (editorComponent && editorComponent.cyEditor) {
          //   editorComponent.cyEditor.loadNetwork(this.networkValue)
          // }
        } catch (e) {
          console.error('WS Message Error:', e)
        }
      }
    },
    handleNetworkChange ({ network }) {
      this.latestNetwork = network
    },
    logNetwork () {
      this.showLogModal = true
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
    },
    async loadPresetNetwork () {
      try {
        console.log(`Loading preset: ${this.presetName} with ${this.presetNodes} nodes`)
        await loadPreset(this.presetName, { nodes: this.presetNodes })
        await this.refreshNetwork()
        this.advanceCycle = 100
        this.advanceMode = 'step'
      } catch (e) {
        console.error('Load preset failed', e)
        alert('Load preset failed: ' + e.message)
      }
    },
    async loadExampleNetwork () {
      try {
        if (!this.selectedExample) {
          alert('请先选择一个示例网络')
          return
        }

        console.log(`Loading example: ${this.selectedExample}`)

        // 直接从本地文件加载 JSON
        const response = await fetch(`/${this.selectedExample}`)
        if (!response.ok) {
          throw new Error(`Failed to load example: ${response.statusText}`)
        }

        const exampleNetwork = await response.json()
        console.log('Loaded example network:', exampleNetwork)

        // 更新本地显示
        this.networkValue = exampleNetwork
        this.latestNetwork = exampleNetwork

        // 更新 CyEditor 显示
        const editorComponent = this.$refs.demoEditor
        if (editorComponent && editorComponent.cyEditor) {
          editorComponent.cyEditor.loadNetwork(exampleNetwork)
        }

        console.log('✓ 示例网络加载成功，点击 "Build & Deploy" 以部署到后端')
      } catch (e) {
        console.error('Load example failed', e)
        alert('加载示例失败: ' + e.message)
      }
    },
    handleSelect (data) {
      if (data && data.custom) {
        // Merge top-level important fields with custom rich data
        this.selectedData = {
          id: data.id,
          name: data.name,
          ...data.custom
        }
      } else {
        this.selectedData = data
      }
    },
    handleUnselect () {
      this.selectedData = null
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
    min-height: 100px;
  }

  .inspector-panel {
    position: absolute;
    top: 60px; /* Below actions */
    right: 20px;
    width: 300px;
    background: white;
    box-shadow: -2px 0 8px rgba(0,0,0,0.1);
    border: 1px solid #eee;
    padding: 10px;
    border-radius: 4px;
    max-height: 500px;
    overflow-y: auto;
    z-index: 900;
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

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .modal-body {
    overflow-y: auto;
    flex: 1;
  }
</style>
