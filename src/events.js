'use strict';
// Server-sent events: pushes record changes to every open browser (single-instance deployment).
const clients = new Set();

function sseHandler(req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  const c = { res, uid: req.user.id };
  clients.add(c);
  const hb = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(hb); clients.delete(c); });
}

function broadcast(event, data, onlyUid) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) if (!onlyUid || c.uid === onlyUid) c.res.write(msg);
}

module.exports = { sseHandler, broadcast };
