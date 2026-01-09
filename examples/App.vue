<template>
  <div class="app-layout">
    <!-- Main Content Area -->
    <div class="main-content">
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
        v-if="appMounted"
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

      <div class="network-preview">
        <div class="preview-title">实时 Network JSON</div>
        <json-viewer
          :value="latestNetwork || networkValue"
          :expand-depth="1"
          boxed
          sort
        ></json-viewer>
      </div>
    </div>

    <!-- Right Sidebar -->
    <div class="right-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed" class="sidebar-title">Navigator & Properties</span>
        <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expand' : 'Collapse'">
          {{ sidebarCollapsed ? '◀' : '▶' }}
        </button>
      </div>

      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <div class="navigator-section">
          <!-- Cytoscape Navigator will be injected here -->
          <div id="navigator-container"></div>
        </div>

        <div class="property-section">
          <div v-if="selectedElement">
            <node-property-panel
              v-if="selectedElement.group === 'nodes'"
              :node-data="selectedElement.data"
              @save="handlePropertySave"
              @cancel="handlePropertyCancel"
            />
            <edge-property-panel
              v-else-if="selectedElement.group === 'edges'"
              :edge-data="selectedElement.data"
              @save="handlePropertySave"
              @cancel="handlePropertyCancel"
            />
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">👆</div>
            <div>Select a node or edge to view properties</div>
          </div>
        </div>
      </div>
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
import NodePropertyPanel from '../src/components/NodePropertyPanel.vue'
import EdgePropertyPanel from '../src/components/EdgePropertyPanel.vue'

export default {
  name: 'App',
  components: {
    cyEditor,
    JsonViewer,
    NodePropertyPanel,
    EdgePropertyPanel
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
        elementsInfo: false, // Disable default panel in favor of our custom one
        navigator: true,
        navigatorContainer: '#navigator-container' // Render navigator in our sidebar
      },
      sidebarCollapsed: false,
      advanceCycle: 100,
      advanceMode: 'step',
      connected: false,
      ws: null,
      presetName: 'bi_ring',
      presetNodes: 16,
      showLogModal: false,
      selectedData: null,
      selectedExample: '',
      selectedElement: null, // { group: 'nodes'|'edges', data: {...}, cyElement: ... }
      appMounted: false
    }
  },
  computed: {
    formattedNetwork () {
      return JSON.stringify(this.latestNetwork || this.networkValue, null, 2)
    }
  },
  async mounted () {
    this.setupWebSocket()
    
    // Delay rendering CyEditor until DOM (including sidebar) is ready
    this.$nextTick(async () => {
      this.appMounted = true // Trigger v-if for cy-editor
      
      // Load initial network
      await this.refreshNetwork() 
      
      // Expose cy instance for E2E testing
      // Wait another tick for cyReader to mount
      this.$nextTick(() => {
        const editor = this.$refs.demoEditor
        if (editor && editor.cyEditor) {
          window.cy = editor.cyEditor.cy
          window.app = this
          console.log('E2E: window.cy and window.app exposed for automated testing')
        }
      })
    })
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
       this.selectedData = data
       
       if (data) {
         // Get Cytoscape data (merge custom if exists, otherwise full data)
         const customData = data.custom || data
         
         // Get Cytoscape element for property editing
         const editorComponent = this.$refs.demoEditor
         if (editorComponent && editorComponent.cyEditor) {
           const cy = editorComponent.cyEditor.cy
           const cyElement = cy.getElementById(data.id)
           
           if (cyElement && cyElement.length > 0) {
             // Store cyElement non-reactively to avoid circular structure hang in Vue Observer
             this._selectedCyElement = cyElement
             
             this.selectedElement = {
               group: cyElement.group(), // 'nodes' or 'edges'
               data: customData,
               displayId: data.id
             }
           }
         }
       }
    },
    handleUnselect () {
      this.selectedData = null
      this.selectedElement = null
      this._selectedCyElement = null
    },
    handlePropertySave (updatedData) {
      console.log('Property saved:', updatedData)

      if (!this.selectedElement || !this._selectedCyElement) return

      // Update cytoscape element's custom data
      const cyElement = this._selectedCyElement
      cyElement.data('custom', updatedData)
      
      // Trigger network change event to update latestNetwork
      const editorComponent = this.$refs.demoEditor
      if (editorComponent && editorComponent.cyEditor) {
        // 手动触发 network-change 事件
        editorComponent.cyEditor.emitNetworkChange()
      }

      // Update selectedElement data
      this.selectedElement.data = updatedData

      console.log('✓ Properties updated in Cytoscape')
    },
    handlePropertyCancel () {
      console.log('Property edit cancelled')
      // Do nothing, form component will reset internally
    }
  }
}
</script>

<style scoped lang="stylus">
  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #f5f5f5;
    overflow-y: auto;
    gap: 16px;
  }

  .demo-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    background: #fff;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #eaeaea;
  }

  .demo-actions button {
    padding: 6px 14px;
    cursor: pointer;
  }

  .cy-editor {
    flex: 1;
    min-height: 500px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 4px;
    position: relative;
  }

  /* Sidebar Styles */
  .right-sidebar {
    width: 350px;
    background: #fff;
    border-left: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    flex-shrink: 0;
    box-shadow: -2px 0 6px rgba(0,0,0,0.05);
    z-index: 100;
  }

  .right-sidebar.collapsed {
    width: 40px;
  }

  .sidebar-header {
    height: 48px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: #fafafa;
  }
  
  .right-sidebar.collapsed .sidebar-header {
    justify-content: center;
    padding: 0;
  }

  .sidebar-title {
    font-weight: 600;
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
  }

  .toggle-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: #888;
    padding: 6px;
    border-radius: 4px;
    transition: background 0.2s;
  }
  .toggle-btn:hover {
    background: #eee;
    color: #1890ff;
  }

  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .navigator-section {
    height: 200px; /* Fixed height for navigator */
    border-bottom: 1px solid #eee;
    position: relative;
    background: #fdfdfd;
  }
  
  #navigator-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
  

  .property-section {
    flex: 1;
    overflow-y: auto; /* Scroll property panel internally */
    display: flex;
    flex-direction: column;
  }
  
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 13px;
    padding: 30px;
    text-align: center;
    background: #fcfcfc;
  }
  
  .empty-icon {
    font-size: 24px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .network-preview {
    border: 1px solid #eaeaea;
    border-radius: 6px;
    padding: 12px;
    background: #fff;
    min-height: 100px;
    /* max-height: 200px;  Let main column scroll handle it */
  }

  .network-preview pre {
    margin: 0;
    max-height: 150px;
    overflow: auto;
    font-size: 12px;
  }

  .preview-title {
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 12px;
    color: #666;
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

<style>
/* Global override for Cytoscape Navigator Plugin */
/* Must be non-scoped because the plugin elements are appended dynamically */
#navigator-container .cytoscape-navigator {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  bottom: auto !important;
  right: auto !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: transparent !important; /* Ensure container matches */
  z-index: 1 !important;
  box-shadow: none !important;
}
#navigator-container .cytoscape-navigator canvas {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}
</style>
