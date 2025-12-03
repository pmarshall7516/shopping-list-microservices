const userBase = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8001'
const listBase = import.meta.env.VITE_LIST_SERVICE_URL || 'http://localhost:8002'
const inventoryBase = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8003'
const statsBase = import.meta.env.VITE_STATS_SERVICE_URL || 'http://localhost:8004'
const recommenderBase = import.meta.env.VITE_RECOMMENDER_SERVICE_URL || 'http://localhost:8005'

async function request(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Request failed')
  }
  return res.json()
}

export const api = {
  async register(body) {
    return request(`${userBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  async login(email, password) {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return request(`${userBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
  },
  async me(token) {
    return request(`${userBase}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async fetchLists(token) {
    return request(`${listBase}/lists`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async createList(token, body) {
    return request(`${listBase}/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async updateList(token, id, body) {
    return request(`${listBase}/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async deleteList(token, id) {
    return request(`${listBase}/lists/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async fetchList(token, id) {
    return request(`${listBase}/lists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async addListItem(token, listId, body) {
    return request(`${listBase}/lists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async updateListItem(token, listId, listItemId, body) {
    return request(`${listBase}/lists/${listId}/items/${listItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  async deleteListItem(token, listId, listItemId) {
    return request(`${listBase}/lists/${listId}/items/${listItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  async searchInventory(query) {
    const url = query ? `${inventoryBase}/items?text=${encodeURIComponent(query)}` : `${inventoryBase}/items`
    return request(url)
  },
  async createItem(body) {
    return request(`${inventoryBase}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  async fetchCategories() {
    return request(`${inventoryBase}/categories`)
  },
  async statsSummary() {
    return request(`${statsBase}/metrics/summary`)
  },
  async getRecommendations(body) {
    return request(`${recommenderBase}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
}
