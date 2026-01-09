/**
 * E2E 测试：属性编辑面板
 *
 * 测试流程：
 * 1. 加载示例网络
 * 2. 选择节点/边
 * 3. 编辑属性
 * 4. 保存并验证数据更新
 */

import { mount } from '@vue/test-utils'
import App from '../../examples/App.vue'
import { loadNetworks } from '../../src/api/networkService'

// Mock API
jest.mock('../../src/api/networkService', () => ({
  loadNetworks: jest.fn(),
  resetNetwork: jest.fn(),
  advanceTo: jest.fn(),
  addNetwork: jest.fn(),
  loadPreset: jest.fn()
}))

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }
  close() {}
  send() {}
}

describe('PropertyPanel E2E Tests', () => {
  let wrapper

  // 示例网络数据
  const mockNetwork = {
    version: '1.0.0',
    cycle: 0,
    nodes: [
      {
        node_id: 0,
        node_name: 'Node_0',
        node_features: ['cache'],
        coherence_domain_id: 1,
        cache: {
          capacity: 32768,
          num_sets: 64,
          replacement_policy: 'LRU',
          states: 'MESI',
          hits: 0,
          misses: 0
        },
        in_ports: [{ port_id: 0, bandwidth: 1, buffer_size: 64 }],
        out_ports: [{ port_id: 0, bandwidth: 1, buffer_size: 64 }],
        data: {
          id: 'node-0',
          label: 'N0',
          type: '*node.WorkerNode'
        },
        position: { x: 100, y: 100 }
      },
      {
        node_id: 1,
        node_name: 'Node_1',
        node_features: ['cache'],
        coherence_domain_id: 1,
        cache: {
          capacity: 32768,
          num_sets: 64,
          replacement_policy: 'LRU',
          states: 'MESI'
        },
        in_ports: [{ port_id: 0, bandwidth: 1, buffer_size: 64 }],
        out_ports: [{ port_id: 0, bandwidth: 1, buffer_size: 64 }],
        data: {
          id: 'node-1',
          label: 'N1',
          type: '*node.WorkerNode'
        },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [
      {
        edge_id: 1,
        src_node_id: 0,
        dst_node_id: 1,
        src_port_id: 0,
        dst_port_id: 0,
        latency: 10,
        bandwidth: 1,
        packet_types: [1, 2],
        data: {
          id: 'edge-0-p0-1-p0',
          source: 'node-0',
          target: 'node-1',
          lineType: 'solid'
        }
      }
    ]
  }

  beforeEach(async () => {
    loadNetworks.mockResolvedValue([mockNetwork])

    wrapper = mount(App, {
      attachTo: document.body
    })

    // 等待组件挂载和数据加载
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  describe('节点属性编辑', () => {
    test('选择节点应显示属性面板', async () => {
      // 模拟选择节点
      const nodeData = {
        id: 'node-0',
        name: 'Node_0',
        custom: mockNetwork.nodes[0]
      }

      wrapper.vm.handleSelect(nodeData)
      await wrapper.vm.$nextTick()

      // 验证属性面板显示
      expect(wrapper.vm.selectedElement).toBeTruthy()
      expect(wrapper.vm.selectedElement.group).toBe('nodes')
      expect(wrapper.vm.selectedElement.data.node_id).toBe(0)

      // 验证 NodePropertyPanel 组件存在
      const propertyPanel = wrapper.findComponent({ name: 'NodePropertyPanel' })
      expect(propertyPanel.exists()).toBe(true)
    })

    test('编辑节点基本信息', async () => {
      // 选择节点
      wrapper.vm.selectedElement = {
        group: 'nodes',
        data: { ...mockNetwork.nodes[0] },
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }
      await wrapper.vm.$nextTick()

      const propertyPanel = wrapper.findComponent({ name: 'NodePropertyPanel' })
      expect(propertyPanel.exists()).toBe(true)

      // 修改节点名称
      const updatedData = {
        ...mockNetwork.nodes[0],
        node_name: 'Node_0_Modified'
      }

      // 触发保存
      propertyPanel.vm.$emit('save', updatedData)
      await wrapper.vm.$nextTick()

      // 验证数据已更新
      expect(wrapper.vm.selectedElement.data.node_name).toBe('Node_0_Modified')
    })

    test('编辑 Cache 配置', async () => {
      wrapper.vm.selectedElement = {
        group: 'nodes',
        data: { ...mockNetwork.nodes[0] },
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }
      await wrapper.vm.$nextTick()

      // 修改 cache capacity
      const updatedData = {
        ...mockNetwork.nodes[0],
        cache: {
          ...mockNetwork.nodes[0].cache,
          capacity: 65536, // 修改为 64KB
          replacement_policy: 'FIFO' // 修改策略
        }
      }

      const propertyPanel = wrapper.findComponent({ name: 'NodePropertyPanel' })
      propertyPanel.vm.$emit('save', updatedData)
      await wrapper.vm.$nextTick()

      // 验证
      expect(wrapper.vm.selectedElement.data.cache.capacity).toBe(65536)
      expect(wrapper.vm.selectedElement.data.cache.replacement_policy).toBe('FIFO')
    })

    test('取消编辑不应改变数据', async () => {
      const originalData = { ...mockNetwork.nodes[0] }

      wrapper.vm.selectedElement = {
        group: 'nodes',
        data: originalData,
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }
      await wrapper.vm.$nextTick()

      const propertyPanel = wrapper.findComponent({ name: 'NodePropertyPanel' })
      propertyPanel.vm.$emit('cancel')
      await wrapper.vm.$nextTick()

      // 数据应该保持不变
      expect(wrapper.vm.selectedElement.data).toEqual(originalData)
    })
  })

  describe('边属性编辑', () => {
    test('选择边应显示属性面板', async () => {
      const edgeData = {
        id: 'edge-0-p0-1-p0',
        custom: mockNetwork.edges[0]
      }

      wrapper.vm.handleSelect(edgeData)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectedElement).toBeTruthy()
      expect(wrapper.vm.selectedElement.group).toBe('edges')

      const propertyPanel = wrapper.findComponent({ name: 'EdgePropertyPanel' })
      expect(propertyPanel.exists()).toBe(true)
    })

    test('编辑边配置', async () => {
      wrapper.vm.selectedElement = {
        group: 'edges',
        data: { ...mockNetwork.edges[0] },
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }
      await wrapper.vm.$nextTick()

      // 修改延迟和带宽
      const updatedData = {
        ...mockNetwork.edges[0],
        latency: 20, // 修改延迟
        bandwidth: 2  // 修改带宽
      }

      const propertyPanel = wrapper.findComponent({ name: 'EdgePropertyPanel' })
      propertyPanel.vm.$emit('save', updatedData)
      await wrapper.vm.$nextTick()

      // 验证
      expect(wrapper.vm.selectedElement.data.latency).toBe(20)
      expect(wrapper.vm.selectedElement.data.bandwidth).toBe(2)
    })
  })

  describe('数据流完整性', () => {
    test('属性修改应触发 network-change 事件', async () => {
      const mockCyEditor = {
        emitNetworkChange: jest.fn()
      }

      wrapper.vm.$refs.demoEditor = {
        cyEditor: mockCyEditor
      }

      wrapper.vm.selectedElement = {
        group: 'nodes',
        data: { ...mockNetwork.nodes[0] },
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }

      const updatedData = {
        ...mockNetwork.nodes[0],
        node_name: 'Modified'
      }

      wrapper.vm.handlePropertySave(updatedData)
      await wrapper.vm.$nextTick()

      // 验证 emitNetworkChange 被调用
      expect(mockCyEditor.emitNetworkChange).toHaveBeenCalled()
    })

    test('多次编辑应保持数据一致性', async () => {
      wrapper.vm.selectedElement = {
        group: 'nodes',
        data: { ...mockNetwork.nodes[0] },
        cyElement: {
          data: jest.fn().mockReturnThis()
        }
      }

      // 第一次编辑
      const update1 = {
        ...mockNetwork.nodes[0],
        node_name: 'First Update'
      }
      wrapper.vm.handlePropertySave(update1)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectedElement.data.node_name).toBe('First Update')

      // 第二次编辑
      const update2 = {
        ...wrapper.vm.selectedElement.data,
        cache: {
          ...wrapper.vm.selectedElement.data.cache,
          capacity: 131072
        }
      }
      wrapper.vm.handlePropertySave(update2)
      await wrapper.vm.$nextTick()

      // 验证两次修改都保留
      expect(wrapper.vm.selectedElement.data.node_name).toBe('First Update')
      expect(wrapper.vm.selectedElement.data.cache.capacity).toBe(131072)
    })
  })

  describe('边界情况', () => {
    test('未选择元素时不应显示属性面板', () => {
      expect(wrapper.vm.selectedElement).toBeNull()

      const nodePanel = wrapper.findComponent({ name: 'NodePropertyPanel' })
      const edgePanel = wrapper.findComponent({ name: 'EdgePropertyPanel' })

      expect(nodePanel.exists()).toBe(false)
      expect(edgePanel.exists()).toBe(false)
    })

    test('取消选择应隐藏属性面板', async () => {
      // 先选择
      wrapper.vm.handleSelect({
        id: 'node-0',
        custom: mockNetwork.nodes[0]
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.selectedElement).toBeTruthy()

      // 取消选择
      wrapper.vm.handleUnselect()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.selectedElement).toBeNull()
    })

    test('处理缺少 custom 数据的元素', async () => {
      const dataWithoutCustom = {
        id: 'test-node',
        name: 'Test'
      }

      wrapper.vm.handleSelect(dataWithoutCustom)
      await wrapper.vm.$nextTick()

      // 应该使用整个 data 对象
      expect(wrapper.vm.selectedData).toEqual(dataWithoutCustom)
    })
  })
})
