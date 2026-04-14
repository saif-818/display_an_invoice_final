/**
 * Invoice API Server
 * Built with Node.js built-in http module (no external dependencies)
 * Uses in-memory data store (mimics SQL init.sql data)
 * Serves Swagger UI docs at /api-docs
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;

// ─── In-memory "database" (fixed from init.sql bugs) ──────────────────────────
// init.sql bugs fixed:
//   CREATE TAABLE → CREATE TABLE
//   DECIML(10,2)  → DECIMAL(10,2)
//   REFRENCES     → REFERENCES

const db = {
  invoices: [
    { invoiceId: 1, customerName: 'John Doe', date: '2025-04-14', status: 'Unpaid' }
  ],
  invoiceItems: [
    { itemId: 1, invoiceId: 1, name: 'Widget A',    price: 19.99, quantity: 2 },
    { itemId: 2, invoiceId: 1, name: 'Widget B',    price: 49.99, quantity: 1 },
    { itemId: 3, invoiceId: 1, name: 'Service Fee', price: 15.00, quantity: 1 }
  ]
};

function getInvoice(invoiceId) {
  const invoice = db.invoices.find(i => i.invoiceId === invoiceId);
  if (!invoice) return null;
  const items = db.invoiceItems.filter(i => i.invoiceId === invoiceId);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { ...invoice, items, total: Math.round(total * 100) / 100 };
}

// ─── Swagger spec (OpenAPI 3.0) ───────────────────────────────────────────────
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Invoice API',
    version: '1.0.0',
    description: 'REST API for retrieving invoice data. Fixed from buggy original codebase.'
  },
  servers: [{ url: `http://localhost:${PORT}`, description: 'Local dev server' }],
  paths: {
    '/api/invoice': {
      get: {
        summary: 'Get all invoices',
        operationId: 'getAllInvoices',
        tags: ['Invoices'],
        responses: {
          '200': {
            description: 'List of invoices',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Invoice' }
                }
              }
            }
          }
        }
      }
    },
    '/api/invoice/{id}': {
      get: {
        summary: 'Get invoice by ID',
        operationId: 'getInvoiceById',
        tags: ['Invoices'],
        parameters: [{
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Invoice ID'
        }],
        responses: {
          '200': {
            description: 'Invoice found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Invoice' }
              }
            }
          },
          '404': { description: 'Invoice not found' }
        }
      }
    }
  },
  components: {
    schemas: {
      InvoiceItem: {
        type: 'object',
        properties: {
          itemId:   { type: 'integer' },
          name:     { type: 'string' },
          price:    { type: 'number' },
          quantity: { type: 'integer' }
        }
      },
      Invoice: {
        type: 'object',
        properties: {
          invoiceId:    { type: 'integer' },
          customerName: { type: 'string' },
          date:         { type: 'string', format: 'date' },
          status:       { type: 'string' },
          items:        { type: 'array', items: { $ref: '#/components/schemas/InvoiceItem' } },
          total:        { type: 'number' }
        }
      }
    }
  }
};

// ─── Swagger UI HTML (self-contained, loads from CDN) ─────────────────────────
function swaggerHtml(specJson) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    spec: ${specJson},
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: 'BaseLayout'
  });
</script>
</body>
</html>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function router(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /api/invoice  → all invoices
  if (req.method === 'GET' && pathname === '/api/invoice') {
    const all = db.invoices.map(inv => getInvoice(inv.invoiceId));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(all));
    return;
  }

  // GET /api/invoice/:id
  const invoiceMatch = pathname.match(/^\/api\/invoice\/(\d+)$/);
  if (req.method === 'GET' && invoiceMatch) {
    const inv = getInvoice(parseInt(invoiceMatch[1], 10));
    if (!inv) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(inv));
    return;
  }

  // GET /api/swagger.json
  if (req.method === 'GET' && pathname === '/api/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(swaggerSpec, null, 2));
    return;
  }

  // GET /api-docs
  if (req.method === 'GET' && (pathname === '/api-docs' || pathname === '/api-docs/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(swaggerHtml(JSON.stringify(swaggerSpec)));
    return;
  }

  // Serve frontend static files
  const frontendDir = path.join(__dirname, '..', 'frontend');
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(frontendDir, filePath);

  const ext = path.extname(fullPath);
  const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  const ct = contentTypes[ext] || 'text/plain';

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}

http.createServer(router).listen(PORT, () => {
  console.log(`✅  Invoice server running at http://localhost:${PORT}`);
  console.log(`   UI:          http://localhost:${PORT}/`);
  console.log(`   API:         http://localhost:${PORT}/api/invoice`);
  console.log(`   Swagger UI:  http://localhost:${PORT}/api-docs`);
});
