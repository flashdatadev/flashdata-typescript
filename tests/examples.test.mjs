import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, readdir, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
const fixtures=JSON.parse(await readFile(new URL('./fixtures/source-examples.json',import.meta.url),'utf8'));

for(const source of Object.keys(fixtures)) {
  test(`${source} example executes with fake HTTP`,async()=>{
    const dir=await mkdtemp(join(tmpdir(),'flashdata-example-'));
    try {
      const storage=join(dir,'storage.json'); await writeFile(storage,JSON.stringify(fixtures.youtube_download.request.params.storage));
      const output=execFileSync(process.execPath,['--import','./tests/mock-fetch.mjs',`examples/${source}.mjs`],{
        cwd:root,encoding:'utf8',timeout:15000,env:{...process.env,FLASHDATA_API_KEY:'offline-example-key',FLASHDATA_STORAGE_FILE:storage},
      });
      assert(output.trim().length>0);
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
}
async function pages(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) result.push(...await pages(path));
    else if(entry.name.endsWith('.md')) result.push(path);
  }
  return result;
}
test('documentation links, JavaScript blocks and complete source coverage',async()=>{
  const paths=[join(root,'README.md'),join(root,'CONTRIBUTING.md'),join(root,'examples/README.md'),...await pages(join(root,'docs'))];
  let blocks=0;
  for(const path of paths) {
    const text=await readFile(path,'utf8');
    for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      if(/^[a-z]+:/.test(match[1])||match[1].startsWith('#')) continue;
      await access(resolve(dirname(path),match[1].split('#')[0]));
    }
    for(const match of text.matchAll(/```javascript\n([\s\S]*?)```/g)) {
      execFileSync(process.execPath,['--input-type=module','--check'],{input:match[1],encoding:'utf8'}); blocks++;
    }
  }
  assert(blocks>=20);
  const contract=JSON.parse(await readFile(join(root,'source-contract.json'),'utf8'));
  assert.equal(Object.keys(contract).length,15); assert.deepEqual(Object.keys(contract).sort(),Object.keys(fixtures).sort());
});
