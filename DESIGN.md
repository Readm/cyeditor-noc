# 网络编辑器与模拟器 - 设计文档 (Design Document)

本文档概述了 **FlowSim 可视化编辑器** 的设计思路与开发路线图。这是一个基于 Web 的工具，旨在通过可视化方式设计、配置和模拟片上网络 (NoC) 及缓存一致性层级结构。

## 1. 产品愿景 (Product Vision)
为计算机架构研究人员和学生提供一个统一的、类似 IDE 的可视化体验。用户可以通过拖拽组件（如 CPU、缓存、路由器）来构建自定义拓扑，配置参数（延迟、容量），并运行周期精确的模拟，同时获得实时的可视化反馈。

## 2. 系统架构 (System Architecture)

### 2.1 技术栈 (Technology Stack)
*   **前端**: Vue.js (v2), Cytoscape.js (图渲染), ElementUI/Vuetify (UI 组件库)。
*   **后端**: Go (FlowSim Core), WebSocket (实时状态同步)。
*   **数据格式**: JSON (网络拓扑 & 模拟状态)。

### 2.2 系统交互图
```mermaid
graph TD
    User[用户] -->|交互| UI[Web 前端]
    UI -->|HTTP POST| API[REST API /load, /reset]
    UI -->|WebSocket| WS[实时状态流]
    API -->|控制| Sim[仿真引擎 (Go)]
    WS -->|状态推送| Sim
    Sim -->|运行| ChampSim[ChampSim 逻辑]
    Sim -->|管理| Topology[网络拓扑]
```

## 3. 核心功能 (Core Functionality)

### 3.1 网络编辑 (Builder)
*   **组件面板 (Sidebar)**: 包含可拖拽的模块。
    *   **计算节点**: CPU Node (消费 Trace), GPU Node。
    *   **存储层级**: L1 Cache, L2 Cache (统一/分离), L3 Cache (Slice), DRAM 控制器。
    *   **互连网络**: Router (环形/网格), Hub, Bridge。
*   **画布交互**:
    *   拖拽放置组件。
    *   端口连接 (例如: CPU Out -> L1 In)。
    *   多选与移动。
*   **属性编辑器**:
    *   点击节点后在侧边栏编辑其 `EntityConfig`。
    *   **示例**: Cache 大小 (KB), 关联度 (Associativity), 延迟 (Cycles), 频率。

### 3.2 蓝图系统 (Blueprints)
为了加速设计过程，工具将支持 **蓝图 (Blueprints)** 或子图功能：
*   **Tile 蓝图**: 预连接的 `CPU + L1 + L2` 组合。用户可以一次性实例化 4 个 "Tile" 来快速构建四核系统。
*   **拓扑生成器**:
    *   **Ring Generator**: 自动生成 N 个节点的环形网络。
    *   **Mesh Generator**: 自动生成 X * Y 的网格网络。
    *   **Star/Tree**: 标准预设结构。

### 3.3 仿真与控制 (Simulation & Control)
*   **实时控制**:
    *   `Advance(N)`: 向前运行 N 个周期。
    *   `Run/Pause`: 连续运行/暂停。
    *   `Reset`: 重置为初始状态。
*   **可视化反馈**:
    *   **流量热力图**: 链路颜色/粗细随 `Occupancy` (拥塞度) 变化。
    *   **停顿指示器**: 当输入队列满时，节点变红 (Stall)。
    *   **数据包检视**: 点击链路可查看正在传输的数据包详情 (Mock 数据或真实快照)。

## 4. 数据模型 (Data Model Draft)

### 4.1 拓扑配置 (JSON)
前端导出此配置给后端，用于初始化 `EntityConfig`。
```json
{
  "nodes": [
    { "id": 1, "type": "CPUNode", "props": { "trace": "bzip2.trace", "freq": 4000 } },
    { "id": 2, "type": "L1Cache", "props": { "size": 32, "assoc": 8 } }
  ],
  "links": [
    { "src": 1, "dst": 2, "latency": 1, "bandwidth": 64 }
  ]
}
```

### 4.2 状态更新 (WebSocket)
后端通过 WebSocket 推送增量状态 (Delta)。
```json
{
  "cycle": 1050,
  "nodes": [
    { "id": 1, "state": "Stalled", "inputs": [{"len": 10, "cap": 16}] }
  ],
  "links": [
    { "id": "1-2", "load": 0.85 }
  ]
}
```

## 5. 开发路线图 (Development Roadmap)

### 第一阶段: 基础建设 (已完成)
- [x] 集成 `cyeditor` 子模块。
- [x] 建立 Go 后端 <-> Vue 前端通讯。
- [x] 静态拓扑的基础可视化。
- [x] WebSocket 实时 Cycle 更新与状态流。

### 第二阶段: 动态构建 (下一步)
- [ ] **拓扑导出**: 前端实现 "保存" 功能，生成 JSON 配置。
- [ ] **拓扑加载**: 后端实现 `POST /build_network` 接口，接收 JSON 并动态构造 `state.Node` 对象。
- [ ] **属性面板**: UI 侧边栏，用于编辑节点的 CustomData 和基本属性。

### 第三阶段: 高级特性
- [ ] **蓝图库**: 常用模式库 (Tiles, Meshes)。
- [ ] **图表分析**: 实时 IPC (Instructions Per Cycle) 曲线与 Cache 命中率图表。
- [ ] **Trace 管理**: 从 UI 界面上传或选择仿真 Trace 文件。
