const http=require('http'),fs=require('fs'),path=require('path');const root=__dirname;
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);
 if(!f.startsWith(root)||!fs.existsSync(f)){s.writeHead(404);return s.end('nf');}
 const b=fs.readFileSync(f);
 s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});s.end(b);}).listen(4817,()=>console.log('http://localhost:4817'));
