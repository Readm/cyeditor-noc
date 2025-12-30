# FlowSim Visual Editor

FlowSim 的可视化编辑器与模拟器前端。基于 [cyeditor](https://github.com/demonray/cyeditor) 与 [cytoscape.js](https://github.com/cytoscape/cytoscape.js) 构建。

📘 **[查看设计文档 (中文)](DESIGN.md)** - 了解系统架构与开发规划。

## 功能特性
- **可视化拓扑编辑**: 拖拽节点与连线，构建 NoC 拓扑。
- **实时仿真**: 观察数据包流动和队列拥塞情况。
- **交互控制**: 暂停、步进、重置模拟。

## 快速开始

### 1. 启动后端
在项目根目录 (`/flow_sim`) 运行：
```bash
go run -tags e2e cmd/server/main.go --port 8081 --static ./web/examples
```

### 2. 启动前端
在 web 目录 (`/flow_sim/web`) 运行：
```bash
npm install
export NODE_OPTIONS=--openssl-legacy-provider # (Node >= 17)
npm run serve
```
访问 http://localhost:8080 即可使用。