import CyEditor from '../src'
export default {
  name: 'CyEditor',
  props: {
    network: {
      type: Object,
      default: null
    },
    value: {
      type: Object,
      default: () => ({
        boxSelectionEnabled: true,
        elements: null,
        pan: { x: 0, y: 0 },
        panningEnabled: true,
        userPanningEnabled: true,
        userZoomingEnabled: true,
        zoom: 1,
        zoomingEnabled: true
      })
    },
    cyConfig: {
      type: Object,
      default: () => ({})
    },
    editorConfig: {
      type: Object,
      default: () => ({})
    }
  },
  mounted () {
    const container = this.$el
    let config = {
      cy: {
        ...this.cyConfig
      },
      editor: {
        container,
        ...this.editorConfig
      },
      network: this.network
    }
    this.cyEditor = new CyEditor(config)
    if (!this.network && this.value) {
      this.cyEditor.json(this.value)
    }
    this.cyEditor.on('network-change', (evt, editorInstance, reason) => {
      const editor = editorInstance || this.cyEditor
      if (editor && typeof editor.getNetwork === 'function') {
        this.$emit('network-change', {
          reason,
          network: editor.getNetwork()
        })
      }
    }, this)
  },
  watch: {
    network: {
      deep: true,
      handler (val) {
        if (this.cyEditor && val) {
          this.cyEditor.loadNetwork(val, { silent: true })
        }
      }
    }
  },
  render (h) {
    return h('div')
  }
}
