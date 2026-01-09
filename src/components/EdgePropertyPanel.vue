<template>
  <property-panel
    :title="`Edge ${edgeData ? edgeData.edge_id : ''} Properties`"
    :model="editModel"
    :tabs="tabs"
    @save="handleSave"
    @cancel="handleCancel"
  />
</template>

<script>
import PropertyPanel from './PropertyPanel.vue'
import formSchemas from '../schemas/form-schemas.json'

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
      editModel: null,
      tabs: []
    }
  },
  watch: {
    edgeData: {
      immediate: true,
      handler(newData) {
        if (newData) {
          this.editModel = this.createEditModel(newData)
          this.tabs = this.createTabs()
        } else {
          this.editModel = null
          this.tabs = []
        }
      }
    }
  },
  methods: {
    createEditModel(edgeData) {
      return {
        edge_id: edgeData.edge_id,
        src_node_id: edgeData.src_node_id,
        dst_node_id: edgeData.dst_node_id,
        src_port_id: edgeData.src_port_id,
        dst_port_id: edgeData.dst_port_id,
        latency: edgeData.latency,
        bandwidth: edgeData.bandwidth,
        packet_types: edgeData.packet_types || []
      }
    },

    createTabs() {
      return [
        {
          key: 'config',
          label: 'Configuration',
          fields: this.prepareFields(formSchemas.edge)
        }
      ]
    },

    prepareFields(schemaGroup) {
      if (!schemaGroup || !schemaGroup.groups) return []

      const fields = []
      schemaGroup.groups.forEach(group => {
        group.fields.forEach(field => {
          fields.push({ ...field })
        })
      })
      return fields
    },

    handleSave(editedModel) {
      const updatedData = {
        ...this.edgeData,
        ...editedModel
      }

      this.$emit('save', updatedData)
    },

    handleCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
/* Edge specific styles */
</style>
