<template>
  <div class="x6-editor-wrapper">
    <graph-toolbar
      @zoomIn="handleZoomIn"
      @zoomOut="handleZoomOut"
      @fit="handleFit"
      @layout="handleLayout"
      @export="handleExport"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @undo="handleUndo"
      @redo="handleRedo"
      @copy="handleCopy"
      @paste="handlePaste"
    />
    <div class="x6-editor-container" ref="container" tabindex="0"></div>
    <context-menu
      :visible="contextMenuVisible"
      :x="contextMenuPos.x"
      :y="contextMenuPos.y"
      :items="contextMenuItems"
      @item-click="handleContextMenuAction"
    />
  </div>
</template>

<script>
import { Graph, Shape, History, Keyboard, Clipboard, Selection } from '@antv/x6'
import { register } from '@antv/x6-vue-shape'
import { x6ToNetwork } from '../utils/networkMapper'
// import { GridLayout, CircularLayout, DagreLayout } from '@antv/layout' // Disable to avoid build issues
import SimpleNode from '../components/SimpleNode.vue'
import GraphToolbar from '../components/GraphToolbar.vue'
import ContextMenu from '../components/ContextMenu.vue'

// Register the custom Vue node
register({
  shape: 'custom-vue-node',
  width: 150,
  height: 80,
  component: SimpleNode
})

export default {
  name: 'X6Editor',
  components: {
    GraphToolbar,
    ContextMenu
  },
  props: {
    network: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    }
  },
  data () {
    return {
      graph: null,
      contextMenuVisible: false,
      contextMenuPos: { x: 0, y: 0 },
      contextMenuItems: [],

      isLoading: false,
      isInternalUpdate: false,
      canUndo: false,
      canRedo: false
    }
  },
  mounted () {
    console.log('X6Editor mounted')
    try {
      this.initGraph()
    } catch (error) {
      console.error('X6Editor Initialization Error:', error)
      alert('X6Editor Init Error: ' + error.message)
    }
  },
  watch: {
    network: {
      deep: true,
      handler (val) {
        if (this.isInternalUpdate) {
          this.isInternalUpdate = false
          return
        }
        if (this.graph) {
          this.renderNetwork(val)
        }
      }
    }
  },
  methods: {
    initGraph () {
      if (!this.$refs.container) return

      this.graph = new Graph({
        container: this.$refs.container,
        width: 800,
        height: 600,
        grid: true,
        scroller: {
          enabled: true,
          pannable: true,
          pageVisible: true,
          pageBreak: false
        },
        mousewheel: {
          enabled: true,
          zoomAtMousePosition: true,
          modifiers: 'ctrl',
          minScale: 0.5,
          maxScale: 3
        },
        connecting: {
          router: 'manhattan',
          connector: {
            name: 'rounded',
            args: {
              radius: 8
            }
          },
          anchor: 'center',
          connectionPoint: 'anchor',
          allowBlank: false,
          snap: {
            radius: 20
          },
          createEdge () {
            return new Shape.Edge({
              attrs: {
                line: {
                  stroke: '#A2B1C3',
                  strokeWidth: 2,
                  targetMarker: {
                    name: 'block',
                    width: 12,
                    height: 8
                  }
                }
              },
              zIndex: 0
            })
          },
          validateConnection ({ targetMagnet }) {
            return !!targetMagnet
          }
        }
      })

      // Register Plugins Explicitly
      this.graph.use(new History({ enabled: true }))
      this.graph.use(new Clipboard({ enabled: true, useLocalStorage: false }))
      this.graph.use(new Keyboard({ enabled: true }))
      this.graph.use(new Selection({
        enabled: true,
        showNodeSelectionBox: true,
        multiple: true,
        rubberband: true,
        modifiers: ['shift', 'ctrl', 'meta']
      }))
      this.graph.on('selection:changed', ({ selected }) => {
        console.log('Selection Changed:', selected.length)
      })

      // Force Enablement (Legacy/Safety Check)
      if (this.graph.enableHistory) this.graph.enableHistory()
      if (this.graph.enableClipboard) this.graph.enableClipboard()
      if (this.graph.enableKeyboard) this.graph.enableKeyboard()
      if (this.graph.enableSelection) this.graph.enableSelection()

      console.log('DEBUG: History Enabled?', this.graph.isHistoryEnabled ? this.graph.isHistoryEnabled() : 'Unknown')
      console.log('DEBUG: Clipboard Enabled?', this.graph.isClipboardEnabled ? this.graph.isClipboardEnabled() : 'Unknown')

      this.handleFit()

      // Debug: Check API availability
      console.log('Graph API Check:')
      console.log('canUndo:', typeof this.graph.canUndo)
      console.log('undo:', typeof this.graph.undo)
      console.log('copy:', typeof this.graph.copy)
      console.log('paste:', typeof this.graph.paste)

      // Bind Shortcuts

      // Bind Shortcuts
      // Copy
      this.graph.bindKey(['ctrl+c', 'meta+c'], () => {
        const cells = this.graph.getSelectedCells()
        if (cells.length) {
          this.graph.copy(cells)
        }
        return false
      })

      // Paste
      this.graph.bindKey(['ctrl+v', 'meta+v'], () => {
        if (!this.graph.isClipboardEmpty()) {
          const cells = this.graph.paste({ offset: 32 })
          this.graph.cleanSelection()
          this.graph.select(cells)
        }
        return false
      })

      // Undo
      this.graph.bindKey(['ctrl+z', 'meta+z'], () => {
        if (this.graph.canUndo()) {
          this.graph.undo()
        }
        return false
      })

      // Redo
      this.graph.bindKey(['ctrl+shift+z', 'meta+shift+z', 'ctrl+y', 'meta+y'], () => {
        if (this.graph.canRedo()) {
          this.graph.redo()
        }
        return false
      })

      // History Change Listener
      this.graph.on('history:change', () => {
        const undo = this.graph.canUndo()
        const redo = this.graph.canRedo()
        console.log('History Changed. Undo:', undo, 'Redo:', redo)
        this.canUndo = undo
        this.canRedo = redo
      })

      // Setup events
      this.graph.on('node:click', ({ node }) => {
        this.contextMenuVisible = false // Close menu on click
        this.$emit('select', {
          type: 'node',
          id: node.id,
          data: node.getData()
        })
      })

      this.graph.on('blank:click', () => {
        this.contextMenuVisible = false
        this.$emit('unselect')
      })

      // Context Menu Logic
      const showMenu = ({ x, y, cell }) => {
        const p = this.graph.localToClient(x, y) // Convert to browser coordinates
        this.contextMenuPos = { x: p.x, y: p.y }
        this.contextMenuVisible = true

        if (cell && cell.isNode()) {
          this.contextMenuItems = [
            { label: 'Rename', action: 'rename' },
            { label: 'Connect', action: 'connect', separator: true },
            { label: 'Delete Node', action: 'delete' }
          ]
          this._targetCell = cell
        } else if (cell && cell.isEdge()) {
          this.contextMenuItems = [
            { label: 'Delete Edge', action: 'delete' }
          ]
          this._targetCell = cell
        } else {
          // Blank area
          this.contextMenuItems = [
            { label: 'Add Node', action: 'add-node' },
            { label: 'Reset Zoom', action: 'reset-zoom', separator: true },
            { label: 'Fit Content', action: 'fit' }
          ]
          this._targetCell = null
          this._clickPos = { x, y }
        }
      }

      this.graph.on('cell:contextmenu', ({ e, x, y, cell }) => {
        showMenu({ x, y, cell })
      })

      this.graph.on('blank:contextmenu', ({ e, x, y }) => {
        showMenu({ x, y, cell: null })
      })

      // Data Sync Logic
      const triggerSync = () => {
        if (this.isLoading) return // Prevent sync during load

        const x6Data = this.graph.toJSON()
        const newNetwork = x6ToNetwork(x6Data, this.network)

        this.isInternalUpdate = true // Mark as internal to avoid re-render loop
        this.$emit('network-change', { network: newNetwork })
        console.log('Network synced from X6')
      }

      this.graph.on('node:mouseup', triggerSync) // Drag end
      this.graph.on('edge:connected', triggerSync) // New connection
      this.graph.on('cell:removed', triggerSync) // Deletion
      this.graph.on('node:change:data', triggerSync) // Data change
      this.graph.on('node:resized', triggerSync) // Resize
      this.graph.on('cell:added', triggerSync) // Creation

      this.triggerSync = triggerSync // Expose for internal calls

      // Global click to close menu
      document.addEventListener('click', this.closeContextMenu)

      // Initial Render
      if (this.network) {
        this.renderNetwork(this.network)
      }
    },
    closeContextMenu () {
      this.contextMenuVisible = false
    },
    handleContextMenuAction (item) {
      this.contextMenuVisible = false
      const action = item.action
      const cell = this._targetCell

      if (action === 'delete' && cell) {
        this.graph.removeCell(cell)
      } else if (action === 'fit') {
        this.handleFit()
      } else if (action === 'reset-zoom') {
        this.graph.zoomTo(1)
        this.graph.centerContent()
      } else if (action === 'add-node') {
        // Add node at click position
        const { x, y } = this._clickPos || { x: 0, y: 0 }
        this.graph.addNode({
          shape: 'custom-vue-node',
          x: x,
          y: y,
          data: {
            label: 'New Node',
            node_id: Date.now()
          }
        })
      } else if (action === 'rename' && cell) {
        const newName = prompt('Enter new name:', cell.getData().label)
        if (newName) {
          const data = cell.getData()
          cell.setData({ ...data, label: newName })
        }
      }
    },

    renderNetwork (network) {
      if (!network) return

      this.isLoading = true
      try {
        console.log('Rendering network with nodes:', (network.nodes || []).length)
        // Simple Mapper: Network JSON -> X6 Cells
        const nodes = (network.nodes || []).map(node => {
          // Safe position check
          const x = node.display && node.display.position ? node.display.position.x : Math.random() * 800
          const y = node.display && node.display.position ? node.display.position.y : Math.random() * 600

          return {
            id: String(node.node_id),
            shape: 'custom-vue-node',
            x: x,
            y: y,
            data: {
              label: node.node_name || `Node ${node.node_id}`,
              node_id: node.node_id,
              ...node
            }
          }
        })

        const edges = (network.edges || []).map(edge => ({
          id: `edge-${edge.edge_id}`,
          source: String(edge.src_node_id),
          target: String(edge.dst_node_id),
          label: `${edge.src_port_id} -> ${edge.dst_port_id}`
        }))

        this.graph.fromJSON({ nodes, edges })

        // If no positions, run layout
        if (network.nodes && network.nodes.length > 0 && !network.nodes[0].display) {
          this.handleLayout('grid')
        }
      } finally {
        this.isLoading = false
      }
    },
    handleZoomIn () {
      this.graph.zoomTo(this.graph.zoom() + 0.1)
    },
    handleZoomOut () {
      this.graph.zoomTo(this.graph.zoom() - 0.1)
    },
    handleFit () {
      this.graph.zoomToFit({ padding: 20 })
    },
    handleExport () {
      const data = this.graph.toJSON()
      console.log('Export:', data)
      alert('Graph data linked to console')
    },
    handleUndo () {
      if (this.graph.canUndo()) {
        this.graph.undo()
      }
    },
    handleRedo () {
      if (this.graph.canRedo()) {
        this.graph.redo()
      }
    },
    handleCopy () {
      const cells = this.graph.getSelectedCells()
      if (cells.length) {
        this.graph.copy(cells)
        console.log('Copied via toolbar')
      }
    },
    handlePaste () {
      if (!this.graph.isClipboardEmpty()) {
        const cells = this.graph.paste({ offset: 32 })
        this.graph.cleanSelection()
        this.graph.select(cells)
        console.log('Pasted via toolbar')
      }
    },
    handleLayout (type) {
      const nodes = this.graph.getNodes()
      const edges = this.graph.getEdges()
      if (nodes.length === 0) return

      this.isLoading = true // Prevent sync during layout calc

      try {
        if (type === 'grid') {
          const cols = Math.ceil(Math.sqrt(nodes.length))
          const sep = 180
          nodes.forEach((node, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            node.position(col * sep + 50, row * sep + 50)
          })
        } else if (type === 'circular') {
          const radius = 200 + nodes.length * 15
          const center = { x: 400, y: 300 }
          const step = (2 * Math.PI) / nodes.length

          nodes.forEach((node, i) => {
            const angle = i * step
            const x = center.x + radius * Math.cos(angle)
            const y = center.y + radius * Math.sin(angle)
            node.position(x, y)
          })
        } else if (type === 'dagre') {
          // Manual Layered Layout (Simplified BFS)
          const visited = new Set()
          const queue = []
          const layers = new Map() // nodeId -> level

          // 1. Find roots (in-degree 0)
          const inDegree = new Map()
          edges.forEach(e => {
            const target = e.getTargetCellId()
            inDegree.set(target, (inDegree.get(target) || 0) + 1)
          })

          nodes.forEach(n => {
            if (!inDegree.has(n.id)) {
              queue.push({ id: n.id, level: 0 })
              visited.add(n.id)
            }
          })

          // If no roots (cycle), pick first
          if (queue.length === 0 && nodes.length > 0) {
            queue.push({ id: nodes[0].id, level: 0 })
            visited.add(nodes[0].id)
          }

          // 2. BFS
          while (queue.length > 0) {
            const { id, level } = queue.shift()
            layers.set(id, level)

            // Find neighbors
            const outEdges = edges.filter(e => e.getSourceCellId() === id)
            outEdges.forEach(e => {
              const targetId = e.getTargetCellId()
              if (!visited.has(targetId)) {
                visited.add(targetId)
                queue.push({ id: targetId, level: level + 1 })
              }
            })
          }

          // Handle disconnected/cycles
          nodes.forEach(n => {
            if (!visited.has(n.id)) {
              layers.set(n.id, 0) // Default to 0
            }
          })

          // 3. Position by level
          const levelGroups = {}
          layers.forEach((level, id) => {
            if (!levelGroups[level]) levelGroups[level] = []
            levelGroups[level].push(id)
          })

          const levelHeight = 150
          const nodeWidth = 180

          Object.keys(levelGroups).forEach(level => {
            const ids = levelGroups[level]
            const totalWidth = ids.length * nodeWidth
            const startX = 400 - totalWidth / 2

            ids.forEach((id, index) => {
              const node = this.graph.getCellById(id)
              if (node) {
                node.position(startX + index * nodeWidth, level * levelHeight + 50)
              }
            })
          })
        }

        this.graph.zoomToFit({ padding: 20 })
      } finally {
        this.isLoading = false
        // Trigger sync after layout
        this.triggerSync()
      }
    },
    updateCellData (id, data) {
      if (!this.graph) return
      const cell = this.graph.getCellById(id)
      if (cell) {
        cell.setData(data)
        console.log('Updated cell data:', id, data)
      }
    }
  },
  beforeDestroy () {
    document.removeEventListener('click', this.closeContextMenu)
    if (this.graph) {
      this.graph.dispose()
    }
  }
}
</script>

<style scoped>
.x6-editor-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f0f0f0;
}

.x6-editor-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
