'use strict';
require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const http = require('http');
const path = require('path');
const { execSync } = require('child_process');

let qrBuffer = null; // PNG buffer do QR atual

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR</title>
  <style>
    body{background:#111;display:flex;flex-direction:column;align-items:center;
         justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#fff;}
    img{border:12px solid white;border-radius:12px;width:320px;height:320px;display:none;}
    #msg{font-size:20px;margin-bottom:20px;}
    small{opacity:.5;margin-top:8px;font-size:13px;}
  </style>
</head>
<body>
  <div id="msg">⏳ Aguardando QR...</div>
  <img id="qr" alt="QR Code">
  <p style="margin-top:20px;font-size:18px;opacity:.8;">Escaneie com o WhatsApp</p>
  <small>⋮ Menu → Dispositivos vinculados → Vincular dispositivo</small>
  <script>
    function poll(){
      fetch('/qr.png?t='+Date.now())
        .then(r=>{
          if(r.ok && r.headers.get('content-type').includes('image')){
            return r.blob().then(b=>{
              const url=URL.createObjectURL(b);
              const img=document.getElementById('qr');
              img.src=url; img.style.display='block';
              document.getElementById('msg').textContent='📱 Escaneie agora!';
            });
          }
        }).catch(()=>{});
      setTimeout(poll,3000);
    }
    poll();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/qr.png')) {
    if (qrBuffer) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(qrBuffer);
    } else {
      res.writeHead(204); res.end();
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
  }
});

server.listen(3200, '127.0.0.1', () => {
  console.log('Servidor QR em http://localhost:3200');
  try { execSync('start http://localhost:3200'); } catch {}
});

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', '.wwebjs_auth') }),
  puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.on('qr', async (qr) => {
  qrBuffer = await QRCode.toBuffer(qr, { scale: 10 });
  console.log('✅ QR pronto — acesse http://localhost:3200');
});

client.on('authenticated', () => console.log('✅ Autenticado!'));

client.on('ready', () => {
  console.log('✅ Conectado! Reiniciando bot principal...');
  server.close();
  try { execSync('pm2 start br-pneus-bot', { cwd: path.join(__dirname, '..') }); } catch {}
  setTimeout(() => process.exit(0), 1500);
});

client.initialize().catch(err => {
  console.error('Erro ao iniciar:', err.message);
  process.exit(1);
});
