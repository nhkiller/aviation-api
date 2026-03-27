import { NextResponse } from 'next/server'

// 内存存储（生产环境应该用数据库，对于你的数据量完全够用）
const memoryStore = {}

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  // 跨域处理
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS'
      }
    })
  }

  // Token 鉴权
  const token = request.headers.get('X-API-Token')
  const apiToken = process.env.API_TOKEN || 'aviation2026'
  
  if (token !== apiToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const path = url.pathname

  try {
    // 健康检查
    if (path === '/api/health') {
      return jsonResponse({
        status: 'ok',
        message: 'Aviation Stats API is running on Vercel',
        timestamp: new Date().toISOString(),
        record_count: Object.keys(memoryStore).length
      })
    }

    // 获取所有记录
    if (path === '/api/all' && request.method === 'GET') {
      return jsonResponse(memoryStore)
    }

    // 获取单条记录
    if (path === '/api/record' && request.method === 'GET') {
      const date = url.searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      const data = memoryStore[date]
      if (!data) return jsonResponse(null, 404)
      return jsonResponse(data)
    }

    // 保存记录
    if (path === '/api/record' && request.method === 'PUT') {
      const date = url.searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      const body = await request.json()
      memoryStore[date] = body
      return jsonResponse({ ok: true, date })
    }

    // 删除记录
    if (path === '/api/record' && request.method === 'DELETE') {
      const date = url.searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      delete memoryStore[date]
      return jsonResponse({ ok: true, date })
    }

    // 批量导入
    if (path === '/api/import' && request.method === 'POST') {
      const body = await request.json()
      const records = body.records || body
      let count = 0
      for (const [dateKey, data] of Object.entries(records)) {
        memoryStore[dateKey] = data
        count++
      }
      return jsonResponse({ ok: true, imported: count })
    }

    return jsonResponse({ error: '接口不存在' }, 404)

  } catch (e) {
    return jsonResponse({ error: e.message }, 500)
  }
}

function jsonResponse(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS'
    }
  })
}