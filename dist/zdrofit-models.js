import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

// Per-scene cache: clones share GPU resources only within this scene's lifetime.
// Old gyms keep their existing model loader and procedural geometry intact.
export function createZdrofitModels() {
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache=new Map(), pending=[];
  let active=0;
  function drain(){while(active<3&&pending.length){active++;const task=pending.shift();task().finally(()=>{active--;drain()})}}
  function load(key){
    if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{pending.push(async()=>{
      try{const gltf=await loader.loadAsync(new URL(`./zdrofit-assets/${key}.glb`,import.meta.url).href);resolve(gltf.scene)}catch(error){reject(error)}
    });drain()}));
    return cache.get(key);
  }
  async function instance(key,{height,width,depth}={}){
    const template=await load(key), model=template.clone(true);
    const wrapper=new T.Group();wrapper.add(model);
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
    const scale=height?height/size.y:width?width/size.x:depth?depth/size.z:1;
    model.scale.multiplyScalar(scale);
    const box=new T.Box3().setFromObject(model);
    model.position.x-=(box.min.x+box.max.x)/2;model.position.z-=(box.min.z+box.max.z)/2;model.position.y-=box.min.y;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    wrapper.userData.asset=key;return wrapper;
  }
  function dispose(){for(const promise of cache.values())promise.then(root=>root.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{Object.values(m).filter(v=>v?.isTexture).forEach(v=>v.dispose());m.dispose()})})).catch(()=>{})}
  return {instance,dispose,async equipment(e){
    const group=await instance(e.model,e.floorPatch?{width:.75}:{height:e.height});
    group.name=e.id;
    if(e.id==='kettlebell')for(const [key,x,h] of [['kettlebell16',-.5,.26],['kettlebell32',.5,.34]]){const extra=await instance(key,{height:h});extra.position.x=x;group.add(extra)}
    return group;
  }};
}
