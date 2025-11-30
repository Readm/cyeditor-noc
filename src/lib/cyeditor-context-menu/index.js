import utils from '../../utils'

const defaults = {
  menus: [
    {
      id: 'remove',
      content: 'remove',
      disabled: false,
      divider: true
    },
    {
      id: 'hide',
      content: 'hide',
      disabled: false
    }
  ],
  beforeShow: () => { return true },
  beforeClose: () => { return true }
}

class ContextMenu {
  constructor (cy, params) {
    this.cy = cy
    this._options = Object.assign({}, defaults, params)
    this._listeners = {}
    this._init()
  }
  _init () {
    this._initContainer()
    this._initDom()
    this._initEvents()
  }

  _initContainer () {
    this._container = this.cy.container()
    this.ctxmenu = document.createElement('div')
    this.ctxmenu.className = 'cy-editor-ctx-menu'
    this._container.append(this.ctxmenu)
  }

  _initDom () {
    let domItem = ''
    this._options.menus.forEach(item => {
      if (item.submenu) {
        // 支持子菜单
        domItem += `<div class="ctx-menu-item ctx-menu-item-has-submenu ${item.disabled ? 'ctx-menu-item-disabled' : ''}" data-menu-item="${item.id}">
          <span>${item.content}</span>
          <span class="ctx-menu-arrow">▶</span>
        </div>`
        if (item.submenu && item.submenuVisible) {
          item.submenu.forEach(subItem => {
            domItem += `<div class="ctx-menu-item ctx-menu-submenu-item ${subItem.disabled ? 'ctx-menu-item-disabled' : ''}" data-menu-item="${subItem.id}" data-parent="${item.id}">${subItem.content}</div>`
          })
        }
      } else {
        domItem += `<div class="ctx-menu-item ${item.disabled ? 'ctx-menu-item-disabled' : ''}" data-menu-item="${item.id}">${item.content}</div>`
      }
      if (item.divider) {
        domItem += '<div class="ctx-menu-divider" ></div>'
      }
    })
    this.ctxmenu.innerHTML = domItem
  }

  _initEvents () {
    this._listeners.eventCyTap = (event) => {
      let renderedPos = event.renderedPosition || event.cyRenderedPosition
      let left = renderedPos.x
      let top = renderedPos.y
      utils.css(this.ctxmenu, {
        top: top + 'px',
        left: left + 'px'
      })
      this._currentTarget = event.target || event.cyTarget
      this.show(event)
    }
    this._listeners.eventTapstart = (e) => {
      // 如果点击的是菜单内部，不关闭菜单
      if (this.ctxmenu.contains(e.originalEvent && e.originalEvent.target)) {
        return
      }
      this.close(e)
    }
    this._listeners.click = (e) => {
      e.stopPropagation()
      let target = e.target
      // 如果点击的是span，找到父元素
      while (target && !target.getAttribute('data-menu-item') && target !== this.ctxmenu) {
        target = target.parentElement
      }
      if (!target || !target.getAttribute('data-menu-item')) return
      
      const id = target.getAttribute('data-menu-item')
      const parentId = target.getAttribute('data-parent')
      let menuItem = this._options.menus.find(item => item.id === id)
      
      // 如果是子菜单项
      if (parentId && !menuItem) {
        const parentItem = this._options.menus.find(item => item.id === parentId)
        if (parentItem && parentItem.submenu) {
          menuItem = parentItem.submenu.find(item => item.id === id)
        }
      }
      
      // 如果是带子菜单的项，左键点击展开/收起子菜单
      if (menuItem && menuItem.submenu && !parentId) {
        menuItem.submenuVisible = !menuItem.submenuVisible
        // 关闭其他已展开的子菜单
        this._options.menus.forEach(item => {
          if (item.id !== id && item.submenu) {
            item.submenuVisible = false
          }
        })
        this._initDom()
        return
      }
      
      // 普通菜单项，执行操作并关闭菜单
      if (menuItem) {
        const payload = {
          menuItem,
          parentId: parentId || null,
          target: this._currentTarget
        }
        this.cy.trigger('cyeditor.ctxmenu', payload)
        this.close()
      }
    }

    this.ctxmenu.addEventListener('click', this._listeners.click)
    this.cy.on('cxttap', this._listeners.eventCyTap)
    this.cy.on('tapstart', this._listeners.eventTapstart)
  }

  disable (id, disabled = true) {
    const items = utils.query(`.cy-editor-ctx-menu [data-menu-item=${id}]`)
    items.forEach(menuItem => {
      if (disabled) {
        utils.addClass(menuItem, 'ctx-menu-item-disabled')
      } else {
        utils.removeClass(menuItem, 'ctx-menu-item-disabled')
      }
    })
  }

  changeMenus (menus) {
    this._options.menus = menus
    this._initDom()
  }

  show (e) {
    if (typeof this._options.beforeShow === 'function' && !this.isShow) {
      const show = this._options.beforeShow(e, this._options.menus.slice(0))
      if (!show) return
      if (show && show.then) {
        show.then((res) => {
          if (res) {
            utils.css(this.ctxmenu, {
              display: 'block'
            })
            this.isShow = true
          }
        })
        return
      }
      if (Array.isArray(show)) {
        this.changeMenus(show)
      }
      utils.css(this.ctxmenu, {
        display: 'block'
      })
      this.isShow = true
    }
  }

  close (e) {
    if (this.isShow) {
      // 关闭所有子菜单
      this._options.menus.forEach(item => {
        if (item.submenu) {
          item.submenuVisible = false
        }
      })
      
      if (typeof this._options.beforeClose === 'function') {
        const close = this._options.beforeClose(e)
        if (close === true) {
          utils.css(this.ctxmenu, {
            display: 'none'
          })
          this.isShow = false
        } else if (close && close.then) {
          close.then(() => {
            utils.css(this.ctxmenu, {
              display: 'none'
            })
            this.isShow = false
          })
        } else if (close === undefined || close === null) {
          // 如果没有返回值，默认关闭
          utils.css(this.ctxmenu, {
            display: 'none'
          })
          this.isShow = false
        }
      } else {
        utils.css(this.ctxmenu, {
          display: 'none'
        })
        this.isShow = false
      }
    }
  }

  destroyCxtMenu () {
    this.ctxmenu.removeEventListener('click', this._listeners.click)
    this.cy.off('tapstart', this._listeners.eventTapstart)
    this.cy.off('cxttap', this._listeners.eventCyTap)
  }
}

export default (cytoscape) => {
  if (!cytoscape) {
    return
  }

  cytoscape('core', 'contextMenu', function (options) {
    return new ContextMenu(this, options)
  })
}
