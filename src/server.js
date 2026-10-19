const http = require('http');
const { TicketFlowService } = require('./service');

const service = new TicketFlowService();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function routeKey(method, path) {
  return `${method} ${path}`;
}

function parsePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const parts = parsePath(url.pathname);

    if (routeKey(req.method, url.pathname) === 'POST /events') {
      const body = await readBody(req);
      return sendJson(res, 201, service.createEvent(body));
    }

    if (parts.length === 2 && parts[0] === 'events' && req.method === 'GET') {
      return sendJson(res, 200, service.getEvent(parts[1]));
    }

    if (routeKey(req.method, url.pathname) === 'POST /holds') {
      const body = await readBody(req);
      return sendJson(res, 201, service.createHold(body));
    }

    if (routeKey(req.method, url.pathname) === 'POST /payments') {
      const body = await readBody(req);
      return sendJson(res, 201, service.createPayment(body));
    }

    if (parts.length === 3 && parts[0] === 'payments' && parts[2] === 'confirm' && req.method === 'POST') {
      return sendJson(res, 200, service.confirmPayment(parts[1]));
    }

    if (parts.length === 2 && parts[0] === 'bookings' && req.method === 'GET') {
      return sendJson(res, 200, service.getBooking(parts[1]));
    }

    if (routeKey(req.method, url.pathname) === 'GET /admin/dashboard') {
      return sendJson(res, 200, service.getAdminDashboard());
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return sendJson(res, 400, { error: 'Invalid JSON body' });
    }
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    process.stdout.write(`TicketFlow server listening on ${port}\n`);
  });
}

module.exports = {
  server,
  service,
};
