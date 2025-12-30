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

async function request(path, fetchOptions = {}, options = {}) {
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

export function loadNetworks(options = {}) {
  return request('/load_networks', { method: 'GET' }, options)
}

export function addNetwork(network, options = {}) {
  return request('/build_network', {
    method: 'POST',
    body: JSON.stringify(network)
  }, options)
}

export function resetNetwork(network, options = {}) {
  return request('/reset_network', {
    method: 'POST',
    body: JSON.stringify(network)
  }, options)
}

export function advanceTo(cycle, options = {}) {
  return request('/advance_to', {
    method: 'POST',
    body: JSON.stringify({ cycle })
  }, options)
}

export default {
  loadNetworks,
  addNetwork,
  resetNetwork,
  advanceTo
}
