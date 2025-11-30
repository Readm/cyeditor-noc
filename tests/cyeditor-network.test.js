/**
 * Integration tests for CyEditor Network/Display synchronization
 */

import CyEditor from '../src/lib/index'
import { networkToDisplay, displayToNetwork } from '../src/utils/networkMapper'

// Mock cytoscape container
const createMockContainer = () => {
  const container = document.createElement('div')
  container.id = 'cy'
  container.style.width = '800px'
  container.style.height = '600px'
  document.body.appendChild(container)
  return container
}

describe('CyEditor Network/Display Integration', () => {
  let container

  beforeEach(() => {
    container = createMockContainer()
  })

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('Network loading', () => {
    test('should load Network Json and convert to Display format', () => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: [],
          display: {
            id: 'node-1',
            type: 'round-rectangle',
            name: 'Node 1',
            width: 100,
            height: 50,
            position: { x: 10, y: 20 },
            bg: '#1890FF'
          }
        }],
        edges: [],
        zoom: 0.7,
        pan: { x: 50, y: 100 }
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      editor.loadNetwork(network)

      const displayState = editor.getDisplayState()
      expect(displayState.elements.nodes).toHaveLength(1)
      expect(displayState.elements.nodes[0].data.id).toBe('node-1')
      expect(displayState.elements.nodes[0].data.type).toBe('round-rectangle')
      expect(displayState.zoom).toBe(0.7)
      expect(displayState.pan).toEqual({ x: 50, y: 100 })
    })

    test('should maintain Network state after loading', () => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: ['feature1'],
          display: {
            id: 'node-1',
            type: 'ellipse',
            width: 50,
            height: 50,
            position: { x: 0, y: 0 }
          }
        }],
        edges: []
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      editor.loadNetwork(network)

      const savedNetwork = editor.getNetwork()
      expect(savedNetwork.nodes).toHaveLength(1)
      expect(savedNetwork.nodes[0].node_id).toBe(1)
      expect(savedNetwork.nodes[0].node_name).toBe('Test Node')
      expect(savedNetwork.nodes[0].node_features).toEqual(['feature1'])
    })
  })

  describe('Display to Network synchronization', () => {
    test('should sync node shape changes to Network', (done) => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: [],
          display: {
            id: 'node-1',
            type: 'round-rectangle',
            width: 100,
            height: 50,
            position: { x: 0, y: 0 }
          }
        }],
        edges: []
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      editor.loadNetwork(network)

      // Wait for cytoscape to initialize
      setTimeout(() => {
        const node = editor.cy.$('#node-1')
        if (node.length > 0) {
          editor.changeNodeShape(node[0], 'diamond')

          setTimeout(() => {
            const updatedNetwork = editor.getNetwork()
            expect(updatedNetwork.nodes[0].display.type).toBe('diamond')
            done()
          }, 100)
        } else {
          done()
        }
      }, 100)
    })

    test('should sync node position changes to Network', (done) => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: [],
          display: {
            id: 'node-1',
            type: 'ellipse',
            width: 50,
            height: 50,
            position: { x: 0, y: 0 }
          }
        }],
        edges: []
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      editor.loadNetwork(network)

      setTimeout(() => {
        const node = editor.cy.$('#node-1')
        if (node.length > 0) {
          node.position({ x: 100, y: 200 })
          node.trigger('position')

          setTimeout(() => {
            const updatedNetwork = editor.getNetwork()
            expect(updatedNetwork.nodes[0].display.position.x).toBe(100)
            expect(updatedNetwork.nodes[0].display.position.y).toBe(200)
            done()
          }, 100)
        } else {
          done()
        }
      }, 100)
    })
  })

  describe('Network change events', () => {
    test('should emit network-change event when Network is updated', (done) => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: [],
          display: {
            id: 'node-1',
            type: 'ellipse',
            width: 50,
            height: 50,
            position: { x: 0, y: 0 }
          }
        }],
        edges: []
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      let eventReceived = false
      editor.on('network-change', (event) => {
        eventReceived = true
        expect(event.target).toBeDefined()
      })

      editor.loadNetwork(network)

      setTimeout(() => {
        expect(eventReceived).toBe(true)
        done()
      }, 100)
    })
  })

  describe('Round-trip conversion', () => {
    test('should maintain data integrity through Network -> Display -> Network cycle', () => {
      const originalNetwork = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: ['feature1', 'feature2'],
          cache: {
            capacity: 1024,
            num_sets: 4,
            replacement_policy: 'LRU',
            states: 'MESI'
          },
          display: {
            id: 'node-1',
            type: 'round-rectangle',
            name: 'Node 1',
            width: 100,
            height: 50,
            position: { x: 10, y: 20 },
            bg: '#1890FF'
          }
        }],
        edges: [],
        zoom: 0.7,
        pan: { x: 50, y: 100 }
      }

      const editor = new CyEditor({
        editor: {
          container: container,
          toolbar: false,
          dragAddNodes: false,
          navigator: false,
          elementsInfo: false
        }
      })

      editor.loadNetwork(originalNetwork)

      const displayState = editor.getDisplayState()
      const convertedNetwork = editor.getNetwork()

      expect(convertedNetwork.nodes[0].node_id).toBe(1)
      expect(convertedNetwork.nodes[0].node_name).toBe('Node 1')
      expect(convertedNetwork.nodes[0].node_features).toEqual(['feature1', 'feature2'])
      expect(convertedNetwork.nodes[0].cache).toEqual(originalNetwork.nodes[0].cache)
      expect(convertedNetwork.nodes[0].display.type).toBe('round-rectangle')
      expect(convertedNetwork.nodes[0].display.position).toEqual({ x: 10, y: 20 })
      expect(convertedNetwork.zoom).toBe(0.7)
      expect(convertedNetwork.pan).toEqual({ x: 50, y: 100 })
    })
  })
})

