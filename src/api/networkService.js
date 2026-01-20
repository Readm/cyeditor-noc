/**
 * @typedef {import('../types/api').components['schemas']['FlowSimNetwork']} FlowSimNetwork
 */

const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_NETWORK_API) {
    return process.env.VUE_APP_NETWORK_API
  }
  return ''
}

const buildUrl = (path, baseUrl) => {
  const prefix = baseUrl !== undefined ? baseUrl : getBaseUrl()
  if (!prefix) return path
  return `${prefix.replace(/\/$/, '')}${path}`
}

async function request (path, fetchOptions = {}, options = {}) {
  const url = buildUrl(path, options.baseUrl)
  const response = await fetch(url, Object.assign({
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  }, fetchOptions))

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed: ${response.status} ${text}`)
  }
  if (response.status === 204) return null
  return response.json()
}

/**
 * 加载所有网络
 * @param {Object} [options] - 请求选项
 * @returns {Promise<FlowSimNetwork[]>}
 */
export function loadNetworks (options = {}) {
  return request('/load_networks', { method: 'GET' }, options)
}

/**
 * 构建并部署网络
 * @param {FlowSimNetwork} network - 网络配置
 * @param {Object} [options] - 请求选项
 * @returns {Promise<FlowSimNetwork>}
 */
export function addNetwork (network, options = {}) {
  return request('/build_network', {
    method: 'POST',
    body: JSON.stringify(network)
  }, options)
}

/**
 * 重置网络
 * @param {FlowSimNetwork} network - 网络配置
 * @param {Object} [options] - 请求选项
 * @returns {Promise<FlowSimNetwork>}
 */
export function resetNetwork (network, options = {}) {
  return request('/reset_network', {
    method: 'POST',
    body: JSON.stringify(network)
  }, options)
}

/**
 * 推进仿真到指定周期
 * @param {number} cycle - 目标周期
 * @param {Object} [options] - 请求选项
 * @returns {Promise<FlowSimNetwork>}
 */
export function advanceTo (cycle, options = {}) {
  return request('/advance_to', {
    method: 'POST',
    body: JSON.stringify({ cycle })
  }, options)
}

/**
 * 加载预设网络拓扑
 * @param {string} name - 预设名称
 * @param {Object} [params] - 预设参数
 * @param {Object} [options] - 请求选项
 * @returns {Promise<FlowSimNetwork>}
 */
export function loadPreset (name, params = {}, options = {}) {
  return request('/load_preset', {
    method: 'POST',
    body: JSON.stringify({ name, params })
  }, options)
}

export default {
  loadNetworks,
  addNetwork,
  resetNetwork,
  advanceTo,
  loadPreset
}
