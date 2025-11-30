/**
 * Created by DemonRay on 2019/3/25.
 */

import cytoscape from 'cytoscape'
import utils from '../utils'
import EventBus from '../utils/eventbus'
import toolbar from './cyeditor-toolbar'
import snapGrid from './cyeditor-snap-grid'
import undoRedo from './cyeditor-undo-redo'
import clipboard from './cyeditor-clipboard'
import cynavigator from './cyeditor-navigator'
import edgehandles from './cyeditor-edgehandles'
import noderesize from './cyeditor-node-resize'
import editElements from './cyeditor-edit-elements'
import dragAddNodes from './cyeditor-drag-add-nodes'
import contextMenu from './cyeditor-context-menu'
import { defaultConfData, defaultEditorConfig, defaultNodeTypes } from '../defaults'

cytoscape.use(edgehandles)
cytoscape.use(cynavigator)
cytoscape.use(snapGrid)
cytoscape.use(noderesize)
cytoscape.use(dragAddNodes)
cytoscape.use(editElements)
cytoscape.use(toolbar)
cytoscape.use(clipboard)
cytoscape.use(undoRedo)
cytoscape.use(contextMenu)

class CyEditor extends EventBus {
  constructor (params = defaultEditorConfig) {
    super()
    this._plugins = {}
    this._listeners = {}
    this._init(params)
  }

  _init (params) {
    this._initOptions(params)
    this._initDom()
    this._initCy()
    this._initPlugin()
    this._initEvents()
  }

  _verifyParams (params) {
    const mustBe = (arr, type) => {
      let valid = true
      arr.forEach(item => {
        const typeItem = typeof params[item]
        if (typeItem !== type) {
          console.warn(`'editor.${item}' must be ${type}`)
          valid = false
        }
      })
      return valid
    }
    const {
      zoomRate,
      toolbar,
      nodeTypes
    } = params
    mustBe(['noderesize', 'dragAddNodes', 'elementsInfo', 'snapGrid', 'navigator', 'useDefaultNodeTypes', 'autoSave'], 'boolean')
    mustBe(['beforeAdd', 'afterAdd'], 'function')

    if (zoomRate <= 0 || zoomRate >= 1 || typeof zoomRate !== 'number') {
      console.warn(`'editor.zoomRate' must be < 1 and > 0`)
    }

    if (typeof toolbar !== 'boolean' && !Array.isArray(toolbar)) {
      console.warn(`'editor.nodeTypes' must be boolean or array`)
    }

    if (!Array.isArray(nodeTypes)) {
      console.warn(`'editor.nodeTypes' must be array`)
    }
  }

  _initOptions (params = {}) {
    this.editorOptions = Object.assign({}, defaultEditorConfig.editor, params.editor)
    this._verifyParams(this.editorOptions)
    const { useDefaultNodeTypes, zoomRate } = this.editorOptions
    this._handleOptonsChange = {
      snapGrid: this._snapGridChange,
      lineType: this._lineTypeChange
    }
    if (params.editor && params.editor.nodeTypes && useDefaultNodeTypes) {
      this.setOption('nodeTypes', defaultNodeTypes.concat(params.editor.nodeTypes))
    }
    if (zoomRate <= 0 || zoomRate >= 1) {
      console.error('zoomRate must be float number, greater than 0 and less than 1')
    }
    this.cyOptions = Object.assign({}, defaultEditorConfig.cy, params.cy)
    const { elements } = this.cyOptions
    if (elements) {
      if (Array.isArray(elements.nodes)) {
        elements.nodes.forEach(node => {
          node.data = Object.assign({}, defaultConfData.node, node.data)
        })
      }
      if (Array.isArray(elements.edges)) {
        elements.edges.forEach(edge => {
          edge.data = Object.assign({}, defaultConfData.edge, edge.data)
        })
      }
    }
  }

  _initCy () {
    this.cyOptions.container = '#cy'
    if (typeof this.cyOptions.container === 'string') {
      this.cyOptions.container = utils.query(this.cyOptions.container)[ 0 ]
    }
    if (!this.cyOptions.container) {
      console.error('There is no any element matching your container')
      return
    }
    this.cy = cytoscape(this.cyOptions)
  }

  _initDom () {
    let { dragAddNodes, navigator, elementsInfo, toolbar, container } = this.editorOptions
    let left = dragAddNodes ? `<div class="left"></div>` : ''
    let navigatorDom = navigator ? `<div class="panel-title">${utils.localize('window-navigator')}</div><div id="thumb"></div>` : ''
    let infoDom = elementsInfo ? `<div id="info"></div>` : ''
    let domHtml = toolbar ? '<div id="toolbar"></div>' : ''
    let right = ''
    if (navigator || elementsInfo) {
      right = `<div class="right">
                ${navigatorDom}
                ${infoDom}
              </div>`
    }
    domHtml += `<div id="editor">
                ${left}
                <div id="cy"></div>
                ${right}
              </div>`
    let editorContianer
    if (container) {
      if (typeof container === 'string') {
        editorContianer = utils.query(container)[ 0 ]
      } else if (utils.isNode(container)) {
        editorContianer = container
      }
      if (!editorContianer) {
        console.error('There is no any element matching your container')
        return
      }
    } else {
      editorContianer = document.createElement('div')
      editorContianer.className = 'cy-editor-container'
      document.body.appendChild(editorContianer)
    }
    editorContianer.innerHTML = domHtml
  }

  _initEvents () {
    const { editElements, edgehandles, noderesize, undoRedo } = this._plugins

    this._listeners.showElementInfo = () => {
      if (editElements) {
        editElements.showElementsInfo()
      }
    }

    this._listeners.handleCommand = this._handleCommand.bind(this)

    this._listeners.hoverout = (e) => {
      if (edgehandles) {
        edgehandles.active = true
        edgehandles.stop(e)
      }
      if (noderesize) {
        noderesize.clearDraws()
      }
    }

    this._listeners.select = (e) => {
      if (this._doAction === 'select') return
      if (undoRedo) {
        this._undoRedoAction('select', e.target)
      }
    }

    this._listeners.addEles = (evt, el) => {
      if (el.position) {
        let panZoom = { pan: this.cy.pan(), zoom: this.cy.zoom() }
        let x = (el.position.x - panZoom.pan.x) / panZoom.zoom
        let y = (el.position.y - panZoom.pan.y) / panZoom.zoom
        el.position = { x, y }
      }
      el.firstTime = true
      if (!this._hook('beforeAdd', el, true)) return
      if (undoRedo) {
        this._undoRedoAction('add', el)
      } else {
        this.cy.add(el)
      }
      this._hook('afterAdd', el)
      this.emit('change', el, this)
    }

    this._listeners._changeUndoRedo = this._changeUndoRedo.bind(this)

    this._listeners.handleContextMenu = this._handleContextMenu.bind(this)

    this.cy.on('cyeditor.noderesize-resized cyeditor.noderesize-resizing', this._listeners.showElementInfo)
      .on('cyeditor.toolbar-command', this._listeners.handleCommand)
      .on('cyeditor.ctxmenu', this._listeners.handleContextMenu)
      .on('click', this._listeners.hoverout)
      .on('select', this._listeners.select)
      .on('cyeditor.addnode', this._listeners.addEles)
      .on('cyeditor.afterDo cyeditor.afterRedo cyeditor.afterUndo', this._listeners._changeUndoRedo)
    this.emit('ready')
  }

  _initPlugin () {
    const { dragAddNodes, elementsInfo, toolbar,
      contextMenu, snapGrid, navigator, noderesize } = this.editorOptions
    // edge
    this._plugins.edgehandles = this.cy.edgehandles({
      snap: false,
      handlePosition () {
        return 'middle middle'
      },
      edgeParams: this._edgeParams.bind(this)
    })

    // drag node add to cy
    if (dragAddNodes) {
      this._plugins.dragAddNodes = this.cy.dragAddNodes({
        container: '.left',
        nodeTypes: this.editorOptions.nodeTypes
      })
    }

    // edit panel
    if (elementsInfo) {
      this._plugins.editElements = this.cy.editElements({
        container: '#info'
      })
    }

    // toolbar
    if (Array.isArray(toolbar) || toolbar === true) {
      this._plugins.toolbar = this.cy.toolbar({
        container: '#toolbar',
        toolbar: toolbar
      })
      if (toolbar === true || toolbar.indexOf('gridon') > -1) {
        this.setOption('snapGrid', true)
      }
    }

    let needUndoRedo = toolbar === true
    let needClipboard = toolbar === true
    if (Array.isArray(toolbar)) {
      needUndoRedo = toolbar.indexOf('undo') > -1 ||
      toolbar.indexOf('redo') > -1
      needClipboard = toolbar.indexOf('copy') > -1 ||
      toolbar.indexOf('paset') > -1
    }

    // clipboard
    if (needClipboard) {
      this._plugins.clipboard = this.cy.clipboard()
    }
    // undo-redo
    if (needUndoRedo) {
      this._plugins.undoRedo = this.cy.undoRedo()
    }

    // snap-grid
    if (snapGrid) {
      this._plugins.cySnapToGrid = this.cy.snapToGrid()
    }

    // navigator
    if (navigator) {
      this.cy.navigator({
        container: '#thumb'
      })
    }

    // noderesize
    if (noderesize) {
      this._plugins.noderesize = this.cy.noderesize({
        selector: 'node[resize]'
      })
    }

    // context-menu
    if (contextMenu) {
      this._plugins.contextMenu = this.cy.contextMenu({
        beforeShow: (e, defaultMenus) => {
          const target = e.target || e.cyTarget
          if (target && target.isNode && target.isNode()) {
            // 为节点创建菜单
            const nodeType = target.data('type') || 'round-rectangle'
            const shapeMenus = defaultNodeTypes
              .filter(nodeTypeDef => nodeTypeDef.buildIn)
              .map(nodeTypeDef => ({
                id: `change-shape-${nodeTypeDef.type}`,
                content: nodeTypeDef.type,
                disabled: nodeTypeDef.type === nodeType,
                data: { shapeType: nodeTypeDef.type }
              }))
            
            return [
              {
                id: 'change-shape',
                content: utils.localize('ctxmenu-change-shape'),
                disabled: false,
                submenu: shapeMenus,
                submenuVisible: false
              },
              {
                id: 'remove',
                content: utils.localize('ctxmenu-remove'),
                disabled: false,
                divider: true
              },
              {
                id: 'hide',
                content: utils.localize('ctxmenu-hide'),
                disabled: false
              }
            ]
          }
          // 默认菜单（边或其他）
          return defaultMenus
        }
      })
    }
  }

  _snapGridChange () {
    if (!this._plugins.cySnapToGrid) return
    if (this.editorOptions.snapGrid) {
      this._plugins.cySnapToGrid.gridOn()
      this._plugins.cySnapToGrid.snapOn()
    } else {
      this._plugins.cySnapToGrid.gridOff()
      this._plugins.cySnapToGrid.snapOff()
    }
  }

  _edgeParams () {
    return {
      data: { lineType: this.editorOptions.lineType }
    }
  }

  _lineTypeChange (value) {
    let selected = this.cy.$('edge:selected')
    if (selected.length < 1) {
      selected = this.cy.$('edge')
    }
    selected.forEach(item => {
      item.data({
        lineType: value
      })
    })
  }

  _handleContextMenu (evt, payload = {}) {
    const menuItem = payload.menuItem || payload
    if (!menuItem || !menuItem.id) return

    const target = payload.target || (evt.target && evt.target.isNode ? evt.target : this.cy.$(':selected').first())
    console.log('[ContextMenu] command:', menuItem.id, 'target:', target ? (target.id ? target.id() : target) : 'none')

    if (menuItem.id && menuItem.id.startsWith('change-shape-')) {
      if (!target || !target.isNode || !target.isNode()) {
        console.warn('[ContextMenu] No node target for change-shape command')
        return
      }
      const shapeType = (menuItem.data && menuItem.data.shapeType) || menuItem.id.replace('change-shape-', '')
      this.changeNodeShape(target, shapeType)
    } else if (menuItem.id === 'remove') {
      if (target && target.isNode && target.isNode()) {
        if (this._plugins.undoRedo) {
          this._undoRedoAction('remove', target)
        } else {
          this.cy.remove(target)
        }
      } else {
        this.deleteSelected()
      }
    } else if (menuItem.id === 'hide') {
      if (target && (target.isNode || target.isEdge)) {
        target.hide()
      }
    }
  }

  changeNodeShape (node, shapeType) {
    if (!node || !node.isNode || !node.isNode()) return
    
    const nodeTypeDef = defaultNodeTypes.find(nt => nt.type === shapeType)
    if (!nodeTypeDef) {
      console.warn('Node type definition not found for:', shapeType)
      return
    }

    const currentData = node.data()
    const oldType = currentData.type
    console.log('Changing node shape from', oldType, 'to', shapeType)
    
    const newData = {
      type: shapeType
    }

    // 如果新形状有默认尺寸，且当前节点使用的是默认尺寸，则更新尺寸
    if (nodeTypeDef.width && nodeTypeDef.height) {
      const currentWidth = currentData.width || defaultConfData.node.width
      const currentHeight = currentData.height || defaultConfData.node.height
      const defaultWidth = nodeTypeDef.width
      const defaultHeight = nodeTypeDef.height
      
      // 如果当前尺寸接近默认尺寸，则使用新形状的默认尺寸
      if (Math.abs(currentWidth - defaultConfData.node.width) < 5 && 
          Math.abs(currentHeight - defaultConfData.node.height) < 5) {
        newData.width = defaultWidth
        newData.height = defaultHeight
      }
    }

    // 如果新形状有points（多边形），需要保留points
    if (nodeTypeDef.points) {
      newData.points = nodeTypeDef.points
    }

    // 更新节点数据 - 逐个更新每个属性，确保 cytoscape 检测到变化
    console.log('Updating node data:', newData)
    Object.keys(newData).forEach(key => {
      node.data(key, newData[key])
      console.log('Set data.' + key + ' =', node.data(key))
    })
    
    // 如果新形状没有 points，移除旧的 points
    if (!nodeTypeDef.points && node.data('points')) {
      node.removeData('points')
      console.log('Removed points data')
    }
    
    // 验证数据是否更新成功
    const updatedData = node.data()
    console.log('Node data after update:', updatedData)
    console.log('Node type in data:', updatedData.type)
    
    // 直接通过样式 API 设置形状，确保立即生效
    try {
      node.style('shape', shapeType)
      const actualShape = node.style('shape')
      console.log('Shape set to:', shapeType, 'Actual shape:', actualShape)
    } catch (e) {
      console.error('Error setting shape:', e)
    }
    
    // 再次验证，确保数据已更新
    setTimeout(() => {
      const finalData = node.data()
      console.log('Final node data check:', finalData)
      console.log('Final type:', finalData.type)
    }, 100)
    
    this.emit('change', node, this)
  }

  _handleCommand (evt, item) {
    switch (item.command) {
      case 'undo' :
        this.undo()
        break
      case 'redo' :
        this.redo()
        break
      case 'gridon' :
        this.toggleGrid()
        break
      case 'zoomin' :
        this.zoom(1)
        break
      case 'zoomout' :
        this.zoom(-1)
        break
      case 'levelup' :
        this.changeLevel(1)
        break
      case 'leveldown' :
        this.changeLevel(-1)
        break
      case 'copy' :
        this.copy()
        break
      case 'paste' :
        this.paste()
        break
      case 'fit' :
        this.fit()
        break
      case 'save' :
        this.save()
        break
      case 'save-json' :
        this.saveJson()
        break
      case 'show-json' :
        this.showJson()
        break
      case 'delete' :
        this.deleteSelected()
        break
      case 'line-bezier' :
        this.setOption('lineType', 'bezier')
        break
      case 'line-taxi' :
        this.setOption('lineType', 'taxi')
        break
      case 'line-straight' :
        this.setOption('lineType', 'straight')
        break
      case 'boxselect':
        this.cy.userPanningEnabled(!item.selected)
        this.cy.boxSelectionEnabled(item.selected)
        break
      default:
        break
    }
  }

  _changeUndoRedo () {
    if (!this._plugins.undoRedo || !this._plugins.toolbar) return
    let canRedo = this._plugins.undoRedo.isRedoStackEmpty()
    let canUndo = this._plugins.undoRedo.isUndoStackEmpty()
    if (canRedo !== this.lastCanRedo || canUndo !== this.lastCanUndo) {
      this._plugins.toolbar.rerender('undo', { disabled: canUndo })
      this._plugins.toolbar.rerender('redo', { disabled: canRedo })
    }
    this.lastCanRedo = canRedo
    this.lastCanUndo = canUndo
  }

  _undoRedoAction (cmd, options) {
    this._doAction = cmd
    this._plugins.undoRedo.do(cmd, options)
  }

  _hook (hook, params, result = false) {
    if (typeof this.editorOptions[hook] === 'function') {
      const res = this.editorOptions[hook](params)
      return result ? res : true
    }
  }

  /**
   * change editor option, support snapGrid, lineType
   * @param {string|object} key
   * @param {*} value
   */
  setOption (key, value) {
    if (typeof key === 'string') {
      this.editorOptions[key] = value
      if (typeof this._handleOptonsChange[key] === 'function') {
        this._handleOptonsChange[key].call(this, value)
      }
    } else if (typeof key === 'object') {
      Object.assign(this.editorOptions, key)
    }
  }

  undo () {
    if (this._plugins.undoRedo) {
      let stack = this._plugins.undoRedo.getRedoStack()
      if (stack.length) {
        this._doAction = stack[stack.length - 1].action
      }
      this._plugins.undoRedo.undo()
    } else {
      console.warn('Can not `undo`, please check the initialize option `editor.toolbar`')
    }
  }

  redo () {
    if (this._plugins.undoRedo) {
      let stack = this._plugins.undoRedo.getUndoStack()
      if (stack.length) {
        this._doAction = stack[stack.length - 1].action
      }
      this._plugins.undoRedo.redo()
    } else {
      console.warn('Can not `redo`, please check the initialize option `editor.toolbar`')
    }
  }

  copy () {
    if (this._plugins.clipboard) {
      let selected = this.cy.$(':selected')
      if (selected.length) {
        this._cpids = this._plugins.clipboard.copy(selected)
        if (this._cpids && this._plugins.toolbar) {
          this._plugins.toolbar.rerender('paste', { disabled: false })
        }
      }
    } else {
      console.warn('Can not `copy`, please check the initialize option `editor.toolbar`')
    }
  }

  paste () {
    if (this._plugins.clipboard) {
      if (this._cpids) {
        this._plugins.clipboard.paste(this._cpids)
      }
    } else {
      console.warn('Can not `paste`, please check the initialize option `editor.toolbar`')
    }
  }

  changeLevel (type = 0) {
    let selected = this.cy.$(':selected')
    if (selected.length) {
      selected.forEach(el => {
        let pre = el.style()
        el.style('z-index', pre.zIndex - 0 + type > -1 ? pre.zIndex - 0 + type : 0)
      })
    }
  }

  deleteSelected () {
    let selected = this.cy.$(':selected')
    if (selected.length) {
      if (this._plugins.undoRedo) {
        this._undoRedoAction('remove', selected)
      }
      this.cy.remove(selected)
    }
  }

  async save () {
    try {
      let blob = await this.cy.png({ output: 'blob-promise' })
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, `chart-${Date.now()}.png`)
      } else {
        let a = document.createElement('a')
        a.download = `chart-${Date.now()}.png`
        a.href = window.URL.createObjectURL(blob)
        a.click()
      }
    } catch (e) {
      console.log(e)
    }
  }

  saveJson () {
    try {
      let jsonData = this.json(true)
      let jsonString = JSON.stringify(jsonData, null, 2)
      let blob = new Blob([jsonString], { type: 'application/json' })
      if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, `chart-${Date.now()}.json`)
      } else {
        let a = document.createElement('a')
        a.download = `chart-${Date.now()}.json`
        a.href = window.URL.createObjectURL(blob)
        a.click()
      }
    } catch (e) {
      console.log(e)
    }
  }

  showJson () {
    try {
      let jsonData = this.json(true)
      let jsonString = JSON.stringify(jsonData, null, 2)
      
      // 创建弹窗显示 JSON
      let modal = document.createElement('div')
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;'
      
      let content = document.createElement('div')
      content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow: auto; position: relative;'
      
      let closeBtn = document.createElement('button')
      closeBtn.textContent = '关闭'
      closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; padding: 5px 15px; cursor: pointer;'
      closeBtn.onclick = function () {
        document.body.removeChild(modal)
      }
      
      let pre = document.createElement('pre')
      pre.style.cssText = 'margin: 0; padding: 10px; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-wrap: break-word;'
      pre.textContent = jsonString
      
      content.appendChild(closeBtn)
      content.appendChild(pre)
      modal.appendChild(content)
      
      modal.onclick = function (e) {
        if (e.target === modal) {
          document.body.removeChild(modal)
        }
      }
      
      document.body.appendChild(modal)
      
      // 同时在控制台输出，方便调试
      console.log('Current JSON Data:', jsonData)
      console.log('Selected nodes:', this.cy.$(':selected').map(node => ({
        id: node.id(),
        data: node.data(),
        shape: node.style('shape')
      })))
    } catch (e) {
      console.error('Error showing JSON:', e)
      alert('显示 JSON 时出错: ' + e.message)
    }
  }

  fit () {
    if (!this._fit_status) {
      this._fit_status = { pan: this.cy.pan(), zoom: this.cy.zoom() }
      this.cy.fit()
    } else {
      this.cy.viewport({
        zoom: this._fit_status.zoom,
        pan: this._fit_status.pan
      })
      this._fit_status = null
    }
  }

  zoom (type = 1, level) {
    level = level || this.editorOptions.zoomRate
    let w = this.cy.width()
    let h = this.cy.height()
    let zoom = this.cy.zoom() + level * type
    let pan = this.cy.pan()
    pan.x = pan.x + -1 * w * level * type / 2
    pan.y = pan.y + -1 * h * level * type / 2
    this.cy.viewport({
      zoom,
      pan
    })
  }

  toggleGrid () {
    if (this._plugins.cySnapToGrid) {
      this.setOption('snapGrid', !this.editorOptions.snapGrid)
    } else {
      console.warn('Can not `toggleGrid`, please check the initialize option')
    }
  }

  jpg (opt = {}) {
    return this.cy.png(opt)
  }

  png (opt) {
    return this.cy.png(opt)
  }
  /**
   * Export the graph as JSON or Import the graph as JSON
   * @param {*} opt params for cy.json(opt)
   * @param {*} keys JSON Object keys
   */
  json (opt = false, keys) {
    keys = keys || ['boxSelectionEnabled', 'elements', 'pan', 'panningEnabled', 'userPanningEnabled', 'userZoomingEnabled', 'zoom', 'zoomingEnabled']
    // export
    let json = {}
    if (typeof opt === 'boolean') {
      let cyjson = this.cy.json(opt)
      keys.forEach(key => { json[key] = cyjson[key] })
      return json
    }
    // import
    if (typeof opt === 'object') {
      json = {}
      keys.forEach(key => { json[key] = opt[key] })
    }
    return this.cy.json(json)
  }

  /**
   * get or set data
   * @param {string|object} name
   * @param {*} value
   */
  data (name, value) {
    return this.cy.data(name, value)
  }

  /**
   *  remove data
   * @param {string} names  split by space
   */
  removeData (names) {
    this.cy.removeData(names)
  }

  destroy () {
    this.cy.removeAllListeners()
    this.cy.destroy()
  }
}

export default CyEditor
