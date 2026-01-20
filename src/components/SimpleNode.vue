<template>
  <div class="simple-node">
    <div class="node-header">
      <span class="status-dot"></span>
      {{ label }}
    </div>
    <div class="node-content">
      ID: {{ nodeId }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'SimpleNode',
  inject: ['getGraph', 'getNode'],
  data () {
    return {
      label: 'Node',
      nodeId: '0'
    }
  },
  mounted () {
    const node = this.getNode()
    const data = node.getData()
    this.label = data.label || 'Node'
    this.nodeId = data.node_id || node.id || '0'

    // Listen to data changes if necessary
    node.on('change:data', ({ current }) => {
      this.label = current.label
      this.nodeId = current.node_id
    })
  }
}
</script>

<style scoped>
.simple-node {
  border: 1px solid #1890ff;
  border-radius: 4px;
  background: #fff;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.node-header {
  background: #e6f7ff;
  padding: 4px 8px;
  border-bottom: 1px solid #1890ff;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  color: #1890ff;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  margin-right: 6px;
}

.node-content {
  padding: 8px;
  font-size: 12px;
  color: #666;
  flex: 1;
}
</style>
