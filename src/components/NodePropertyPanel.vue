<template>
  <property-panel
    :title="`Node ${nodeData ? nodeData.node_id : ''} Properties`"
    :model="editModel"
    @save="handleSave"
    @cancel="handleCancel"
  />
</template>

<script>
import PropertyPanel from './PropertyPanel.vue'

export default {
  name: 'NodePropertyPanel',
  components: {
    PropertyPanel
  },
  props: {
    nodeData: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      editModel: null
    }
  },
  watch: {
    nodeData: {
      immediate: true,
      handler(newData) {
        if (newData) {
          // Clone full object for arbitrary editing
          this.editModel = JSON.parse(JSON.stringify(newData))
        } else {
          this.editModel = null
        }
      }
    }
  },
  methods: {
    handleSave(editedModel) {
      // Pass full object back
      this.$emit('save', editedModel)
    },
    handleCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
</style>
