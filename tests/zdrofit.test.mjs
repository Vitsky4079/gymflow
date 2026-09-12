import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gyms,equipmentForGym,normalizeSteps} from '../dist/gyms.js';
import {findGymPath,approachPoint} from '../dist/gym-routing.js';
import {createTestWorkspace} from '../dist/test-workspace.js';
const gym=gyms.find(g=>g.id==='zdrofit-nieborowska'),stations=equipmentForGym(gym.id);
test('original layout and equipment snapshots stay unchanged',()=>{
 const expected={studio:'10c0c65d22cea901a00d8d899ee45def12db0d0c6eba9f42a4989be806fd61ac',atlas:'f3d4952864193851fc3de544a5ae31810e97291db3113683e498da22540f3a5a'};
 // Snapshots verified against commit 15a19c1 before integrating this gym, including placements and presets.
 for(const [id,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(JSON.stringify([gyms.find(g=>g.id===id),equipmentForGym(id)])).digest('hex'),hash,id);
});
test('new stations have unique IDs, local models and valid preset references',async()=>{
 assert.equal(stations.length,43);assert.equal(new Set(stations.map(e=>e.id)).size,43);
 const manifest=JSON.parse(await readFile(new URL('../dist/zdrofit-assets/manifest.json',import.meta.url)));
 for(const e of stations){
  assert.ok(e.name&&e.steps?.length&&e.model,e.id);
  assert.ok(Math.abs(e.x)+e.footprint.w/2<=gym.width/2,e.id);
  assert.ok(e.z-e.footprint.d/2>=gym.minZ&&e.z+e.footprint.d/2<=gym.maxZ,e.id);
  const entry=manifest[e.model];assert.ok(entry,e.model);
  const bytes=await readFile(new URL('../dist/'+entry.url,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.length,entry.bytes);
 }
 for(const p of gym.presets)assert.equal(normalizeSteps(p.ids.map(id=>({id})),gym.id).length,p.ids.length);
});
test('every station is reachable through clear aisles including the enclosed fitness studio',()=>{
 for(const target of stations){
  const path=findGymPath(stations,stations[0],target,gym,0);assert.ok(path.length,target.id);
  const endpoint=approachPoint(target);
  assert.deepEqual(path.at(-1),[Math.round(endpoint.x*2)/2,.12,Math.round(endpoint.z*2)/2||0]);
  const samples=[path[0]];
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.1);for(let j=1;j<=n;j++)samples.push([a[0]+(b[0]-a[0])*j/n,.12,a[2]+(b[2]-a[2])*j/n])}
  for(const [x,,z] of samples){
   assert.ok(!stations.some(e=>Math.abs(x-e.x)<e.footprint.w/2+.15&&Math.abs(z-e.z)<e.footprint.d/2+.15),target.id+' equipment collision');
   assert.ok(!gym.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.15&&Math.abs(z-o.z)<o.d/2+.15),target.id+' wall collision');
  }
 }
});
test('new gym business data persists separately from existing gyms',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const workspace=createTestWorkspace(storage);workspace.gym(gym.id).maintenance.push('treadmill-2');workspace.save();
 const restored=createTestWorkspace(storage);assert.deepEqual(restored.gym(gym.id).maintenance,['treadmill-2']);assert.deepEqual(restored.gym('studio').maintenance,[]);
});
