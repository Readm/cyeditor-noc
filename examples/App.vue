<template>
  <div class="demo-wrapper">
    <div class="demo-actions">
      <button @click="logNetwork">控制台输出 Network JSON</button>
      <button @click="resetNetwork">重置为初始 Network</button>
    </div>
    <cy-editor
      ref="demoEditor"
      class="cy-editor"
      :network="networkValue"
      :cy-config="cyConfig"
      :editor-config="editorConfig"
      @network-change="handleNetworkChange"
    />
    <div class="network-preview">
      <div class="preview-title">实时 Network JSON</div>
      <pre>{{ formattedNetwork }}</pre>
    </div>
  </div>
</template>

<script>
import cyEditor from './cyeditor.js'

const locale = 'en'
const localizationData = {
  en: {
    'start': 'Start',
    'decision': 'Decision'
  },
  cn: {
    'start': '开始',
    'decision': '条件'
  }
}

function localized (key) {
  return localizationData[locale][key]
}

const nodes = [
  {
    node_id: 1,
    node_name: localized('start'),
    node_features: [],
    display: {
      id: 'a79249d9-4d5b-43e1-b268-d389df7ed592',
      type: 'round-rectangle',
      name: localized('start'),
      resize: true,
      bg: '#1890FF',
      width: 76,
      height: 56,
      position: { x: 192.5, y: 52.5 }
    }
  },
  {
    node_id: 2,
    node_name: 'Step A',
    node_features: [],
    display: {
      id: '27e14443-0b39-446f-94e2-3e521a1706f9',
      type: 'round-rectangle',
      name: '',
      resize: true,
      bg: '#1890FF',
      width: 76,
      height: 56,
      position: { x: 87.5, y: 262.5 }
    }
  },
  {
    node_id: 3,
    node_name: localized('decision'),
    node_features: [],
    display: {
      id: '4072b83e-b702-4168-b548-56bcc52eebd9',
      type: 'diamond',
      name: localized('decision'),
      resize: true,
      bg: '#5CDBD3',
      width: 156,
      height: 52,
      position: { x: 192.5, y: 157.5 }
    }
  },
  {
    node_id: 4,
    node_name: 'Step B',
    node_features: [],
    display: {
      id: '6be4a6b0-49e2-4b2c-b3bd-135684da938a',
      type: 'round-rectangle',
      name: '',
      resize: true,
      bg: '#1890FF',
      width: 76,
      height: 56,
      position: { x: 297.5, y: 262.5 }
    }
  }
]

const edges = [
  {
    edge_id: 1,
    src_node_id: 1,
    src_port_id: 0,
    dst_node_id: 3,
    dst_port_id: 0,
    packet_types: [],
    display: {
      data: {
        id: '3e6d9858-adbe-4b73-828d-d0732ac29279',
        source: 'a79249d9-4d5b-43e1-b268-d389df7ed592',
        target: '4072b83e-b702-4168-b548-56bcc52eebd9',
        lineType: 'taxi'
      }
    }
  },
  {
    edge_id: 2,
    src_node_id: 3,
    src_port_id: 0,
    dst_node_id: 2,
    dst_port_id: 0,
    packet_types: [],
    display: {
      data: {
        id: 'b63708fe-3b53-469a-b908-4c9608112164',
        source: '4072b83e-b702-4168-b548-56bcc52eebd9',
        target: '27e14443-0b39-446f-94e2-3e521a1706f9',
        lineType: 'taxi'
      }
    }
  },
  {
    edge_id: 3,
    src_node_id: 3,
    src_port_id: 0,
    dst_node_id: 4,
    dst_port_id: 0,
    packet_types: [],
    display: {
      data: {
        id: '0c4d0dc9-a2ee-4ea5-b422-4730913a7ab1',
        source: '4072b83e-b702-4168-b548-56bcc52eebd9',
        target: '6be4a6b0-49e2-4b2c-b3bd-135684da938a',
        lineType: 'taxi'
      }
    }
  }
]

export default {
  name: 'App',
  components: {
    cyEditor
  },
  data () {
    return {
      networkValue: {
        version: '1.0.0',
        nodes,
        edges
      },
      initialNetwork: JSON.parse(JSON.stringify({
        version: '1.0.0',
        nodes,
        edges
      })),
      latestNetwork: null,
      cyConfig: {},
      editorConfig: {
        lineType: 'taxi'
      }
    }
  },
  computed: {
    formattedNetwork () {
      return JSON.stringify(this.latestNetwork || this.networkValue, null, 2)
    }
  },
  methods: {
    handleNetworkChange ({ network }) {
      this.latestNetwork = network
    },
    logNetwork () {
      console.log('Current Network JSON:', this.latestNetwork || this.networkValue)
    },
    resetNetwork () {
      const editorComponent = this.$refs.demoEditor
      if (editorComponent && editorComponent.cyEditor) {
        const snapshot = JSON.parse(JSON.stringify(this.initialNetwork))
        editorComponent.cyEditor.loadNetwork(snapshot)
        this.networkValue = snapshot
      }
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
</style>
