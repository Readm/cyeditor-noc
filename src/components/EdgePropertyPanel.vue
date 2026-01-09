<template>
  <property-panel
    :title="`Edge ${edgeData ? edgeData.edge_id : ''} Properties`"
    :model="editModel"
    @save="handleSave"
    @cancel="handleCancel"
  />
</template>

<script>
import PropertyPanel from './PropertyPanel.vue'

export default {
  name: 'EdgePropertyPanel',
  components: {
    PropertyPanel
  },
  props: {
    edgeData: {
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
    edgeData: {
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
