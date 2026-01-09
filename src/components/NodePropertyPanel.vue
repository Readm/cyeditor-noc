<template>
  <property-panel
    :title="`Node ${nodeData ? nodeData.node_id : ''} Properties`"
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
      editModel: null,
      tabs: []
    }
  },
  watch: {
    nodeData: {
      immediate: true,
      handler(newData) {
        if (newData) {
          this.editModel = this.createEditModel(newData)
          this.tabs = this.createTabs(newData)
        } else {
          this.editModel = null
          this.tabs = []
        }
      }
    }
  },
  methods: {
    createEditModel(nodeData) {
      // 创建一个扁平的编辑模型
      return {
        // Basic fields
        node_id: nodeData.node_id,
        node_name: nodeData.node_name,
        node_features: nodeData.node_features || [],
        coherence_domain_id: nodeData.coherence_domain_id,

        // Cache config
        cache: nodeData.cache ? { ...nodeData.cache } : null,

        // Directory config
        directory: nodeData.directory ? { ...nodeData.directory } : null,

        // Ports (read-only for now)
        in_ports: nodeData.in_ports || [],
        out_ports: nodeData.out_ports || []
      }
    },

    createTabs(nodeData) {
      const tabs = []

      // Basic Info Tab
      tabs.push({
        key: 'basic',
        label: 'Basic',
        fields: this.prepareFields(formSchemas.nodeBasic, this.editModel)
      })

      // Cache Tab
      if (nodeData.cache) {
        tabs.push({
          key: 'cache',
          label: 'Cache',
          fields: this.prepareFields(formSchemas.cache, this.editModel.cache)
        })
      }

      // Directory Tab
      if (nodeData.directory) {
        tabs.push({
          key: 'directory',
          label: 'Directory',
          fields: this.prepareFields(formSchemas.directory, this.editModel.directory)
        })
      }

      // Ports Tab (read-only)
      if (nodeData.in_ports || nodeData.out_ports) {
        tabs.push({
          key: 'ports',
          label: 'Ports',
          fields: [
            {
              model: 'in_ports',
              label: 'Input Ports',
              type: 'textArea',
              disabled: true,
              hint: 'Read-only: Edit via JSON or add port editor'
            },
            {
              model: 'out_ports',
              label: 'Output Ports',
              type: 'textArea',
              disabled: true,
              hint: 'Read-only: Edit via JSON or add port editor'
            }
          ]
        })
      }

      return tabs
    },

    prepareFields(schemaGroup, targetModel) {
      // 根据 schema 和当前 model 准备字段
      if (!schemaGroup || !schemaGroup.groups) return []

      const fields = []
      schemaGroup.groups.forEach(group => {
        group.fields.forEach(field => {
          // 修改 model 路径以匹配扁平结构
          const preparedField = { ...field }

          // 对于嵌套对象（cache, directory），不需要修改 model
          // 因为 editModel.cache 已经是一个对象了

          fields.push(preparedField)
        })
      })
      return fields
    },

    handleSave(editedModel) {
      // 将编辑后的数据合并回原始 nodeData
      const updatedData = {
        ...this.nodeData,
        node_id: editedModel.node_id,
        node_name: editedModel.node_name,
        node_features: editedModel.node_features,
        coherence_domain_id: editedModel.coherence_domain_id
      }

      if (editedModel.cache) {
        updatedData.cache = editedModel.cache
      }

      if (editedModel.directory) {
        updatedData.directory = editedModel.directory
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
/* 可以添加特定于节点属性面板的样式 */
</style>
