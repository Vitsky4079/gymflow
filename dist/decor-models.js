import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

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
// A few of these scanned props (the equipment rack's medicine balls and
// kettlebells especially) carry a very low baked-in roughness — under this
// scene's punchier post-lighting-pass reflections that reads as a wet/shiny
// plastic sheen rather than rubber. Clamp roughness up and metalness down
// per-material instead of fighting it with less environment reflection
// globally (which every other prop in the room already looks right under).
function matteify(root,{minRoughness=.6,maxMetalness=.15}={}){
	root.traverse(o=>{
		if(!o.isMesh)return;
		// Object3D.clone() copies each mesh's `.material` by reference, not
		// value — mutating in place would leak into every other instance
		// (and the cached template) sharing that material. Clone first.
		const clone=m=>{if(!m)return m;const c=m.clone();if('roughness' in c)c.roughness=Math.max(c.roughness,minRoughness);if('metalness' in c)c.metalness=Math.min(c.metalness,maxMetalness);return c};
		o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
	});
}
// Places one prop instance in the room. Callers await the returned promise
// only if they need the instance handle; most room decor is fire-and-forget.
export function placeProp(scene,name,{x=0,y=0,z=0,rotY=0,scale=1,matte=null}={}){
	return loadTemplate(name).then(template=>{
		const instance=template.clone(true);
		instance.position.set(x,y,z);
		instance.rotation.y=rotY;
		if(scale!==1)instance.scale.setScalar(scale);
		if(matte)matteify(instance,matte===true?{}:matte);
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
// Tiling a whole zone this way — one plane, UV-repeated texture — reads as
// a smeared, blotchy mess once the tile's own texture has real detail
// (confirmed on the cardio row's floor_mat patches). Real tiles laid edge
// to edge look correct instead; merging every tile's geometry into one
// mesh per material (matching equipment-models.js's per-station merge)
// keeps it to a handful of draw calls despite covering a whole room in
// ~0.6m tiles.
export function tiledMatFloor(scene,name,{x=0,z=0,width,depth,y=.03}={}){
	return loadTemplate(name).then(template=>{
		const box=new T.Box3().setFromObject(template);
		const size=new T.Vector3();box.getSize(size);
		const cols=Math.max(1,Math.round(width/size.x)),rows=Math.max(1,Math.round(depth/size.z));
		const tileW=width/cols,tileD=depth/rows;
		const buckets=new Map();
		for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
			const inst=template.clone(true);
			inst.scale.set(tileW/size.x,1,tileD/size.z);
			inst.position.set(x+(i-(cols-1)/2)*tileW,y,z+(j-(rows-1)/2)*tileD);
			inst.updateMatrixWorld(true);
			inst.traverse(o=>{
				if(!o.isMesh)return;
				let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
				if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat}
				const arr=buckets.get(o.material)||[];arr.push(geo);buckets.set(o.material,arr);
			});
		}
		const group=new T.Group();
		for(const [m,geos] of buckets){
			const merged=mergeGeometries(geos,false);
			if(merged)group.add(new T.Mesh(merged,m));
			geos.forEach(g=>g.dispose());
		}
		group.traverse(o=>{if(o.isMesh)o.receiveShadow=true});
		scene.add(group);
		return group;
	});
}
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
