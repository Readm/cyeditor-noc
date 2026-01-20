<template>
  <div class="json-editor-container" ref="jsoneditor"></div>
</template>

<script>
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.min.css'

export default {
  name: 'JsonEditor',
  props: {
    value: {
      type: [Object, Array],
      default: () => ({})
    },
    options: {
      type: Object,
      default: () => ({})
    },
    expandedOnLoad: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      editor: null,
      internalChange: false
    }
  },
  mounted () {
    this.initEditor()
  },
  beforeDestroy () {
    this.destroyEditor()
  },
  watch: {
    value: {
      deep: true,
      handler (newValue) {
        if (this.internalChange) {
          this.internalChange = false
          return
        }
        if (this.editor) {
          this.editor.update(newValue)
        }
      }
    }
  },
  methods: {
    initEditor () {
      const container = this.$refs.jsoneditor
      const options = {
        mode: 'tree',
        modes: ['tree', 'code', 'text', 'view'], // allowed modes
        onChange: this.onChange,
        onBlur: this.onBlur,
        onError: this.onError,
        ...this.options
      }

      this.editor = new JSONEditor(container, options)
      this.editor.set(this.value)

      if (this.expandedOnLoad) {
        this.editor.expandAll()
      }
    },
    destroyEditor () {
      if (this.editor) {
        this.editor.destroy()
        this.editor = null
      }
    },
    onChange () {
      // Real-time sync hook (if needed), currently handled by onBlur or manual request
      // But standard vue v-model expects updates.
      // We will trigger input but mark as internal change
      try {
        const json = this.editor.get()
        this.internalChange = true
        this.$emit('input', json)
        this.$emit('change', json)
      } catch (e) {
        // Ignore invalid JSON during typing
      }
    },
    onBlur () {
      // Essential hook for "Save on Blur" strategy
      try {
        const json = this.editor.get()
        this.$emit('blur', json)
      } catch (e) {
        // ignore
      }
    },
    onError (err) {
      this.$emit('error', err)
    }
  }
}
</script>

<style scoped>
.json-editor-container {
  width: 100%;
  height: 100%;
}
/* Override some default styles to fit our panel */
/deep/ .jsoneditor {
  border: none;
  border-left: 1px solid #ddd;
}
/deep/ .jsoneditor-menu {
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}
/deep/ .jsoneditor-menu > button {
    background-color: #f5f5f5;
}
</style>
