<template>
  <div class="graph-toolbar">
    <!-- History Group -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
        title="Undo">
        <span class="material-symbols-outlined">undo</span>
      </button>
      <button
        class="toolbar-btn"
        :disabled="!canRedo"
        @click="$emit('redo')"
        title="Redo">
        <span class="material-symbols-outlined">redo</span>
      </button>
    </div>

    <div class="separator"></div>

    <!-- Edit Group -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="$emit('copy')" title="Copy (Ctrl+C)">
        <span class="material-symbols-outlined">content_copy</span>
      </button>
      <button class="toolbar-btn" @click="$emit('paste')" title="Paste (Ctrl+V)">
        <span class="material-symbols-outlined">content_paste</span>
      </button>
    </div>

    <div class="separator"></div>

    <!-- Layout Group -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="$emit('layout', 'grid')" title="Grid Layout">
        <span class="material-symbols-outlined">grid_view</span>
      </button>
      <button class="toolbar-btn" @click="$emit('layout', 'circular')" title="Circular Layout">
        <span class="material-symbols-outlined">data_usage</span>
      </button>
      <button class="toolbar-btn" @click="$emit('layout', 'dagre')" title="DAG Layout">
        <span class="material-symbols-outlined">account_tree</span>
      </button>
    </div>

    <div class="separator"></div>

    <!-- Zoom Group -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="$emit('zoomIn')" title="Zoom In">
        <span class="material-symbols-outlined">zoom_in</span>
      </button>
      <button class="toolbar-btn" @click="$emit('zoomOut')" title="Zoom Out">
        <span class="material-symbols-outlined">zoom_out</span>
      </button>
      <button class="toolbar-btn" @click="$emit('fit')" title="Fit Content">
        <span class="material-symbols-outlined">fit_screen</span>
      </button>
    </div>

    <div class="separator"></div>

    <!-- Export Group -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="$emit('export')" title="Export JSON">
        <span class="material-symbols-outlined">save</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GraphToolbar',
  props: {
    canUndo: {
      type: Boolean,
      default: false
    },
    canRedo: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.graph-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #eaeaea;
  user-select: none;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f0f0f0;
  color: #333;
}

.toolbar-btn:active:not(:disabled) {
  background: #e6e6e6;
}

.toolbar-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.toolbar-btn .material-symbols-outlined {
  font-size: 20px;
}

.separator {
  width: 1px;
  height: 20px;
  background: #eaeaea;
  margin: 0 12px;
}
</style>
