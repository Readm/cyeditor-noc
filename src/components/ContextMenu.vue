<template>
  <div
    v-show="visible"
    class="context-menu"
    :style="{ top: y + 'px', left: x + 'px' }"
    @click.stop
    @contextmenu.prevent
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      class="context-menu-item"
      :class="{ 'disabled': item.disabled, 'separator': item.separator }"
      @click="handleClick(item)"
    >
      <template v-if="!item.separator">
        <span class="menu-label">{{ item.label }}</span>
        <span v-if="item.hasSubmenu" class="submenu-arrow">▶</span>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    items: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    handleClick (item) {
      if (item.disabled || item.separator) return
      this.$emit('item-click', item)
    }
  }
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border: 1px solid #ddd;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
  border-radius: 4px;
  padding: 4px 0;
  min-width: 150px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #333;
  transition: background 0.1s;
}

.context-menu-item:hover:not(.disabled):not(.separator) {
  background: #f5f5f5;
  color: #1890ff;
}

.context-menu-item.disabled {
  color: #ccc;
  cursor: not-allowed;
}

.context-menu-item.separator {
  height: 1px;
  background: #eee;
  padding: 0;
  margin: 4px 0;
  cursor: default;
}

.submenu-arrow {
  font-size: 10px;
  color: #999;
}
</style>
