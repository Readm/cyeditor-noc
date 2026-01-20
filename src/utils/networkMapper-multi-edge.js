// 多链路支持版本的 networkMapper
// 基于原 networkMapper.js,增加了对多条平行边的支持

const DEFAULT_PAN = { x: 0, y: 0 }
const DEFAULT_ZOOM = 1

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}))

const generateId = (prefix = 'id') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`

const pickPosition = (position = {}) => {
  const { x = 0, y = 0 } = position || {}
  return { x, y }
}

// 🆕 生成包含端口信息的唯一边ID
const buildEdgeDisplayId = (edge) => {
  const src = edge.src_node_id ?? 0
  const srcPort = edge.src_port_id ?? 0
  const dst = edge.dst_node_id ?? 0
  const dstPort = edge.dst_port_id ?? 0
  return `edge-${src}-p${srcPort}-${dst}-p${dstPort}`
}

// 🆕 从边ID解析端口信息
const parseEdgeDisplayId = (edgeId) => {
  // 格式: "edge-0-p1-1-p2"
  const parts = edgeId.split('-')
  if (parts.length >= 5 && parts[0] === 'edge') {
    return {
      srcNodeId: parseInt(parts[1]) || 0,
      srcPort: parseInt(parts[2].substring(1)) || 0, // 去掉 'p' 前缀
      dstNodeId: parseInt(parts[3]) || 0,
      dstPort: parseInt(parts[4].substring(1)) || 0
    }
  }
  return null
}

const buildNodeDisplayFromNetwork = (node) => {
  const display = Object.assign({}, node.display || {})
  const position = pickPosition(display.position)
  delete display.position

  const data = Object.assign({}, display)
  data.id = data.id || (node.node_id != null ? String(node.node_id) : generateId('node'))

  // Custom: Copy rich backend data to data.custom for inspection
  data.custom = {
    node_id: node.node_id,
    node_name: node.node_name,
    in_ports: node.in_ports,
    out_ports: node.out_ports,
    cache: node.cache,
    directory: node.directory,
    node_features: node.node_features,
    coherence_domain_id: node.coherence_domain_id
  }

  return {
    data,
    position
  }
}

// 🔧 修改: 支持多条平行边
const buildEdgeDisplayFromNetwork = (edge, nodeIdToDisplayId) => {
  const display = Object.assign({}, edge.display || {})
  const data = Object.assign({}, display.data || {})
  const position = pickPosition(display.position)

  // 🆕 使用包含端口信息的唯一ID
  const edgeId = buildEdgeDisplayId(edge)
  data.id = edgeId

  if (!data.source && edge.src_node_id != null) {
    data.source = nodeIdToDisplayId.get(edge.src_node_id) || String(edge.src_node_id)
  }
  if (!data.target && edge.dst_node_id != null) {
    data.target = nodeIdToDisplayId.get(edge.dst_node_id) || String(edge.dst_node_id)
  }

  // 🔧 改为 bezier 以支持平行边可视化
  if (!data.lineType) {
    data.lineType = 'bezier'
  }

  // 🆕 添加端口标签
  const srcPort = edge.src_port_id ?? 0
  const dstPort = edge.dst_port_id ?? 0
  data.label = `${srcPort}→${dstPort}`
  data.srcPort = srcPort
  data.dstPort = dstPort

  // Custom: Copy rich backend data
  data.custom = {
    edge_id: edge.edge_id,
    src_node_id: edge.src_node_id,
    dst_node_id: edge.dst_node_id,
    src_port_id: srcPort,
    dst_port_id: dstPort,
    latency: edge.latency,
    bandwidth: edge.bandwidth,
    packet_types: edge.packet_types,
    link_status: edge.link_status
  }

  return {
    data,
    position
  }
}

const buildNodeDisplayFromCy = (displayNode) => {
  const data = Object.assign({}, displayNode.data || {})
  const position = pickPosition(displayNode.position)
  const displayData = Object.assign({}, data)
  delete displayData.position

  const display = Object.assign({}, displayData)
  display.id = display.id || generateId('node')
  display.position = position
  return display
}

const buildEdgeDisplayFromCy = (displayEdge) => {
  const data = Object.assign({}, displayEdge.data || {})
  const position = pickPosition(displayEdge.position)

  const display = {
    data: {
      id: data.id || generateId('edge'),
      source: data.source,
      target: data.target,
      lineType: data.lineType || 'bezier'
    },
    position
  }

  // 🆕 保存端口信息
  if (data.srcPort != null) {
    display.data.srcPort = data.srcPort
  }
  if (data.dstPort != null) {
    display.data.dstPort = data.dstPort
  }

  if (displayEdge.link_status) {
    display.link_status = displayEdge.link_status
  }

  return display
}

export function networkToDisplay (network = {}) {
  const nodes = ensureArray(network.nodes)
  const edges = ensureArray(network.edges)
  const nodeIdToDisplayId = new Map()

  const displayNodes = nodes.map(node => {
    const displayNode = buildNodeDisplayFromNetwork(node)
    nodeIdToDisplayId.set(node.node_id, displayNode.data.id)
    return displayNode
  })

  const displayEdges = edges.map(edge => buildEdgeDisplayFromNetwork(edge, nodeIdToDisplayId))

  return {
    zoom: network.zoom || DEFAULT_ZOOM,
    pan: pickPosition(network.pan || DEFAULT_PAN),
    elements: {
      nodes: displayNodes,
      edges: displayEdges
    }
  }
}

const createDefaultNode = (nodeId) => ({
  node_id: nodeId,
  node_name: `Node ${nodeId}`,
  node_features: [],
  display: {}
})

// 🔧 修改: 支持端口参数
const createDefaultEdge = (edgeId, srcNodeId, dstNodeId, srcPort = 0, dstPort = 0) => ({
  edge_id: edgeId,
  src_node_id: srcNodeId || 0,
  src_port_id: srcPort,
  dst_node_id: dstNodeId || 0,
  dst_port_id: dstPort,
  packet_types: [],
  display: {}
})

const sanitizeNodeDisplay = (node) => {
  const display = Object.assign({}, node.display || {})
  if (!display.id) {
    display.id = node.node_id != null ? String(node.node_id) : generateId('node')
  }
  display.position = pickPosition(display.position)
  return display
}

const sanitizeEdgeDisplay = (edge) => {
  const display = Object.assign({}, edge.display || {})
  display.data = Object.assign({}, display.data || {})
  display.position = pickPosition(display.position)

  // 🆕 使用端口信息生成ID
  display.data.id = buildEdgeDisplayId(edge)

  return display
}

const getNextNumericId = (usedIds, start = 1) => {
  let candidate = start
  while (usedIds.has(candidate)) {
    candidate++
  }
  return candidate
}

// 🔧 修改: 支持多条平行边
export function displayToNetwork (displayState = {}, baseNetwork = {}) {
  const network = deepClone(baseNetwork)
  network.nodes = ensureArray(network.nodes)
  network.edges = ensureArray(network.edges)

  const displayNodes = ensureArray(displayState.elements && displayState.elements.nodes)
  const displayEdges = ensureArray(displayState.elements && displayState.elements.edges)

  const nodeByDisplayId = new Map()
  const usedNodeIds = new Set(network.nodes.map(node => node.node_id))

  network.nodes.forEach(node => {
    node.display = sanitizeNodeDisplay(node)
    nodeByDisplayId.set(node.display.id, node)
  })

  let nextNodeId = getNextNumericId(usedNodeIds, 1)

  displayNodes.forEach(displayNode => {
    const data = displayNode.data || {}
    const displayId = data.id || generateId('node')
    let node = nodeByDisplayId.get(displayId)

    if (!node) {
      node = createDefaultNode(nextNodeId)
      nextNodeId++
      network.nodes.push(node)
      nodeByDisplayId.set(displayId, node)
    }

    node.display = buildNodeDisplayFromCy({
      data,
      position: displayNode.position
    })

    if (typeof node.node_id !== 'number') {
      node.node_id = getNextNumericId(usedNodeIds, nextNodeId)
      usedNodeIds.add(node.node_id)
      nextNodeId = node.node_id + 1
    }

    if (!node.node_name) {
      node.node_name = data.name || `Node ${node.node_id}`
    }
  })

  // 🔧 修改: 每条边都有唯一ID,不会合并
  const edgeByDisplayId = new Map()
  const usedEdgeIds = new Set(network.edges.map(edge => edge.edge_id))

  network.edges.forEach(edge => {
    edge.display = sanitizeEdgeDisplay(edge)
    edgeByDisplayId.set(edge.display.data.id, edge)
  })

  let nextEdgeId = getNextNumericId(usedEdgeIds, 1)

  displayEdges.forEach(displayEdge => {
    const data = displayEdge.data || {}
    const displayId = data.id || generateId('edge')
    let edge = edgeByDisplayId.get(displayId)

    if (!edge) {
      // 🆕 从ID解析端口信息
      const parsed = parseEdgeDisplayId(displayId)
      let srcPort = data.srcPort ?? 0
      let dstPort = data.dstPort ?? 0

      if (parsed) {
        srcPort = parsed.srcPort
        dstPort = parsed.dstPort
      }

      // 🆕 从 custom 数据获取端口信息(优先级更高)
      if (data.custom) {
        if (data.custom.src_port_id != null) srcPort = data.custom.src_port_id
        if (data.custom.dst_port_id != null) dstPort = data.custom.dst_port_id
      }

      edge = createDefaultEdge(nextEdgeId, 0, 0, srcPort, dstPort)
      nextEdgeId++
      network.edges.push(edge)
      edgeByDisplayId.set(displayId, edge)
    }

    edge.display = buildEdgeDisplayFromCy({
      data,
      position: displayEdge.position,
      link_status: displayEdge.link_status
    })

    if (typeof edge.edge_id !== 'number') {
      edge.edge_id = getNextNumericId(usedEdgeIds, nextEdgeId)
      usedEdgeIds.add(edge.edge_id)
      nextEdgeId = edge.edge_id + 1
    }

    const sourceNode = nodeByDisplayId.get(data.source)
    const targetNode = nodeByDisplayId.get(data.target)

    if (sourceNode) {
      edge.src_node_id = sourceNode.node_id
    }
    if (targetNode) {
      edge.dst_node_id = targetNode.node_id
    }

    // 🆕 保存端口信息
    if (data.srcPort != null) {
      edge.src_port_id = data.srcPort
    }
    if (data.dstPort != null) {
      edge.dst_port_id = data.dstPort
    }

    // 🆕 从 custom 数据同步其他属性
    if (data.custom) {
      if (data.custom.latency != null) edge.latency = data.custom.latency
      if (data.custom.bandwidth != null) edge.bandwidth = data.custom.bandwidth
      if (data.custom.packet_types) edge.packet_types = data.custom.packet_types
    }
  })

  network.zoom = displayState.zoom || network.zoom || DEFAULT_ZOOM
  network.pan = pickPosition(displayState.pan || network.pan || DEFAULT_PAN)

  return network
}

export default {
  networkToDisplay,
  displayToNetwork,
  buildEdgeDisplayId,
  parseEdgeDisplayId
}
