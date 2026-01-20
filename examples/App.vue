<template>
  <div class="app-layout">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Unified Toolbar Container -->
      <div id="unified-toolbar" class="unified-toolbar">
        <!-- App Actions Section -->
        <div class="app-actions">
          <button @click="resetNetwork">Reset</button>

          <span class="divider">
            <button @click="toggleMode" style="font-size: 12px; min-width: 90px;">
              {{ advanceMode === 'step' ? 'Mode: Step' : 'Mode: Target' }} ↻
            </button>
            <input type="number" v-model="advanceCycle" style="width: 70px" />
            <button class="btn-advance" @click="advanceSimulation">
              {{ advanceMode === 'step' ? 'Step' : 'Advance To' }}
            </button>
          </span>

          <div v-if="connected" style="color: green; margin-left: 10px; align-self: center;">●</div>
          <div v-else style="color: red; margin-left: 10px; align-self: center;">○</div>

          <span class="divider">
            <select v-model="selectedExample" style="min-width: 150px;">
              <option value="">-- 选择示例网络 --</option>
              <option value="ring_4node.json">环形网络 (4节点)</option>
              <option value="ring_8node.json">环形网络 (8节点)</option>
              <option value="ring_16node.json">环形网络 (16节点)</option>
              <option value="multi_edge_demo.json">多边示例 (2节点)</option>
            </select>
            <button @click="loadExampleNetwork" :disabled="!selectedExample">加载示例</button>
          </span>
        </div>
      </div>

      <x6-editor
        v-if="appMounted"
        ref="x6Editor"
        class="main-editor"
        :network="networkValue"
        @select="handleSelect" 
        @network-change="handleNetworkChange"
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
        <span v-if="!sidebarCollapsed" class="sidebar-title">Properties</span>
        <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expand' : 'Collapse'">
          {{ sidebarCollapsed ? '◀' : '▶' }}
        </button>
      </div>

      <div class="sidebar-content" v-show="!sidebarCollapsed">
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
import { loadNetworks, resetNetwork, advanceTo, addNetwork } from '../src/api/networkService'
import JsonViewer from 'vue-json-viewer'
import NodePropertyPanel from '../src/components/NodePropertyPanel.vue'
import EdgePropertyPanel from '../src/components/EdgePropertyPanel.vue'
import X6Editor from '../src/lib/X6Editor.vue'

export default {
  name: 'App',
  components: {
    JsonViewer,
    NodePropertyPanel,
    EdgePropertyPanel,
    X6Editor
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
      sidebarCollapsed: false,
      advanceCycle: 100,
      advanceMode: 'step',
      connected: false,
      ws: null,
      showLogModal: false,
      selectedData: null,
      selectedExample: '',
      selectedElement: null, // { group: 'nodes'|'edges', data: {...}, displayId: ... }
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
    
    // Delay rendering Editor until DOM (including sidebar) is ready
    this.$nextTick(async () => {
      this.appMounted = true
      
      // Load initial network
      await this.refreshNetwork() 
      
      // Expose app instance for E2E testing
      this.exposeAppForTest()
    })
  },
  beforeDestroy () {
    if (this.ws) {
      this.ws.close()
    }
    window.removeEventListener('resize', this.resizeEditor)
  },
  methods: {
    exposeAppForTest () {
      // Always expose app
      window.app = this
      console.log('E2E: window.app exposed for automated testing')
    },
    setupWebSocket () {
      // Use proxy: connect to same host/port as the web page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
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

          // Preserve positions from current state to prevent reset
          if (this.latestNetwork && this.latestNetwork.nodes && data.nodes) {
             const currentNodesMap = new Map(this.latestNetwork.nodes.map(n => [n.node_id, n]))
             data.nodes.forEach(node => {
                 const current = currentNodesMap.get(node.node_id)
                 if (current && current.display && current.display.position) {
                     if (!node.display) node.display = {}
                     // Keep current position
                     node.display.position = current.display.position
                 }
             })
          }

          // Update data but rely on X6Editor verify implementation to avoid re-layout if unnecessary
          this.networkValue = data
          this.latestNetwork = data
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
        }
      } catch (e) {
        console.error('Failed to load network:', e)
      }
    },
    async resetNetwork () {
      try {
        await resetNetwork({})
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
        // Auto-build before advancing
        console.log('Auto-building network before advance...')
        await this.buildNetwork()

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

        console.log('✓ 示例网络加载成功，点击 "Build & Deploy" 以部署到后端')
      } catch (e) {
        console.error('Load example failed', e)
        alert('加载示例失败: ' + e.message)
      }
    },
    handleSelect (data) {
       this.selectedData = data
       
       if (data) {
           this.selectedElement = {
             group: data.type === 'node' ? 'nodes' : 'edges',
             data: data.data,
             displayId: data.id
           }
           console.log('Selection:', this.selectedElement)
       }
    },
    handleUnselect () {
      this.selectedData = null
      this.selectedElement = null
    },
    handlePropertySave (updatedData) {
      console.log('Property saved:', updatedData)

      if (!this.selectedElement) return

      const editor = this.$refs.x6Editor
      if (editor) {
          editor.updateCellData(this.selectedElement.displayId, updatedData)
      }
      this.selectedElement.data = updatedData
    },
    handlePropertyCancel () {
      console.log('Property edit cancelled')
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

  .unified-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #eaeaea;
    gap: 16px;
  }

  .app-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    border-right: 2px solid #f0f0f0;
    padding-right: 16px;
  }

  .unified-toolbar button {
    padding: 5px 12px;
    cursor: pointer;
    font-size: 13px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 3px;
    transition: all 0.2s;
  }
  
  .unified-toolbar button:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .divider {
    border-left: 1px solid #eaeaea;
    padding-left: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .main-editor {
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
    width: 100%;
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
