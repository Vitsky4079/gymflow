import {findGymPath,approachPoint} from './gym-routing.js';
import {t,machine,getLanguage} from './i18n.js';
import {cameraMovement,isTypingTarget} from './camera-navigation.js';
import {buildEquipment,preloadModels} from './equipment-models.js';
import {placeProp,tiledFloorMaterial} from './decor-models.js';
export async function createMap(allEquipment,choose,gym,currentFloor,onStairs,isCurrent=()=>true){const equipment=allEquipment.filter(e=>e.floor===currentFloor);
// Kick this off now, in parallel with the imports/scene setup below, instead
// of waiting until the equipment loop — by the time we actually build the
// station groups further down, the real models are hopefully already
// fetched and cached, so buildEquipment's placeholder-then-swap resolves
// before the first frame instead of 2-3s visibly later.
const modelsReady=gym.reconstruction?Promise.resolve():preloadModels(equipment.map(e=>e.id));
const lifecycle=new AbortController();const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:lifecycle.signal});let disposed=false,frameId,dirty=true;const $=s=>document.querySelector(s);const THREE=await import('three');const {OrbitControls}=await import('three/addons/OrbitControls.js');const container=$('#scene');const scene=new THREE.Scene();scene.background=new THREE.Color('#edf2ee');let reconstruction=null,loadedEquipment=null,reconstructionAssets=null;if(gym.reconstruction){const [{createZdrofitModels},{buildZdrofitInterior}]=await Promise.all([import('./zdrofit-models.js'),import('./zdrofit-interior.js')]);const assets=reconstructionAssets=createZdrofitModels();try{[reconstruction,loadedEquipment]=await Promise.all([buildZdrofitInterior(scene,assets),Promise.all(equipment.map(e=>assets.equipment(e)))]);}catch(error){assets.dispose();throw error}if(!isCurrent()){scene.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{Object.values(m).filter(v=>v?.isTexture).forEach(v=>v.dispose());m.dispose()})});assets.dispose();throw new Error('Stale gym load')}}const camera=new THREE.PerspectiveCamera(34,1,.1,250);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.97;renderer.setClearColor('#edf2ee');container.appendChild(renderer.domElement);
// Real GLB machines are PBR (metalness/roughness) and look flat/matte with
// only directional lights and nothing to reflect. A synthetic "room" IBL
// (three.js's built-in RoomEnvironment, no HDRI file to download) gives
// metal surfaces believable highlights, matching how they look rendered
// in a lit studio — this is purely lighting, the models are unchanged.
const {RoomEnvironment}=await import('three/addons/RoomEnvironment.js');
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
scene.environmentIntensity=.42;
pmrem.dispose();
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.15;controls.maxPolarAngle=Math.PI*.475;controls.minDistance=4;controls.maxDistance=145;controls.target.set(0,0,0);controls.enablePan=true;
// Some Android WebViews don't reliably report a second finger as its own
// Pointer Events pointerId, so OrbitControls' own 1-vs-2-finger bookkeeping
// can get stuck thinking it's a single-finger drag for an entire two-finger
// gesture — turning an intended pan/zoom into a runaway rotate. Raw
// TouchEvents (touches.length) are a much more reliable finger count, so use
// them as ground truth: hard-disable rotate for as long as 2+ fingers are
// actually on the glass, regardless of what OrbitControls' internal state
// thinks, and clear out any rotation that already snuck in.
const syncTouchRotate=event=>{controls.enableRotate=event.touches.length<2;if(event.touches.length>=2){controls._sphericalDelta.theta=0;controls._sphericalDelta.phi=0}};
on(renderer.domElement,'touchstart',syncTouchRotate);
on(renderer.domElement,'touchmove',syncTouchRotate);
on(renderer.domElement,'touchend',syncTouchRotate);
on(renderer.domElement,'touchcancel',syncTouchRotate);
// Cinematic rig: a cool, hard key light carves deep shadows instead of the
// flat, evenly-lit "product catalog" look a bright neutral hemisphere gives —
// dim the ambient way down and let a warm kicker light (instead of a
// neutral fill) pick out edges on the opposite side for that moody
// cool-key/warm-rim contrast.
scene.add(new THREE.HemisphereLight(0x8fa3c9,0x0c0d0f,.55));const sun=new THREE.DirectionalLight(0xf1f5ff,4.4);sun.position.set(-12,22,-8);sun.castShadow=true;sun.shadow.mapSize.set(container.clientWidth>600?4096:2048,container.clientWidth>600?4096:2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.normalBias=.018;sun.shadow.bias=-.00012;sun.shadow.radius=4;scene.add(sun);const fillLight=new THREE.DirectionalLight(0xff9a4d,.65);fillLight.position.set(15,9,-13);scene.add(fillLight);
const mat=(c,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color:c,metalness,roughness});const frame=mat('#56595b',.7,.32),dark=mat('#202224',.2,.6),pad=mat('#27292b'),silver=mat('#c6cbce',.9,.23),light=mat('#e1e9df'),rubber=mat('#39483e'),floorMat=mat('#686a67'),green=mat('#648c62');
function box(parent,w,h,d,x,y,z,m=frame){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cylinder(parent,r,h,x,y,z,m=frame){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
function bar(parent,a,b,r=.055,m=frame){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),10),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());o.castShadow=true;parent.add(o);return o}
function surface(m,type){m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=(modelMatrix*vec4(position,1.0)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vSurface;
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
${type==='wood'?`vec2 p=vSurface.xz;float plank=floor(p.x/.32);float offset=hash2(vec2(plank,2.0))*2.4;float segment=floor((p.y+offset)/2.5);float variation=hash2(vec2(plank,segment));float grain=sin(p.x*350.0+sin(p.y*1.8+plank)*3.0+sin(p.y*8.0)*.5);float fine=hash2(floor(p*vec2(800.0,90.0)));float seam=step(.014,fract(p.x/.32))*step(.008,fract((p.y+offset)/2.5));diffuseColor.rgb*=mix(.76,1.25,variation)*(0.94+grain*.045+fine*.055)*mix(.35,1.0,seam);`:`vec2 p=vSurface.xz;float speckle=hash2(floor(p*180.0));float tile=hash2(floor(p/1.2));diffuseColor.rgb*=.84+tile*.19+speckle*.065;float seam=step(.004,fract(p.x/1.2))*step(.004,fract(p.y/1.2));diffuseColor.rgb*=mix(.6,1.0,seam);`}`)};m.customProgramCacheKey=()=>type;return m}
const wood=surface(mat('#8d7353',0,.65),'wood');
function wall(w,d,x,z){return box(scene,w,3.3,d,x,1.65,z,mat('#ebeae7'))}
const floorLabels=[];function textOnFloor(key,x,z,size=1.8){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,768,128);ctx.font='600 44px sans-serif';ctx.textAlign='center';ctx.fillStyle='#aeb3b0';ctx.fillText(t(key),384,77);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*3,size*.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.055,z);scene.add(mesh);floorLabels.push({key,canvas:c,ctx,mesh})}
if(gym.reconstruction){
// The independent reconstruction is already loaded.
}else if(gym.id==='studio'){
box(scene,36.4,.65,33.5,0,-.45,3.05,mat('#8a948b'));box(scene,36,.12,33.1,0,-.06,3.05,floorMat);
box(scene,35.7,.03,5,0,.025,-10,wood);
// Free weights (west) and machines (east) each get their own puzzle-mat
// floor, with a concrete aisle straight up the middle — walk in from the
// entrance, then choose left or right. (The old east zone used a visibly
// lighter rubber color than the west one, '#505253' vs '#414346' — the
// brightness mismatch the concrete/mat split below replaces.)
const aisleFloor=box(scene,6,.03,18.1,0,.025,1.55,mat('#8a8f8c',0,.9));
tiledFloorMaterial('concrete_floor',6,18).then(m=>{aisleFloor.material=m;dirty=true});
// Both zones share the same repeated-texture plane so the color actually
// matches. The free-weight zone used to merge ~750 individual puzzle_mats
// tiles into one mesh instead (tiledMatFloor, removed) for a more
// authentic look — but that tile's geometry is dense enough that it
// merged into a ~28-million-vertex mesh, which is why that floor was
// rendering as flat, untextured grey instead of a tiled mat.
const westMatsFloor=box(scene,15,.03,18.1,-10.5,.025,1.55,mat('#3c4640',0,.9));
tiledFloorMaterial('puzzle_mats',25,30).then(m=>{westMatsFloor.material=m;dirty=true});
const eastMatsFloor=box(scene,15,.03,18.1,10.5,.025,1.55,mat('#3c4640',0,.9));
tiledFloorMaterial('puzzle_mats',25,30).then(m=>{eastMatsFloor.material=m;dirty=true});
// Each cardio machine (real station or decorative duplicate — the whole
// row is one evenly spaced 2.4m grid from x=-15.6 to 15.6) gets its own
// mat patch instead of standing directly on the wood, with wood still
// showing through the gaps between machines. Built from real floor_mat
// tiles (2x scale, 2x3 grid, laid edge-to-edge with no overlap) rather
// than one plane with a UV-repeated texture — the repeated texture read
// as a smeared, blotchy mess instead of a clean tiled mat. Sits above
// the real stations' soft ground-shadow decal (y=.061, added later
// below) rather than under it, so that shadow doesn't darken the mats.
for(let i=0;i<14;i++){const cx=-15.6+i*2.4;for(const dx of [-.51,.51])for(const dz of [-1.02,0,1.02])placeProp(scene,'floor_mat',{x:cx+dx,y:.065,z:-10+dz,scale:2});}
// The lobby reads as its own space (not more training floor) with a real
// scanned polished-concrete material instead of the wood/rubber zones —
// one tiled plane rather than hundreds of individual floor-tile props.
const lobbyFloor=box(scene,36.2,.03,9,0,.025,15.1,wood);
tiledFloorMaterial('concrete_floor',37,9).then(m=>{lobbyFloor.material=m;dirty=true});
// Kept the lobby tight (front wall pulled back in from z=21.6 to z=19.6,
// per feedback that the whole area had grown too big). The two changing
// rooms sit on opposite sides of the lobby — mirror images of each other —
// instead of stacked together, so reception (in the middle, by the door)
// has one right next to it either way you turn.
wall(36.4,.22,0,-13.5);wall(.22,33.1,-18.1,3.05);wall(.22,33.1,18.1,3.05);wall(15,.22,-10.6,19.6);wall(15,.22,10.6,19.6);
// Each changing room needs its own 4th wall closing it off from the
// training floor (z=10.6) — without it the room was only enclosed on
// three sides and bled straight into the free-weights/functional zone.
wall(10.1,.18,-13.05,10.6);wall(.18,3.7,-8,12.45);wall(.18,3.7,-8,17.75);
wall(10.1,.18,13.05,10.6);wall(.18,3.7,8,12.45);wall(.18,3.7,8,17.75);
// Men's (west side) — lockers along the long outer wall plus both short
// walls so the room reads as lined with lockers, not just one bank.
// gym_locker_02 is a real ~6.2m bank (not the ~4.5m guessed earlier) —
// one centered on the wall fills it; a second one would've both
// overlapped it and poked through the front/back walls.
placeProp(scene,'gym_locker_02',{x:-17.5,z:15.1,rotY:Math.PI/2});
placeProp(scene,'gym_locker_01',{x:-13.05,z:11.1,rotY:0});
placeProp(scene,'gym_locker_01',{x:-13.05,z:19.1,rotY:Math.PI});
placeProp(scene,'gym_locker_01',{x:-8.55,z:12.45,rotY:-Math.PI/2});
placeProp(scene,'gym_locker_01',{x:-8.55,z:17.75,rotY:-Math.PI/2});
box(scene,3,.15,.6,-13.05,.5,13,wood);[-14.1,-12].forEach(x=>box(scene,.12,.5,.4,x,.25,13,dark));
box(scene,3,.15,.6,-13.05,.5,17.5,wood);[-14.1,-12].forEach(x=>box(scene,.12,.5,.4,x,.25,17.5,dark));
textOnFloor('changingMen',-13.05,15.1,1);
// Women's (east side, right by reception) — mirror layout.
placeProp(scene,'gym_locker_02',{x:17.5,z:15.1,rotY:-Math.PI/2});
placeProp(scene,'gym_locker_01',{x:13.05,z:11.1,rotY:0});
placeProp(scene,'gym_locker_01',{x:13.05,z:19.1,rotY:Math.PI});
placeProp(scene,'gym_locker_01',{x:8.55,z:12.45,rotY:Math.PI/2});
placeProp(scene,'gym_locker_01',{x:8.55,z:17.75,rotY:Math.PI/2});
box(scene,3,.15,.6,13.05,.5,13,wood);[12,14.1].forEach(x=>box(scene,.12,.5,.4,x,.25,13,dark));
box(scene,3,.15,.6,13.05,.5,17.5,wood);[12,14.1].forEach(x=>box(scene,.12,.5,.4,x,.25,17.5,dark));
textOnFloor('changingWomen',13.05,15.1,1);
// Reception pulled right up to the entrance so it's the first thing
// visitors see walking in through the door gap at x:[-3.1,3.1]. Sized up
// (its backdrop panel was leaving bare wall showing above and beside it)
// and pushed back so that backdrop actually touches the front wall
// instead of standing 0.26m clear of it.
placeProp(scene,'reception_desk_no51',{x:5,z:18.5,rotY:Math.PI,scale:1.05});
for(let x=-15;x<17;x+=5.8){box(scene,4.8,1.55,.035,x,2.1,-13.36,mat('#c0d0d6',.6,.15));box(scene,4.9,.07,.08,x,1.3,-13.3,silver)}
// The cardio row only has one real, clickable station per machine type —
// fill each type out into a proper side-by-side bank of three (like a real
// gym's cardio wall) with non-interactive duplicates. rotY matches the
// real stations' CARDIO_WALL rotation in gyms.js so every unit — real or
// decorative — faces the same TV wall. The end of the row is a second
// stair climber; the real airbike station (a second, real, bike-type
// unit) now fills one of the two "bike" slots instead of a duplicate.
[['treadmill',-10.8],['treadmill',-8.4],['bike',-1.2],['elliptical',3.6],['elliptical',6],['rower',10.8],['rower',13.2],['stairs',15.6]]
	.forEach(([kind,x])=>{const g=buildEquipment({id:kind,kind});g.position.set(x,.065,-10);g.rotation.y=Math.PI;if(!loadedEquipment)g.scale.setScalar(1.08);scene.add(g)});
// Mirror wall, wall-mounted bars and accessories.
box(scene,.025,1.8,9,-17.94,1.75,6,mat('#aebcbc',.8,.15));for(let z=-5;z<3;z+=2){bar(scene,[-17.6,.3,z],[-17.6,2.8,z],.04,wood);bar(scene,[-17.6,.3,z+1.4],[-17.6,2.8,z+1.4],.04,wood);for(let y=.5;y<2.9;y+=.28)bar(scene,[-17.6,y,z],[-17.6,y,z+1.4],.03,wood)}
// Free-weight zone dressing — real Matrix barbell/rack/bench/dumbbell-rack
// scans, not clickable stations, just filling the zone out. Two columns
// (west wall, near the aisle) far enough from the 6 real stations' x
// positions (-13/-8) that no z-alignment check is needed — every item's
// measured footprint is under 2.2m, so 3.3m+ of x-separation alone clears
// them regardless of row. `flatten` gives them the same frame/dark
// material cleanup as the real equipment (loaded via equipment-models.js) —
// without it these render in their raw, inconsistent CAD-export colors
// (mostly flat white/grey), which is the "bland" look reported.
[['barbell1',-6.5],['barbell2',-3.9],['dumbbell_rack2',-1.3],['dumbbell_rack3',1.3],['barbell1',3.9],['barbell2',6.5],['bench2',9.1]]
	.forEach(([name,z])=>placeProp(scene,name,{x:-16.3,z,rotY:Math.PI/2,flatten:true}));
[['rack2',-6.5],['rack3',-3.9],['rack4',-1.3],['rack5',1.3],['bench3',3.9],['bench4',6.5],['bench5',9.1]]
	.forEach(([name,z])=>placeProp(scene,name,{x:-4.5,z,rotY:-Math.PI/2,flatten:true}));
textOnFloor('floorCardio',0,-12.5,1.8);textOnFloor('floorFree',-10.5,1.55,2.2);textOnFloor('floorStrength',10.5,1.55,2.2);textOnFloor('reception',5,16.4,1);textOnFloor('entrance',0,17.8,1.2);
}else{
const rubberFloor=surface(mat(currentFloor?'#46494b':'#535552',0,.92),'rubber');
box(scene,28.3,.55,24.3,0,-.35,0,mat('#8a948b'));box(scene,28,.1,24,0,-.045,0,rubberFloor);
if(currentFloor===0){box(scene,13.8,.025,23.8,-7,.02,0,wood);box(scene,13.8,.025,11.8,7,.02,6,surface(mat('#405248',0,.88),'rubber'))}else{box(scene,27.8,.025,3.5,0,.02,10.1,wood)}
wall(28.2,.2,0,-12);wall(.2,24,-14,0);wall(.2,24,14,0);wall(10,.2,-9,12);wall(10,.2,9,12);
if(currentFloor===0){wall(.2,5,0,-8);box(scene,3.2,1.05,1.1,-7,.525,10.1,wood);box(scene,.5,.32,.07,-7,1.25,10.1,dark);for(let i=0;i<5;i++){box(scene,.55,1.85,.65,-12+i*.65,.925,11.5,mat('#4b5d55'));box(scene,.025,.17,.05,-11.8+i*.65,1,11.15,silver)}textOnFloor('floorCardio',-7,-10.5,1.3);textOnFloor('floorFunctional',3,7.4,1.25);textOnFloor('reception',-7,11.3,.8)}else{wall(7,.2,-10,1);box(scene,8.5,1.8,.04,-8.5,1.9,-11.85,mat('#b7c5c8',.8,.18));textOnFloor('floorStrength',1,-10.7,1.25);textOnFloor('floorFree',-5,7.5,1.3)}
for(let x=-10;x<14;x+=6){box(scene,4.8,1.3,.025,x,2,-11.87,mat('#c0d0d6',.6,.15));box(scene,4.9,.05,.06,x,1.35,-11.83,silver)}
// A staircase landmark links the two separately inspectable storeys.
box(scene,2.1,.035,4,11.4,.06,9.5,dark);
for(let n=0;n<14;n++){const h=currentFloor===0?.14+n*.22:.07-n*.22;box(scene,1.5,.17,.29,11.4,h,7.6+n*.29,mat('#9b9f9f'));if(n%3===0){bar(scene,[10.55,h,7.6+n*.29],[10.55,h+.85,7.6+n*.29],.025,silver);bar(scene,[12.25,h,7.6+n*.29],[12.25,h+.85,7.6+n*.29],.025,silver)}}
if(currentFloor===0){bar(scene,[10.55,.99,7.6],[10.55,3.85,11.37],.04,silver);bar(scene,[12.25,.99,7.6],[12.25,3.85,11.37],.04,silver);box(scene,2.1,.18,.85,11.4,3.25,11.45,light)}else{bar(scene,[10.5,.95,7.6],[10.5,.95,11.5],.04,silver);bar(scene,[12.3,.95,7.6],[12.3,.95,11.5],.04,silver)}
textOnFloor('stairsLabel',10,6.8,.75);textOnFloor('entrance',0,10.5,.9);
}
const picks=[],groups=[],halos=[],ownedLabels=[];
await modelsReady;
equipment.forEach((e,i)=>{const g=loadedEquipment?loadedEquipment[i]:buildEquipment(e);g.position.set(e.x,.065,e.z);g.rotation.y=e.rotY||0;if(!loadedEquipment)g.scale.setScalar(1.08);scene.add(g);groups.push(g);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.8),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.0;float a=pow(max(0.0,1.0-dot(p,p)),2.0)*.23;gl_FragColor=vec4(0.,0.,0.,a);}'}));shadow.rotation.x=-Math.PI/2;shadow.position.set(e.x,.061,e.z);scene.add(shadow);
const hit=box(g,2.5,3,2.9,0,1.5,0,new THREE.MeshBasicMaterial({visible:false}));hit.userData.id=e.id;picks.push(hit);const halo=new THREE.Mesh(new THREE.RingGeometry(1.58,1.64,64),new THREE.MeshBasicMaterial({color:'#387d50',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.set(e.x,.085,e.z);scene.add(halo);halos.push(halo);
const label=document.createElement('button');label.className='map-label';label.innerHTML=`<b>${e.number}</b><span class="label-text">${machine(e).short}</span>`;label.setAttribute('aria-label',`${e.number}. ${machine(e).name}`);label.onclick=()=>choose(e.id);label.ondblclick=()=>focusOn(e.id);$('#labels').append(label);ownedLabels.push(label);e.label=label;});
let stairsLabel=null;if(gym.floors>1){stairsLabel=document.createElement('button');stairsLabel.className='map-label stairs-label';stairsLabel.textContent=t(currentFloor?'goDown':'goUp');stairsLabel.onclick=onStairs;$('#labels').append(stairsLabel)}
let selectedId=equipment[0].id;controls.addEventListener('change',()=>dirty=true);
// Double-click starts a slow "showcase" auto-orbit around the focused
// machine (see focusOn); OrbitControls fires 'start' the moment the user
// actually grabs the view themselves — drag, pinch, or scroll-to-zoom — so
// that's the one signal that reliably means "stop spinning, they're driving
// now" without us having to special-case every kind of gesture.
controls.addEventListener('start',()=>controls.autoRotate=false);
const route=new THREE.Group();scene.add(route);const routeMat=mat('#a0c96f');
// Route on aisle grid; machine footprints and columns are obstacles.
function findPath(a,b){return findGymPath(allEquipment,a,b,gym,currentFloor)}
let ceilingButton=null;if(reconstruction){ceilingButton=document.createElement('button');ceilingButton.style.fontSize='12px';ceilingButton.setAttribute('aria-pressed','false');ceilingButton.textContent=getLanguage()==='pl'?'Sufit':'Ceiling';ceilingButton.onclick=()=>{reconstruction.ceiling.visible=!reconstruction.ceiling.visible;ceilingButton.setAttribute('aria-pressed',String(reconstruction.ceiling.visible));dirty=true};$('.view-controls').append(ceilingButton)}
let activeIds=[];function drawRoute(ids){route.children.slice().forEach(o=>{route.remove(o);o.geometry?.dispose();if(o.userData.marker){o.material.map.dispose();o.material.dispose()}});ids.filter(id=>equipment.some(e=>e.id===id)).forEach(id=>{const index=ids.indexOf(id);const e=equipment.find(e=>e.id===id),c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#1a6847';ctx.beginPath();ctx.arc(48,48,43,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c9ed9e';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(index+1),48,50);const marker=new THREE.Mesh(new THREE.PlaneGeometry(.8,.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));marker.rotation.x=-Math.PI/2;const approach=approachPoint(e);marker.position.set(Math.round(approach.x*2)/2,.2,Math.round(approach.z*2)/2);marker.userData.marker=true;route.add(marker)});for(let i=1;i<ids.length;i++){const from=allEquipment.find(e=>e.id===ids[i-1]),to=allEquipment.find(e=>e.id===ids[i]);if(from.floor!==currentFloor&&to.floor!==currentFloor)continue;const points=findPath(from.floor===currentFloor?from:gym.stairs,to.floor===currentFloor?to:gym.stairs);for(let j=1;j<points.length;j++){bar(route,points[j-1],points[j],.045,routeMat);
// Arrows used to land every 7th 0.5m grid step (~3.5m apart) along a dense,
// zigzagging path. Now that the path is a handful of long smoothed
// segments, spacing by point INDEX would put an arrow on almost no
// segment at all — space by real distance instead, so each straight run
// still gets one or more evenly spaced chevrons regardless of how few
// points it's made of.
const a=new THREE.Vector3(...points[j-1]),b=new THREE.Vector3(...points[j]),segLen=a.distanceTo(b);
if(segLen<.05)continue;
const d=b.clone().sub(a).normalize(),p=new THREE.Vector3(-d.z,0,d.x),arrowCount=Math.max(1,Math.round(segLen/3.5));
for(let k=1;k<=arrowCount;k++){const pt=a.clone().lerp(b,k/(arrowCount+1));bar(route,pt.clone().addScaledVector(d,-.3).addScaledVector(p,.16).toArray(),pt.toArray(),.045,routeMat);bar(route,pt.clone().addScaledVector(d,-.3).addScaledVector(p,-.16).toArray(),pt.toArray(),.045,routeMat)}}}}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down,lastClick=null;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(picks);if(!hits.length)return;const id=hits[0].object.userData.id;choose(id);const now=performance.now();if(lastClick&&lastClick.id===id&&now-lastClick.time<400)focusOn(id);lastClick={id,time:now}});
function home(){controls.autoRotate=false;camera.position.set(42,46,54);if(gym.id==='atlas')camera.position.multiplyScalar(.84);if(gym.reconstruction)camera.position.multiplyScalar(1.2);if(container.clientWidth<600)camera.position.multiplyScalar(1.25);controls.target.set(0,0,1);$('#top-view').setAttribute('aria-pressed','false');$('#top-view').textContent=t('view2d');controls.update()}home();$('#home-view').onclick=home;
// Shared by the manual "Focus" button and the host app's postMessage-driven
// auto-focus (e.g. jumping straight to today's exercise on the machine).
// The standalone app flanks the 3D canvas with two side panels of slightly
// different widths, so aiming dead at the equipment leaves it looking
// off-centre in the space that's actually visible between them. Re-aim at a
// point offset from the equipment (translating camera + target together, so
// the viewing angle/distance don't change) by however many world units the
// panel gap's true centre sits from the canvas's own centre; the embed page
// has no such panels, so the lookup below simply finds nothing and no shift
// is applied.
function focusOn(id){
	const idx=equipment.findIndex(e=>e.id===id);if(idx<0)return;
	const e=equipment[idx];
	const offset=new THREE.Vector3(8.5,13.9,9.5).multiplyScalar(.6);
	// A fixed aim height reads fine for a tall rack but leaves a low machine
	// like a treadmill sitting in the bottom of the frame, since we're aiming
	// well above its actual body. Centre on this specific model's own real
	// bounding-box midpoint instead, so short and tall equipment alike land
	// vertically centred.
	const modelBox=new THREE.Box3().setFromObject(groups[idx]);
	const aimY=THREE.MathUtils.clamp((modelBox.min.y+modelBox.max.y)/2,.6,3);
	const target=new THREE.Vector3(e.x,aimY,e.z);
	const leftPanel=document.querySelector('.plan-panel'),rightPanel=document.querySelector('.detail-panel');
	if(leftPanel&&rightPanel){
		const containerRect=container.getBoundingClientRect();
		const freeCenterX=(leftPanel.getBoundingClientRect().right+rightPanel.getBoundingClientRect().left)/2;
		const pixelOffsetX=freeCenterX-(containerRect.left+containerRect.width/2);
		if(Math.abs(pixelOffsetX)>1&&containerRect.width>0){
			controls.target.copy(target);camera.position.copy(target).add(offset);camera.updateMatrixWorld();
			const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
			const visibleWidth=2*offset.length()*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect;
			target.addScaledVector(right,-pixelOffsetX*(visibleWidth/containerRect.width));
		}
	}
	controls.target.copy(target);camera.position.copy(target).add(offset);controls.update();
	$('#top-view').setAttribute('aria-pressed','false');$('#top-view').textContent=t('view2d');
	controls.autoRotate=true;controls.autoRotateSpeed=1.1;
}
$('#focus-equipment').onclick=()=>focusOn(selectedId);$('#rotate').onclick=()=>{controls.autoRotate=false;camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6).add(controls.target);controls.update()};function zoom(f){controls.autoRotate=false;const v=camera.position.clone().sub(controls.target);v.setLength(THREE.MathUtils.clamp(v.length()*f,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);controls.update()}$('#zoom-in').onclick=()=>zoom(.82);$('#zoom-out').onclick=()=>zoom(1.22);$('#top-view').onclick=()=>{controls.autoRotate=false;if($('#top-view').getAttribute('aria-pressed')==='true')home();else{camera.position.set(0,gym.reconstruction?105:container.clientWidth<550?90:70,1.01);controls.target.set(0,0,1);controls.update();$('#top-view').setAttribute('aria-pressed','true');$('#top-view').textContent=t('view3d')}};
const heldKeys=new Set();
on(window,'keydown',event=>{if(document.querySelector('dialog[open]')||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||isTypingTarget(event.target))return;if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code)){event.preventDefault();heldKeys.add(event.code)}if(event.code==='ShiftLeft'||event.code==='ShiftRight')heldKeys.add(event.code)});
on(window,'keyup',event=>heldKeys.delete(event.code));
on(window,'blur',()=>heldKeys.clear());on(document,'visibilitychange',()=>heldKeys.clear());on(document,'focusin',event=>{if(isTypingTarget(event.target))heldKeys.clear()});
let previousFrame=performance.now();const forward=new THREE.Vector3();
function moveKeyboard(now){const elapsed=(now-previousFrame)/1000;previousFrame=now;if(document.querySelector('dialog[open]')){heldKeys.clear();return}if(!heldKeys.size)return;camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<.00001){forward.set(0,1,0).applyQuaternion(camera.quaternion);forward.y=0}forward.normalize();const boost=heldKeys.has('ShiftLeft')||heldKeys.has('ShiftRight')?2:1;const speed=THREE.MathUtils.clamp(camera.position.distanceTo(controls.target)*.22,3,18)*boost;const move=cameraMovement(heldKeys,forward,elapsed,speed);const nx=THREE.MathUtils.clamp(controls.target.x+move.x,-23,23),nz=THREE.MathUtils.clamp(controls.target.z+move.z,-18,22.5);const dx=nx-controls.target.x,dz=nz-controls.target.z;if(dx||dz){controls.autoRotate=false;camera.position.x+=dx;camera.position.z+=dz;controls.target.x=nx;controls.target.z=nz;dirty=true}}
function resize(){dirty=true;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight)}const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();const vec=new THREE.Vector3();function animate(now=performance.now()){if(disposed)return;frameId=requestAnimationFrame(animate);moveKeyboard(now);controls.update();if(!dirty)return;dirty=false;equipment.forEach(e=>{vec.set(e.x,2.7,e.z).project(camera);e.label.style.left=`${(vec.x*.5+.5)*container.clientWidth}px`;e.label.style.top=`${(-vec.y*.5+.5)*container.clientHeight}px`;e.label.style.visibility=vec.z>1?'hidden':'visible'});if(stairsLabel){vec.set(10,3.8,9).project(camera);stairsLabel.style.left=`${(vec.x*.5+.5)*container.clientWidth}px`;stairsLabel.style.top=`${(-vec.y*.5+.5)*container.clientHeight}px`}renderer.render(scene,camera)}animate();
return{dispose(){reconstructionAssets?.dispose();ceilingButton?.remove();disposed=true;cancelAnimationFrame(frameId);lifecycle.abort();resizeObserver.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];materials.forEach(m=>{m.map?.dispose();m.dispose()})});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();ownedLabels.forEach(label=>label.remove());stairsLabel?.remove()},update(selected,ids,done,showRoute=true){selectedId=equipment.some(e=>e.id===selected)?selected:equipment[0].id;dirty=true;equipment.forEach((e,i)=>{halos[i].visible=e.id===selected;e.label.classList.toggle('selected',e.id===selected);e.label.classList.toggle('in-route',ids.includes(e.id));e.label.classList.toggle('done',done.includes(e.id));e.label.setAttribute('aria-pressed',String(e.id===selected));e.label.querySelector('b').textContent=done.includes(e.id)?'✓':e.number;e.label.querySelector('.label-text').textContent=machine(e).short;e.label.setAttribute('aria-label',`${e.number}. ${machine(e).name}`);e.label.title=`${machine(e).name}${ids.includes(e.id)?' · '+t('step',{n:ids.indexOf(e.id)+1}):''}`});const routeIds=showRoute?ids:[];if(routeIds.join()!==activeIds.join()){activeIds=[...routeIds];drawRoute(routeIds)}},language(){dirty=true;reconstruction?.language();if(ceilingButton)ceilingButton.textContent=getLanguage()==='pl'?'Sufit':'Ceiling';if(stairsLabel)stairsLabel.textContent=t(currentFloor?'goDown':'goUp');floorLabels.forEach(({key,canvas,ctx,mesh})=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillText(t(key),384,77);mesh.material.map.needsUpdate=true})},theme(value){dirty=true;const bg=value==='dark'?'#0c1012':'#e6e9e7';scene.background.set(bg);renderer.setClearColor(bg);routeMat.color.set(value==='dark'?'#b9ec68':'#528947')},focus(id){focusOn(id)}};
}
