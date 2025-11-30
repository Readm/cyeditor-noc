## Network 与 Display Json 并行编辑设计

### 1. 数据模型梳理

#### 1.1 Network Json（来源于 `openapi.yaml`）
- `Network`：`version`, `nodes[]`, `edges[]`
- `Node`：核心字段（`node_id`, `node_name`, `node_features`, `cache`, `directory`, `coherence_domain_id`, `in_ports[]`, `out_ports[]`）+ `display`
- `Edge`：逻辑字段（`edge_id`, `src_node_id`, `src_port_id`, `dst_node_id`, `dst_port_id`, `packet_types`）+ `display`
- `display` 结构：
  - `Node.display`: `type`, `name`, `resize`, `bg`, `width`, `height`, `id`, `position{x,y}`，允许附加属性
  - `Edge.display`: `data{ id, source, target, lineType }`, `position{x,y}`, `link_status[]`

#### 1.2 Display Json（当前编辑器使用）
- 结构来源 `src/lib/index.js` / `examples/App.vue`
  ```jsonc
  {
    "zoom": number,
    "pan": { "x": number, "y": number },
    "elements": {
      "nodes": [{ "data": {...}, "position": {...} }],
      "edges": [{ "data": {...}, "position": {...} }]
    }
  }
  ```
- `nodes[*].data` 与 Cytoscape 节点样式直接绑定，常见字段：`id`, `type`, `name`, `resize`, `bg`, `width`, `height`
- `edges[*].data`：`id`, `source`, `target`, `lineType`

#### 1.3 字段映射概要
| Network.Node.display | DisplayNode.data/position | 备注 |
| --- | --- | --- |
| `display.id` | `data.id` | 作为 Cytoscape 节点 ID |
| `display.type` | `data.type` | 形状/样式 |
| `display.name` | `data.name` | 节点标签 |
| `display.bg` | `data.bg` | 背景色 |
| `display.width/height` | `data.width/height` | 节点尺寸 |
| `display.position` | `position` | Cytoscape 坐标 |
| 逻辑字段 | **不出现在 Display Json** | 需保留在 Network Json |

| Network.Edge.display | DisplayEdge.data/position | 备注 |
| --- | --- | --- |
| `display.data.id` | `data.id` | 边 ID |
| `display.data.source/target` | `data.source/target` | 使用节点 `display.id` |
| `display.data.lineType` | `data.lineType` | 直线/折线/曲线 |
| `display.position` | `position` | 可选 |
| `display.link_status` | Display 未使用，可存储在 attr 中 |

### 2. 同步策略

#### 2.1 数据源与衍生关系
- **Network Json** 作为单一事实来源（Single Source of Truth），其中 `display` 域承载所有可视化所需数据。
- **Display Json** 由 `Network.display` 字段提取/映射而来，仅包含 Cytoscape 必需字段。

#### 2.2 映射函数（位于 `src/utils/networkMapper.js`）
1. `networkToDisplay(network: Network): DisplayState`
   - 遍历 `network.nodes` -> 组装 `display.elements.nodes`
   - 遍历 `network.edges` -> 组装 `display.elements.edges`
   - 附带默认 `pan/zoom` 或使用 `displayMeta`
2. `displayToNetwork(display: DisplayState, baseNetwork: Network): Network`
   - 以现有 `Network` 为基，更新 `nodes[].display` & `edges[].display`
   - 若节点/边新增：在 `Network` 中追加最小逻辑对象 + display
3. 公用工具：
   - `pickDisplayFieldsFromNode(node)`、`pickDisplayFieldsFromEdge(edge)`
   - `mergeDisplayBackToNode(node, displayNode)`

#### 2.3 同步触发点
- **初始化**：传入 Network Json -> `networkToDisplay` -> `cyEditor.json(displayState)`
- **编辑操作**：
  - Cytoscape 层事件（新增节点/边、位置变化、属性修改）→ 更新 Display Json → `displayToNetwork`
  - 可以从 `this.cy.on('change', handler)`、`cyeditor.afterDo` 等 Hook 获取变更
- **保存/导出**：
  - “保存为图片/JSON”：保持现有 Display 导出
  - “保存为 Network”：调用 `displayToNetwork` 输出完整 Network Json
- **外部更新**：
  - 调用 API（加载/重置）后，用新的 Network Json 覆盖本地状态，并再生成 Display Json

### 3. 编辑流程调整

1. **CyEditor 初始化**（`src/lib/index.js`）
   - 新增可选 `networkData` 入参。若提供：
     - 缓存为 `this.networkState`
     - 通过 `networkMapper.networkToDisplay` 转换为 `displayState`
     - 调用现有初始化逻辑渲染
2. **本地状态管理**
   - 维护两个状态：
     - `this.networkState`：Network Json
     - `this.displayState`：当前 Cytoscape JSON（`this.json(true)` 的结果）
   - 当 Cytoscape 触发 `change` 时：
     1. 更新 `this.displayState`
     2. 调用 `displayToNetwork(this.displayState, this.networkState)`，同步 `display`
     3. 发出新事件 `cyeditor.network-change`（供父组件或 API 层使用）
3. **命令扩展**
   - “显示 JSON”：提供切换选项（Display / Network）
   - 新增 “导出 Network JSON” 按钮或扩展现有保存逻辑
4. **Undo/Redo 兼容**
   - Undo/Redo 影响 Display 层。`cyeditor.afterUndo/Redo` 触发后再次执行 `displayToNetwork`，确保 Network 层保持一致

### 4. API & 存储接口

| 接口 | 作用 | 前端处理 |
| --- | --- | --- |
| `GET /load_networks` | 获取 Network 列表 | 缓存为 `networkStateList`，供用户选择 |
| `POST /add_network` | 新建 Network | 将编辑后的 Network Json 作为 body |
| `POST /reset_network` | 用新 Network 重置仿真 | 发送当前 Network Json；响应重新同步 |
| `POST /advance_to` | 推进仿真 | 请求体 `{ cycle }`；响应状态用于 UI 提示 |

实现思路：
- 新建 `src/api/networkService.js`，封装 axios/fetch 调用
- `CyEditor` 或上层组件暴露方法：`loadNetwork()`, `saveNetwork()`, `resetNetwork()` 等
- 所有 API 通信均以 Network Json 为载体，Display Json 仅用于前端渲染

### 5. 实现要点与测试

#### 5.1 修改/新增文件
- `src/utils/networkMapper.js`（新增）：放置映射与辅助函数
- `src/lib/index.js`：集成 mapper、维护双状态、扩展事件/命令
- `src/api/networkService.js`（新增）：封装对 `openapi.yaml` 接口的调用
- `src/components/...` 或 `examples/App.vue`：示例调用新的加载/保存流程
- UI：工具栏按钮（导出 Network、显示 Network 等）

#### 5.2 风险与对策
| 风险 | 对策 |
| --- | --- |
| 字段遗漏导致渲染错误 | 在 mapper 中集中定义字段表，单元测试覆盖 |
| Undo/Redo 与 Network 同步不一致 | 在 `cyeditor.afterUndo/Redo` 统一触发 `syncDisplayToNetwork()` |
| 新增节点缺少逻辑属性（如 `node_id`） | 在 mapper 中提供默认生成策略（UUID）并允许外部回调补全 |
| 性能问题（频繁同步） | 对拖拽等高频事件做 debounce；仅在操作结束时同步 |

#### 5.3 测试清单
1. 导入 Network Json -> 显示正确的 Display 节点/边
2. 编辑节点形状/位置 -> Network Json 中对应 `display` 更新
3. 新增节点/边 -> Network Json 中新增项，并可提交到 API
4. Undo/Redo -> Network Json 与画面保持一致
5. API 交互：
   - 加载不同 Network -> 能在编辑器中切换
   - 提交 Network -> 后端收到完整结构
6. 导出 Display / Network 两种 JSON，验证字段合理

---

本设计为实现 Direct Edit Network Json 的基础，后续开发可按本文件列出的文件与步骤逐项完成。推荐优先实现 mapper 与状态同步，随后扩展 API 通道与 UI 按钮。***

