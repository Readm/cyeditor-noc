const DEFAULT_PAN = { x: 0, y: 0 }
const DEFAULT_ZOOM = 1

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}))

const generateId = (prefix = 'id') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`

const pickPosition = (position = {}) => {
  const { x = 0, y = 0 } = position || {}
  return { x, y }
}

const buildNodeDisplayFromNetwork = (node) => {
  const display = Object.assign({}, node.display || {})
  const position = pickPosition(display.position)
  delete display.position

  const data = Object.assign({}, display)
  data.id = data.id || (node.node_id != null ? String(node.node_id) : generateId('node'))

  return {
    data,
    position
  }
}

const buildEdgeDisplayFromNetwork = (edge, nodeIdToDisplayId) => {
  const display = Object.assign({}, edge.display || {})
  const data = Object.assign({}, display.data || {})
  const position = pickPosition(display.position)

  const edgeId = data.id || (edge.edge_id != null ? String(edge.edge_id) : generateId('edge'))
  data.id = edgeId

  if (!data.source && edge.src_node_id != null) {
    data.source = nodeIdToDisplayId.get(edge.src_node_id) || String(edge.src_node_id)
  }
  if (!data.target && edge.dst_node_id != null) {
    data.target = nodeIdToDisplayId.get(edge.dst_node_id) || String(edge.dst_node_id)
  }
  if (!data.lineType) {
    data.lineType = 'bezier'
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

const createDefaultEdge = (edgeId, srcNodeId, dstNodeId) => ({
  edge_id: edgeId,
  src_node_id: srcNodeId || 0,
  src_port_id: 0,
  dst_node_id: dstNodeId || 0,
  dst_port_id: 0,
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
  display.data.id = display.data.id || (edge.edge_id != null ? String(edge.edge_id) : generateId('edge'))
  return display
}

const getNextNumericId = (usedIds, start = 1) => {
  let candidate = start
  while (usedIds.has(candidate)) {
    candidate++
  }
  return candidate
}

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
      edge = createDefaultEdge(nextEdgeId)
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
  })

  network.zoom = displayState.zoom || network.zoom || DEFAULT_ZOOM
  network.pan = pickPosition(displayState.pan || network.pan || DEFAULT_PAN)

  return network
}

export default {
  networkToDisplay,
  displayToNetwork
}

