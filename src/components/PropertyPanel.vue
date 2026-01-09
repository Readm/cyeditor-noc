<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>{{ title }}</h3>
      <button class="close-btn" @click="$emit('close')" v-if="closeable">×</button>
    </div>

    <div class="panel-body" v-if="model">
      <!-- Tabs -->
      <div class="tabs" v-if="tabs.length > 1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Form Content -->
      <div class="form-content">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          v-show="activeTab === tab.key"
          class="tab-content"
        >
          <div class="form-group" v-for="field in tab.fields" :key="field.model">
            <label :for="field.model">
              {{ field.label }}
              <span class="required" v-if="field.required">*</span>
            </label>

            <!-- Input Number -->
            <input
              v-if="field.type === 'input' && field.inputType === 'number'"
              :id="field.model"
              type="number"
              v-model.number="model[field.model]"
              :min="field.min"
              :max="field.max"
              :required="field.required"
              :disabled="field.disabled"
            />

            <!-- Input Text -->
            <input
              v-else-if="field.type === 'input' && field.inputType === 'text'"
              :id="field.model"
              type="text"
              v-model="model[field.model]"
              :required="field.required"
              :disabled="field.disabled"
            />

            <!-- Select -->
            <select
              v-else-if="field.type === 'select'"
              :id="field.model"
              v-model="model[field.model]"
              :required="field.required"
              :disabled="field.disabled"
            >
              <option v-for="val in field.values" :key="val" :value="val">{{ val }}</option>
            </select>

            <!-- Checkbox -->
            <input
              v-else-if="field.type === 'checkbox'"
              :id="field.model"
              type="checkbox"
              v-model="model[field.model]"
              :disabled="field.disabled"
            />

            <!-- TextArea -->
            <textarea
              v-else-if="field.type === 'textArea'"
              :id="field.model"
              v-model="model[field.model]"
              rows="4"
              :disabled="field.disabled"
            ></textarea>

            <!-- Array (JSON string) -->
            <input
              v-else-if="field.type === 'array'"
              :id="field.model"
              type="text"
              :value="formatArray(model[field.model])"
              @input="updateArray(field.model, $event.target.value)"
              :disabled="field.disabled"
              placeholder="e.g. [1, 2, 3]"
            />

            <small class="hint" v-if="field.hint">{{ field.hint }}</small>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <button class="btn-primary" @click="handleSave">Save</button>
        <button class="btn-secondary" @click="handleCancel">Cancel</button>
      </div>
    </div>

    <div class="panel-body empty" v-else>
      <p>Select a node or edge to edit properties</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PropertyPanel',
  props: {
    title: {
      type: String,
      default: 'Properties'
    },
    model: {
      type: Object,
      default: null
    },
    tabs: {
      type: Array,
      required: true
      // 格式: [{ key: 'basic', label: 'Basic', fields: [...] }]
    },
    closeable: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeTab: this.tabs && this.tabs[0] ? this.tabs[0].key : '',
      originalModel: null
    }
  },
  watch: {
    model: {
      immediate: true,
      handler(newModel) {
        if (newModel) {
          this.originalModel = JSON.parse(JSON.stringify(newModel))
        }
      }
    },
    tabs: {
      immediate: true,
      handler(newTabs) {
        if (newTabs && newTabs.length > 0) {
          this.activeTab = newTabs[0].key
        }
      }
    }
  },
  methods: {
    formatArray(arr) {
      if (!arr) return ''
      if (Array.isArray(arr)) return JSON.stringify(arr)
      return String(arr)
    },
    updateArray(model, value) {
      try {
        this.model[model] = JSON.parse(value)
      } catch (e) {
        // Invalid JSON, keep as string for now
        this.model[model] = value
      }
    },
    handleSave() {
      this.$emit('save', this.model)
    },
    handleCancel() {
      if (this.originalModel) {
        Object.assign(this.model, this.originalModel)
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
  height: auto;
  max-height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.panel-body.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f5f5f5;
}

.tab-btn.active {
  border-bottom-color: #1890ff;
  color: #1890ff;
  font-weight: 500;
}

.form-content {
  margin-top: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 13px;
  color: #333;
}

.required {
  color: #f5222d;
  margin-left: 2px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  font-size: 13px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.form-group input[type="checkbox"] {
  width: auto;
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.panel-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #ddd;
  background: #f5f5f5;
}

.panel-actions button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}
</style>
