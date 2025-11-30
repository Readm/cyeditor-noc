/**
 * Tests for networkMapper utility
 */

import { networkToDisplay, displayToNetwork } from '../src/utils/networkMapper'

describe('networkMapper', () => {
  describe('networkToDisplay', () => {
    test('should convert empty network to display format', () => {
      const result = networkToDisplay({})
      expect(result).toEqual({
        zoom: 1,
        pan: { x: 0, y: 0 },
        elements: {
          nodes: [],
          edges: []
        }
      })
    })

    test('should convert network with nodes to display format', () => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: ['feature1'],
          display: {
            type: 'round-rectangle',
            name: 'Node 1',
            width: 100,
            height: 50,
            id: 'node-1',
            position: { x: 10, y: 20 },
            bg: '#1890FF'
          }
        }],
        edges: []
      }

      const result = networkToDisplay(network)
      expect(result.elements.nodes).toHaveLength(1)
      expect(result.elements.nodes[0].data.id).toBe('node-1')
      expect(result.elements.nodes[0].data.type).toBe('round-rectangle')
      expect(result.elements.nodes[0].data.name).toBe('Node 1')
      expect(result.elements.nodes[0].position).toEqual({ x: 10, y: 20 })
    })

    test('should convert network with edges to display format', () => {
      const network = {
        nodes: [
          { node_id: 1, node_name: 'Node 1', node_features: [], display: { id: 'n1', type: 'ellipse', width: 50, height: 50, position: { x: 0, y: 0 } } },
          { node_id: 2, node_name: 'Node 2', node_features: [], display: { id: 'n2', type: 'ellipse', width: 50, height: 50, position: { x: 100, y: 0 } } }
        ],
        edges: [{
          edge_id: 1,
          src_node_id: 1,
          dst_node_id: 2,
          src_port_id: 0,
          dst_port_id: 0,
          packet_types: [],
          display: {
            data: {
              id: 'e1',
              source: 'n1',
              target: 'n2',
              lineType: 'bezier'
            },
            position: { x: 50, y: 25 }
          }
        }]
      }

      const result = networkToDisplay(network)
      expect(result.elements.edges).toHaveLength(1)
      expect(result.elements.edges[0].data.id).toBe('e1')
      expect(result.elements.edges[0].data.source).toBe('n1')
      expect(result.elements.edges[0].data.target).toBe('n2')
    })

    test('should generate display IDs when missing', () => {
      const network = {
        nodes: [{
          node_id: 1,
          node_name: 'Node',
          node_features: [],
          display: {
            type: 'ellipse',
            width: 50,
            height: 50,
            position: { x: 0, y: 0 }
          }
        }]
      }

      const result = networkToDisplay(network)
      expect(result.elements.nodes[0].data.id).toBe('1')
    })

    test('should preserve zoom and pan', () => {
      const network = {
        zoom: 0.5,
        pan: { x: 100, y: 200 },
        nodes: [],
        edges: []
      }

      const result = networkToDisplay(network)
      expect(result.zoom).toBe(0.5)
      expect(result.pan).toEqual({ x: 100, y: 200 })
    })
  })

  describe('displayToNetwork', () => {
    test('should convert empty display to network format', () => {
      const result = displayToNetwork({}, {})
      expect(result.nodes).toEqual([])
      expect(result.edges).toEqual([])
    })

    test('should convert display nodes to network format', () => {
      const display = {
        elements: {
          nodes: [{
            data: {
              id: 'node-1',
              type: 'round-rectangle',
              name: 'Test Node',
              width: 100,
              height: 50,
              bg: '#1890FF'
            },
            position: { x: 10, y: 20 }
          }],
          edges: []
        }
      }

      const result = displayToNetwork(display, {})
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].node_id).toBe(1)
      expect(result.nodes[0].node_name).toBe('Test Node')
      expect(result.nodes[0].display.id).toBe('node-1')
      expect(result.nodes[0].display.type).toBe('round-rectangle')
      expect(result.nodes[0].display.position).toEqual({ x: 10, y: 20 })
    })

    test('should convert display edges to network format', () => {
      const display = {
        elements: {
          nodes: [
            { data: { id: 'n1', type: 'ellipse', width: 50, height: 50 }, position: { x: 0, y: 0 } },
            { data: { id: 'n2', type: 'ellipse', width: 50, height: 50 }, position: { x: 100, y: 0 } }
          ],
          edges: [{
            data: {
              id: 'e1',
              source: 'n1',
              target: 'n2',
              lineType: 'bezier'
            },
            position: { x: 50, y: 25 }
          }]
        }
      }

      const result = displayToNetwork(display, {})
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].edge_id).toBe(1)
      expect(result.edges[0].display.data.id).toBe('e1')
      expect(result.edges[0].display.data.source).toBe('n1')
      expect(result.edges[0].display.data.target).toBe('n2')
    })

    test('should update existing network nodes', () => {
      const baseNetwork = {
        nodes: [{
          node_id: 1,
          node_name: 'Original Name',
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

      const display = {
        elements: {
          nodes: [{
            data: {
              id: 'node-1',
              type: 'round-rectangle',
              name: 'Updated Name',
              width: 100,
              height: 50
            },
            position: { x: 10, y: 20 }
          }],
          edges: []
        }
      }

      const result = displayToNetwork(display, baseNetwork)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].node_id).toBe(1)
      expect(result.nodes[0].node_name).toBe('Updated Name')
      expect(result.nodes[0].display.type).toBe('round-rectangle')
      expect(result.nodes[0].display.position).toEqual({ x: 10, y: 20 })
    })

    test('should link edges to nodes by display ID', () => {
      const display = {
        elements: {
          nodes: [
            { data: { id: 'n1', type: 'ellipse', width: 50, height: 50 }, position: { x: 0, y: 0 } },
            { data: { id: 'n2', type: 'ellipse', width: 50, height: 50 }, position: { x: 100, y: 0 } }
          ],
          edges: [{
            data: {
              id: 'e1',
              source: 'n1',
              target: 'n2',
              lineType: 'bezier'
            },
            position: { x: 50, y: 25 }
          }]
        }
      }

      const result = displayToNetwork(display, {})
      expect(result.edges[0].src_node_id).toBe(1)
      expect(result.edges[0].dst_node_id).toBe(2)
    })

    test('should preserve zoom and pan', () => {
      const display = {
        zoom: 0.5,
        pan: { x: 100, y: 200 },
        elements: {
          nodes: [],
          edges: []
        }
      }

      const result = displayToNetwork(display, {})
      expect(result.zoom).toBe(0.5)
      expect(result.pan).toEqual({ x: 100, y: 200 })
    })

    test('should handle round-trip conversion', () => {
      const originalNetwork = {
        nodes: [{
          node_id: 1,
          node_name: 'Test Node',
          node_features: ['feature1'],
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

      const display = networkToDisplay(originalNetwork)
      const convertedNetwork = displayToNetwork(display, {})

      expect(convertedNetwork.nodes[0].node_id).toBe(1)
      expect(convertedNetwork.nodes[0].node_name).toBe('Node 1')
      expect(convertedNetwork.nodes[0].display.id).toBe('node-1')
      expect(convertedNetwork.nodes[0].display.type).toBe('round-rectangle')
      expect(convertedNetwork.nodes[0].display.position).toEqual({ x: 10, y: 20 })
      expect(convertedNetwork.zoom).toBe(0.7)
      expect(convertedNetwork.pan).toEqual({ x: 50, y: 100 })
    })
  })
})

