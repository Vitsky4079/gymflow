import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server = http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    if (!filename.startsWith(root) || !(await stat(filename)).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const bytes = await readFile(filename);
    res.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-cache','Content-Length':bytes.length});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error',error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Close the other server or set PORT to another number.` : error.message);
  process.exitCode = 1;
});
server.listen(port,'127.0.0.1',() => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`GymFlow is running at ${url}\nKeep this window open. Press Ctrl+C to stop.`);
  if (process.platform === 'win32' && !process.argv.includes('--no-open')) {
    const child = spawn('cmd.exe',['/d','/c',`start "" "${url}"`],{stdio:'ignore'});
    child.on('error',() => console.log('Open the address above in your browser.'));
  }
});
