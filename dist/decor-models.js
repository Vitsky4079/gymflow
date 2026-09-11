import * as T from 'three';

// Real-world scanned props (lobby furniture, floor tiles, kettlebells) — unlike
// the Matrix machine pack these ship proper PBR textures and are already
// correctly metric-scaled, so no flattenMaterial/normalizeModel treatment is
// needed: just load, clone, place.
let loaderPromise=null;
function getLoader(){
	if(!loaderPromise)loaderPromise=Promise.all([import('three/addons/GLTFLoader.js'),import('three/addons/meshopt_decoder.module.js')]).then(([{GLTFLoader},{MeshoptDecoder}])=>{const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);return loader});
	return loaderPromise;
}
const modelCache=new Map();
function loadTemplate(name){
	if(!modelCache.has(name))modelCache.set(name,getLoader().then(loader=>new Promise((resolve,reject)=>loader.load(`./props/${name}.glb`,gltf=>{gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});resolve(gltf.scene)},undefined,reject))));
	return modelCache.get(name);
}
// Places one prop instance in the room. Callers await the returned promise
// only if they need the instance handle; most room decor is fire-and-forget.
export function placeProp(scene,name,{x=0,y=0,z=0,rotY=0,scale=1}={}){
	return loadTemplate(name).then(template=>{
		const instance=template.clone(true);
		instance.position.set(x,y,z);
		instance.rotation.y=rotY;
		if(scale!==1)instance.scale.setScalar(scale);
		scene.add(instance);
		return instance;
	});
}

// Equipment-station loaders (id-keyed, matching equipment-models.js's
// buildEquipment swap-over-placeholder pattern) for the two catalog items
// these new assets actually replace.
export function loadKettlebellCluster(){
	return Promise.all(['kettlebell_16kg','kettlebell_24kg','kettlebell_32kg'].map(loadTemplate)).then(([a,b,c])=>{
		const group=new T.Group();
		[[a,-.32,0],[b,0,-.04],[c,.32,0]].forEach(([template,x,z])=>{
			const inst=template.clone(true);inst.position.set(x,0,z);group.add(inst);
		});
		return group;
	});
}
export function loadMatsSpread(){
	return loadTemplate('puzzle_mats').then(template=>{
		const group=new T.Group();
		const tile=.61;
		for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++){
			const inst=template.clone(true);
			inst.position.set((ix-1)*tile,0,(iz-1)*tile);
			group.add(inst);
		}
		return group;
	});
}
// Small floor tiles (puzzle_mats above, concrete/rubber below) are metre-scale
// real geometry — fine to place a handful of instances, but tiling a whole
// room out of them would mean hundreds of draw calls. For a big area, reuse
// the tile's own scanned material (already correctly UV-mapped 0–1 across
// the tile) on a single plane instead, with the texture's repeat set to the
// plane's real size in metres — one draw call, same material.
export function tiledFloorMaterial(name,repeatX,repeatZ){
	return loadTemplate(name).then(template=>{
		let material=null;
		template.traverse(o=>{if(o.isMesh&&o.material&&!material)material=o.material});
		const clone=material.clone();
		[clone.map,clone.normalMap,clone.roughnessMap,clone.metalnessMap,clone.aoMap].forEach(tex=>{
			if(!tex)return;
			tex.wrapS=tex.wrapT=T.RepeatWrapping;
			tex.repeat.set(repeatX,repeatZ);
			tex.needsUpdate=true;
		});
		return clone;
	});
}
