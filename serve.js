const http=require('http'),fs=require('fs'),path=require('path');const root=__dirname;
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((q,s)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(q.method==='POST' && p==='/save'){ const name=(new URL(q.url,'http://x')).searchParams.get('name')||'';
    if(!/^[a-z0-9-]+\.(jpg|glb|json)$/.test(name)){ s.writeHead(400); return s.end('bad name'); }
    const dir=path.join(root,name.endsWith('.jpg')?'images':'blender'); // renders → images/, the Blender export → blender/
    const chunks=[]; q.on('data',c=>chunks.push(c)); q.on('end',()=>{ fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,name),Buffer.concat(chunks)); s.writeHead(200); s.end('ok'); }); return; }
  if(p==='/')p='/index.html'; const f=path.join(root,p);
  if(!f.startsWith(root)||!fs.existsSync(f)){s.writeHead(404);return s.end('nf');}
  let b=fs.readFileSync(f); if(p==='/index.html' && !b.toString('utf8',0,20).startsWith('<!doctype')) b=Buffer.from('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+b+'</body></html>');
  s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'}); s.end(b);
}).listen(4817,()=>console.log('http://localhost:4817'));
