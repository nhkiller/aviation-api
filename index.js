/**
 * Aviation Stats API - Vercel Edge Functions
 * 
 * 路径处理说明：
 * /api/health          → 健康检查
 * /api/record?date=xxx → 单条记录操作
 * /api/all             → 全部记录
 * /api/import          → 批量导入
 */

export const config = {
  runtime: 'edge',
}

// 内存存储（对于你的数据量完全足够）
const memoryStore = {}

export default async function handler(request) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // 处理所有 /api/* 请求
  if (pathname.startsWith('/api/')) {
    return handleAPIRequest(request, url)
  }
  
  // 根路径返回 API 信息
  return new Response(JSON.stringify({
    name: 'Aviation Stats API',
    version: '1.0',
    endpoints: [
      'GET  /api/health',
      'GET  /api/all',
      'GET  /api/record?date=YYYY-MM-DD',
      'PUT  /api/record?date=YYYY-MM-DD',
      'DELETE /api/record?date=YYYY-MM-DD',
      'POST /api/import'
    ],
    note: '需要 header: X-API-Token: your-token'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

async function handleAPIRequest(request, url) {
  // 跨域处理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
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

  const pathname = url.pathname
  const searchParams = url.searchParams

  try {
    // 健康检查
    if (pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        message: 'Aviation Stats API is running on Vercel',
        timestamp: new Date().toISOString(),
        record_count: Object.keys(memoryStore).length
      })
    }

    // 获取所有记录
    if (pathname === '/api/all' && request.method === 'GET') {
      return jsonResponse(memoryStore)
    }

    // 获取单条记录
    if (pathname === '/api/record' && request.method === 'GET') {
      const date = searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      const data = memoryStore[date]
      if (!data) return jsonResponse(null, 404)
      return jsonResponse(data)
    }

    // 保存记录
    if (pathname === '/api/record' && request.method === 'PUT') {
      const date = searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      const body = await request.json()
      memoryStore[date] = body
      return jsonResponse({ ok: true, date })
    }

    // 删除记录
    if (pathname === '/api/record' && request.method === 'DELETE') {
      const date = searchParams.get('date')
      if (!date) return jsonResponse({ error: 'date参数必填' }, 400)
      delete memoryStore[date]
      return jsonResponse({ ok: true, date })
    }

    // 批量导入
    if (pathname === '/api/import' && request.method === 'POST') {
      const body = await request.json()
      const records = body.records || body
      let count = 0
      for (const [dateKey, data] of Object.entries(records)) {
        memoryStore[dateKey] = data
        count++
      }
      return jsonResponse({ ok: true, imported: count })
    }

    // API 根路径信息
    if (pathname === '/api') {
      return jsonResponse({
        name: 'Aviation Stats API',
        endpoints: [
          { method: 'GET', path: '/api/health', desc: '健康检查' },
          { method: 'GET', path: '/api/all', desc: '获取所有记录' },
          { method: 'GET', path: '/api/record?date=2026-03-25', desc: '获取单条记录' },
          { method: 'PUT', path: '/api/record?date=2026-03-25', desc: '保存记录' },
          { method: 'DELETE', path: '/api/record?date=2026-03-25', desc: '删除记录' },
          { method: 'POST', path: '/api/import', desc: '批量导入' }
        ]
      })
    }

    return jsonResponse({ error: '接口不存在', path: pathname }, 404)

  } catch (e) {
    return jsonResponse({ error: e.message }, 500)
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS'
    }
  })
}
