import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Most of these are real-world scans (lobby furniture, floor tiles,
// kettlebells) that ship proper PBR textures and are already correctly
// metric-scaled — no treatment needed, just load, clone, place. The
// free-weight zone's rack/bench/barbell/dumbbell-rack props are instead
// pulled from the same Matrix CAD-export pack as the real equipment
// stations, which needs flattenMaterial's frame/dark cleanup (see
// equipment-models.js's copy for why) — `flatten` opts a prop into that.
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
// Duplicated from equipment-models.js rather than imported — that module
// already imports from this one (loadKettlebellCluster/loadMatsSpread), and
// this half is small and stable enough that a circular import isn't worth it.
const FRAME_KEYWORDS=['paint','frame','coating','wht','white','chrome'];
const isFrameMaterial=name=>FRAME_KEYWORDS.some(k=>(name||'').toLowerCase().includes(k));
const isYellowMaterial=name=>(name||'').toLowerCase().includes('yellow');
// Several free-weight props bake a tiny "PaletteMaterial"/"Palette*" texture
// per material instead of a real photographic one — some genuinely encode a
// colour accent (red weight-plate red, safety-yellow knobs), but most are
// just a grayscale AO-style shading strip with no hue at all, no black, and
// no yellow. Their material names carry zero frame/dark signal either way
// (PaletteMaterial001, etc.), so the only way to tell the two apart is to
// look at the pixels: a real saturated swatch is trustworthy on its own, but
// a colourless one needs the same light-frame/dark-pad recolour real
// equipment gets, or it reads as flat, contrast-less white/grey instead of
// matching the rest of the gym.
// A single material can cover a whole shared mesh — a rack's frame tubes
// AND its pull-up grips, say — with per-face UV variation the only thing
// telling them apart (the earlier grayscale bands: ~239 down to ~94 within
// one material's own texture). Averaging that whole texture to one number
// and recoloring the entire material flat washes out exactly that contrast,
// which is why some props still looked uniformly white/grey after the last
// fix. Recolor pixel-by-pixel instead: same size, same UVs, each texel
// rebucketed into frame-light or pad-dark by its own brightness, so whatever
// shape already carried the contrast keeps it.
const paletteCache=new Map();
function paletteInfo(tex){
	if(!tex?.image)return null;
	if(paletteCache.has(tex.uuid))return paletteCache.get(tex.uuid);
	const img=tex.image;
	const w=img.width,h=img.height;
	let info=null;
	if(w&&h){
		const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
		const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
		const imageData=ctx.getImageData(0,0,w,h);
		const data=imageData.data;
		let maxSat=0,n=0;
		const frameRGB=[0xa7,0xab,0xaf],darkRGB=[0x17,0x19,0x1a];
		for(let i=0;i<data.length;i+=4){
			if(data[i+3]===0)continue;
			const r=data[i],g=data[i+1],b=data[i+2];
			const max=Math.max(r,g,b),min=Math.min(r,g,b);
			maxSat=Math.max(maxSat,max===0?0:(max-min)/max);
			n++;
			const luminance=(0.2126*r+0.7152*g+0.0722*b)/255;
			const [nr,ng,nb]=luminance>.55?frameRGB:darkRGB;
			data[i]=nr;data[i+1]=ng;data[i+2]=nb;
		}
		if(n){
			ctx.putImageData(imageData,0,0);
			const recolored=new T.CanvasTexture(canvas);
			recolored.colorSpace=tex.colorSpace;recolored.flipY=tex.flipY;
			recolored.wrapS=tex.wrapS;recolored.wrapT=tex.wrapT;
			recolored.magFilter=tex.magFilter;recolored.minFilter=tex.minFilter;
			recolored.needsUpdate=true;
			info={maxSaturation:maxSat,recolored};
		}
	}
	paletteCache.set(tex.uuid,info);
	return info;
}
function flattenMaterial(m){
	if(!m)return;
	const info=m.map&&paletteInfo(m.map);
	if(m.map&&info?.maxSaturation>.15)return;
	m.emissiveMap?.dispose();m.emissiveMap=null;m.metalnessMap?.dispose();m.metalnessMap=null;m.roughnessMap?.dispose();m.roughnessMap=null;
	if(info){
		m.map.dispose();m.map=info.recolored;m.color?.set('#ffffff');
		if('metalness' in m)m.metalness=.3;
		if('roughness' in m)m.roughness=.4;
	}else{
		const frame=isFrameMaterial(m.name),yellow=!frame&&isYellowMaterial(m.name);
		m.color?.set(frame?'#a7abaf':yellow?'#b8860c':'#17191a');
		if('metalness' in m)m.metalness=frame?.65:yellow?.3:.05;
		if('roughness' in m)m.roughness=frame?.3:yellow?.4:.6;
	}
	m.needsUpdate=true;
}
function flattenModel(root){
	root.traverse(o=>{
		if(!o.isMesh)return;
		// clone() copies `.material` by reference — mutating in place would
		// leak into every other instance (and the cached template) sharing it.
		const clone=m=>{if(!m)return m;const c=m.clone();flattenMaterial(c);return c};
		o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
	});
}
// Places one prop instance in the room. Callers await the returned promise
// only if they need the instance handle; most room decor is fire-and-forget.
export function placeProp(scene,name,{x=0,y=0,z=0,rotY=0,scale=1,flatten=false}={}){
	return loadTemplate(name).then(template=>{
		const instance=template.clone(true);
		instance.position.set(x,y,z);
		instance.rotation.y=rotY;
		if(scale!==1)instance.scale.setScalar(scale);
		if(flatten)flattenModel(instance);
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
// real geometry — fine to place a handful of instances (the cardio row's
// floor_mat patches, 6-14 tiles each), but tiling a whole zone out of them
// packs in hundreds of copies. Merging that many into one mesh worked for
// floor_mat, but puzzle_mats' own geometry is dense enough that the same
// approach produced a single ~28-million-vertex mesh for the free-weight
// zone — which silently failed to render properly. Reuse the tile's own
// scanned material (already correctly UV-mapped 0–1 across the tile) on a
// single plane instead, with the texture's repeat set to the plane's real
// size in metres — one draw call, same material, at the cost of the
// texture repeating in a visibly regular grid up close.
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
