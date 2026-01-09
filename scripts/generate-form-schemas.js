#!/usr/bin/env node
/**
 * 从 OpenAPI Schema 生成 vue-form-generator 表单定义
 *
 * 用途：
 * 1. 读取 web/openapi.yaml
 * 2. 提取 Node, Edge, CacheConfig, DirectoryConfig 等 Schema
 * 3. 生成 vue-form-generator 兼容的表单定义
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 读取 OpenAPI 文档
const openapiPath = path.join(__dirname, '../../web/openapi.yaml');
const openapiDoc = yaml.load(fs.readFileSync(openapiPath, 'utf8'));
const schemas = openapiDoc.components.schemas;

/**
 * 将 OpenAPI Schema 转换为 vue-form-generator 字段定义
 */
function convertSchemaToVFG(schema, propertyName, isRequired = false) {
  const field = {
    model: propertyName,
    label: propertyName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    required: isRequired
  };

  // 基本类型映射
  if (schema.type === 'string') {
    if (schema.enum) {
      field.type = 'select';
      field.values = schema.enum;
    } else {
      field.type = 'input';
      field.inputType = 'text';
    }
  } else if (schema.type === 'integer' || schema.type === 'number') {
    field.type = 'input';
    field.inputType = 'number';
    if (schema.minimum !== undefined) field.min = schema.minimum;
    if (schema.maximum !== undefined) field.max = schema.maximum;
  } else if (schema.type === 'boolean') {
    field.type = 'checkbox';
  } else if (schema.type === 'array') {
    field.type = 'array';
    // 简化处理：数组显示为文本
    field.hint = 'Array field (advanced editing in JSON view)';
  } else if (schema.type === 'object') {
    // 嵌套对象暂时显示为 JSON
    field.type = 'textArea';
    field.hint = 'Object field (advanced editing in JSON view)';
  }

  if (schema.description) {
    field.hint = schema.description;
  }

  return field;
}

/**
 * 生成 CacheConfig 表单
 */
function generateCacheConfigForm() {
  const cacheSchema = schemas.CacheConfig;
  const fields = [];

  Object.entries(cacheSchema.properties).forEach(([propName, propSchema]) => {
    const isRequired = cacheSchema.required?.includes(propName) || false;

    // 跳过运行时统计字段（hits, misses, accesses）
    if (['hits', 'misses', 'accesses'].includes(propName)) {
      return;
    }

    fields.push(convertSchemaToVFG(propSchema, propName, isRequired));
  });

  return {
    groups: [{
      legend: 'Cache Configuration',
      fields
    }]
  };
}

/**
 * 生成 DirectoryConfig 表单
 */
function generateDirectoryConfigForm() {
  const dirSchema = schemas.DirectoryConfig;
  const fields = [];

  Object.entries(dirSchema.properties).forEach(([propName, propSchema]) => {
    const isRequired = dirSchema.required?.includes(propName) || false;
    fields.push(convertSchemaToVFG(propSchema, propName, isRequired));
  });

  return {
    groups: [{
      legend: 'Directory Configuration',
      fields
    }]
  };
}

/**
 * 生成 Node 基本信息表单
 */
function generateNodeBasicForm() {
  const nodeSchema = schemas.Node;
  const basicFields = ['node_id', 'node_name', 'node_features', 'coherence_domain_id'];
  const fields = [];

  basicFields.forEach(propName => {
    if (nodeSchema.properties[propName]) {
      const isRequired = nodeSchema.required?.includes(propName) || false;
      fields.push(convertSchemaToVFG(nodeSchema.properties[propName], propName, isRequired));
    }
  });

  return {
    groups: [{
      legend: 'Node Basic Info',
      fields
    }]
  };
}

/**
 * 生成 Edge 配置表单
 */
function generateEdgeConfigForm() {
  const edgeSchema = schemas.Edge;
  const configFields = ['edge_id', 'src_node_id', 'dst_node_id', 'src_port_id', 'dst_port_id', 'latency', 'bandwidth', 'packet_types'];
  const fields = [];

  configFields.forEach(propName => {
    if (edgeSchema.properties[propName]) {
      const isRequired = edgeSchema.required?.includes(propName) || false;
      fields.push(convertSchemaToVFG(edgeSchema.properties[propName], propName, isRequired));
    }
  });

  return {
    groups: [{
      legend: 'Edge Configuration',
      fields
    }]
  };
}

/**
 * 生成 Port 配置表单
 */
function generatePortConfigForm() {
  const portSchema = schemas.Port;
  const configFields = ['port_id', 'bandwidth', 'buffer_size', 'packet_types'];
  const fields = [];

  configFields.forEach(propName => {
    if (portSchema.properties[propName]) {
      const isRequired = portSchema.required?.includes(propName) || false;
      fields.push(convertSchemaToVFG(portSchema.properties[propName], propName, isRequired));
    }
  });

  return {
    groups: [{
      legend: 'Port Configuration',
      fields
    }]
  };
}

// 生成所有表单定义
const formSchemas = {
  nodeBasic: generateNodeBasicForm(),
  cache: generateCacheConfigForm(),
  directory: generateDirectoryConfigForm(),
  edge: generateEdgeConfigForm(),
  port: generatePortConfigForm()
};

// 输出到文件
const outputPath = path.join(__dirname, '../src/schemas/form-schemas.json');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(formSchemas, null, 2));

console.log('✅ Form schemas generated successfully!');
console.log(`📄 Output: ${outputPath}`);
console.log(`\n📋 Generated schemas:`);
Object.keys(formSchemas).forEach(key => {
  const fieldCount = formSchemas[key].groups.reduce((sum, g) => sum + g.fields.length, 0);
  console.log(`   - ${key}: ${fieldCount} fields`);
});
