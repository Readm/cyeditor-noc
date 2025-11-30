# 测试说明

本项目使用 Jest 作为测试框架，测试 Network 和 Display Json 的同步功能。

## 安装测试依赖

```bash
npm install
```

## 运行测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 测试文件结构

- `networkMapper.test.js` - 测试 Network 和 Display Json 之间的转换函数
- `cyeditor-network.test.js` - 测试 CyEditor 的 Network/Display 同步功能

## 测试覆盖范围

### networkMapper 测试
- Network Json 转换为 Display Json
- Display Json 转换为 Network Json
- 空数据转换
- 节点和边的转换
- ID 生成和映射
- Zoom 和 Pan 的保留
- 往返转换的数据完整性

### CyEditor 集成测试
- Network Json 加载
- Network 状态维护
- 节点形状变更同步
- 节点位置变更同步
- Network 变更事件
- 往返转换的数据完整性

## 注意事项

- 测试需要在浏览器环境中运行（使用 jsdom）
- 某些测试需要等待 cytoscape 初始化完成，使用了 setTimeout
- 测试会创建和销毁 DOM 元素，确保测试隔离

