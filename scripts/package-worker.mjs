import fs from 'node:fs'
import path from 'node:path'
const assets={}
function collect(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,file.name);if(file.isDirectory())collect(full);else if(/\.(css|js)$/.test(file.name))assets['/_next/'+full.split(path.sep).slice(1).join('/')]=fs.readFileSync(full,'utf8')}}
collect('.next/static')
assets['/']=fs.readFileSync('.next/server/app/index.html','utf8')
const planner=fs.readFileSync('lib/planner.mjs','utf8')
const provider=fs.readFileSync('lib/provider.mjs','utf8').replace(/^import .*$/gm,'')
const service=fs.readFileSync('lib/service.mjs','utf8').replace(/^import .*$/gm,'')
fs.mkdirSync('dist/server',{recursive:true})
fs.writeFileSync('dist/server/index.js',planner+'\n'+provider+'\n'+service+'\nconst assets='+JSON.stringify(assets)+`;
export default {async fetch(request,env){
 const path=new URL(request.url).pathname
 if(path==='/api/plan'||path==='/api/forecast')return handle(request,env)
 if(!Object.hasOwn(assets,path))return new Response('Not found',{status:404})
 return new Response(assets[path],{headers:{'content-type':path==='/'?'text/html; charset=utf-8':path.endsWith('.css')?'text/css':'application/javascript'}})
}}`)
