# FlowSim 示例网络

本目录包含多个预生成的示例网络，可在前端直接加载和测试。

## 可用示例

### 1. 环形网络 (Bidirectional Ring)

基于 Benchmark 的双向环形拓扑，每个节点与其相邻节点有双向连接。

- **ring_4node.json** - 4节点环形网络
  - 节点数：4
  - 边数：8（每个节点2条出边）
  - 适合：快速测试、小规模验证

- **ring_8node.json** - 8节点环形网络
  - 节点数：8
  - 边数：16
  - 适合：中等规模仿真、性能测试

- **ring_16node.json** - 16节点环形网络
  - 节点数：16
  - 边数：32
  - 适合：大规模网络测试

### 2. 多边示例 (Multi-Edge Demo)

展示多边功能的简单示例，两个节点之间有3条平行链路。

- **multi_edge_demo.json** - 多边并行链路演示
  - 节点数：2
  - 边数：3（全部在同一对节点之间）
  - 端口配置：
    - 边1：端口0→端口0
    - 边2：端口1→端口1
    - 边3：端口2→端口2
  - 适合：测试多边可视化、端口路由

## 如何使用

### 方法1：前端界面加载

1. 访问 http://localhost:8080
2. 在工具栏找到"选择示例网络"下拉菜单
3. 选择想要的示例（如"多边示例 (2节点)"）
4. 点击"加载示例"按钮
5. 点击"Build & Deploy"部署到后端
6. 使用"Step"或"Advance To"进行仿真

### 方法2：API 直接使用

```bash
# 加载示例到后端
curl -X POST http://localhost:8081/api/networks \
  -H "Content-Type: application/json" \
  -d @web/public/multi_edge_demo.json

# 运行仿真
curl -X POST http://localhost:8081/api/advance \
  -H "Content-Type: application/json" \
  -d '{"cycle": 100}'
```

## 生成新示例

使用 `cmd/export_examples` 工具生成新的示例网络：

```bash
# 生成环形网络
go run cmd/export_examples/main.go web/examples ring 4

# 生成多边示例
go run cmd/export_examples/main.go web/examples multi_edge

# 批量生成所有示例
./scripts/generate_examples.sh
```

## 示例文件结构

所有示例都遵循 FlowSimNetwork JSON 格式：

```json
{
  "version": "1.0.0",
  "cycle": 0,
  "nodes": [
    {
      "node_id": 0,
      "node_name": "节点名称",
      "data": {
        "id": "node-0",
        "label": "N0"
      },
      "position": { "x": 200, "y": 300 },
      "in_ports": [...],
      "out_ports": [...]
    }
  ],
  "edges": [
    {
      "edge_id": 1,
      "src_node_id": 0,
      "src_port_id": 0,
      "dst_node_id": 1,
      "dst_port_id": 0,
      "data": {
        "id": "edge-0-p0-1-p0",
        "source": "node-0",
        "target": "node-1"
      }
    }
  ]
}
```

## 测试多边功能

多边示例 (`multi_edge_demo.json`) 是测试多边支持的最佳选择：

1. 加载 `multi_edge_demo.json`
2. 观察可视化中的3条平行边（使用 bezier 曲线自动偏移）
3. 检查每条边的端口标签（0→0, 1→1, 2→2）
4. 构建网络并运行仿真
5. 验证往返数据一致性（导出后端状态，重新加载）

## 文件位置

- **源文件**：`web/examples/*.json`
- **公开访问**：`web/public/*.json` （自动复制）
- **生成工具**：`cmd/export_examples/main.go`

## 相关文档

- [多边实现文档](../../docs/MULTI_EDGE_IMPLEMENTATION.md)
- [测试总结](../../docs/TESTING_SUMMARY.md)
- [API 文档](../../docs/API.md)
