import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FlashData } from '../dist/index.js';

test('native fetch uses separate API/storage requests and streams uploads',async()=>{
  const seen=[];
  const storage=createServer(async(req,res)=>{
    seen.push(req.headers);
    if(req.method==='PUT') {
      let text=''; for await(const chunk of req) text+=chunk.toString(); assert.equal(text,'dQw4w9WgXcQ\n');
      res.writeHead(200,{'content-length':'0'});res.end();
    } else {res.setHeader('content-type','application/json');res.end(JSON.stringify({stored:true}));}
  });
  storage.listen(0,'127.0.0.1');await once(storage,'listening');
  const storageURL=`http://127.0.0.1:${storage.address().port}`;
  const api=createServer(async(req,res)=>{
    assert.equal(req.headers['x-api-key'],'local-http-key');
    if(req.method==='POST') {
      let text='';for await(const chunk of req) text+=chunk.toString();const body=JSON.parse(text);
      assert.equal(body.params.autocorrect,false);
      res.end(JSON.stringify({source:body.source,status:'done',results:[]}));
    } else if(req.url==='/v2/api-access') res.end(JSON.stringify({sources:[],result_origin:storageURL}));
    else {res.writeHead(302,{location:storageURL+'/result?signed=local-only','set-cookie':'private=api-cookie'});res.end();}
  });
  api.listen(0,'127.0.0.1');await once(api,'listening');
  const apiURL=`http://127.0.0.1:${api.address().port}`;
  const dir=await mkdtemp(join(tmpdir(),'flashdata-http-'));const path=join(dir,'ids.txt');await writeFile(path,'dQw4w9WgXcQ\n');
  try {
    const client=new FlashData({apiKey:'local-http-key',dataURL:apiURL,managementURL:apiURL});
    assert.equal((await client.google.search({query:'coffee',autocorrect:false})).status,'done');
    assert.deepEqual(await client.jobs.result('job_local123'),{stored:true});
    await client.bulk.uploadFile({job:{id:'bulk_local123'},upload:{method:'PUT',contentType:'text/plain; charset=utf-8',href:storageURL+'/input'}},path);
    assert.equal(seen.length,2); assert(seen.every(h=>!h['x-api-key']&&!h.authorization&&!h.cookie));
  } finally {
    api.closeAllConnections();storage.closeAllConnections();
    await Promise.all([new Promise(resolve=>api.close(resolve)),new Promise(resolve=>storage.close(resolve))]);
    await rm(dir,{recursive:true,force:true});
  }
});
