<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>{{ title }}</h3>
      <div class="header-actions">
        <button class="save-btn" @click="handleSave" title="Save changes (Ctrl+S)">Save</button>
        <button class="close-btn" @click="$emit('close')" v-if="closeable">×</button>
      </div>
    </div>

    <div class="panel-body" v-if="localModel">
      <json-editor
        v-model="localModel"
        :options="{ mode: 'tree', search: true }"
        @blur="handleSave"
        class="json-editor-instance"
      />
    </div>

    <div class="panel-body empty" v-else>
      <p>Select a node or edge to edit properties</p>
    </div>
  </div>
</template>

<script>
import JsonEditor from './JsonEditor.vue'

export default {
  name: 'PropertyPanel',
  components: {
    JsonEditor
  },
  props: {
    title: {
      type: String,
      default: 'Properties'
    },
    model: {
      type: Object,
      default: null
    },
    closeable: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localModel: null
    }
  },
  watch: {
    model: {
      immediate: true,
      handler(newModel) {
        // Deep copy to avoid direct mutation of prop and break reactivity link temporarily
        // JsonEditor handles its own internal state, we just feed it initially or on external change
        if (newModel) {
          this.localModel = JSON.parse(JSON.stringify(newModel))
        } else {
          this.localModel = null
        }
      }
    }
  },
  methods: {
    handleSave() {
      if (this.localModel) {
        // Validation: Ensure ID is preserved?
        // For now, raw save. Parent (App.vue or wrapper) should handle merge logic if specific fields are vital.
        this.$emit('save', this.localModel)
      }
    },
    handleCancel() {
        // Reload from prop
        if (this.model) {
            this.localModel = JSON.parse(JSON.stringify(this.model))
        }
        this.$emit('cancel')
    }
  }
}
</script>

<style scoped>
.property-panel {
  background: #fff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill sidebar */
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.save-btn {
    background: #1890ff;
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
}
.save-btn:hover {
    background: #40a9ff;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.panel-body {
  flex: 1;
  position: relative;
  overflow: hidden; /* Editor handles scroll */
  display: flex;
  flex-direction: column;
}

.json-editor-instance {
    flex: 1;
    overflow: hidden;
}

.panel-body.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  padding: 20px;
}
</style>
