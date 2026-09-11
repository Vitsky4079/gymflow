import * as T from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {loadKettlebellCluster,loadMatsSpread} from './decor-models.js';

// Real Matrix-brand GLB models, keyed by equipment id — swapped in over the
// procedural placeholder once loaded (see buildEquipment at the bottom).
// Ids with no entry here (trx — Matrix doesn't manufacture suspension
// trainers) simply keep the procedural geometry forever. mats/kettlebell
// aren't Matrix machines either, but real scanned models for those do exist
// (see decor-models.js) — PROP_LOADERS below handles those two separately
// since they're not single-GLB swaps (kettlebell composites three weights).
const MODEL_MAP={treadmill:'treadmill',legpress:'legpress',legpress2:'legpress',chest:'chest',lat:'lat',row:'row',shoulder:'shoulder',legcurl:'legcurl',legextension:'legextension',cable:'cable',pullup:'pullup',bench:'bench',rack:'rack',bike:'bike',elliptical:'elliptical',rower:'rower',stairs:'stairs',airbike:'airbike',pecdeck:'pecdeck',reverse:'reverse',abductor:'abductor',adductor:'adductor',calf:'calf',smith:'smith',hipthrust:'hipthrust',dumbbells:'dumbbells',incline:'incline',dips:'dips',abcrunch:'abcrunch',armcurl:'armcurl'};

let loaderPromise=null;
function getLoader(){
	if(!loaderPromise)loaderPromise=Promise.all([import('three/addons/GLTFLoader.js'),import('three/addons/meshopt_decoder.module.js')]).then(([{GLTFLoader},{MeshoptDecoder}])=>{const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);return loader});
	return loaderPromise;
}

// Each Matrix product line (Aura, Ultra, Versa, Magnum, G1...) authors its
// own materials with different accent colors AND different naming schemes —
// some name parts clearly ("seat black", "Paint_GrayG3", "chrome"), others
// leave them as meaningless CAD export names ("Material #132"). Rather than
// trust per-line color/texture data (inconsistent, sometimes tinted olive or
// navy), classify every material by name into exactly two flat looks: the
// tubular frame stays light, everything else — seat, shroud, weight stack,
// hardware, unnamed parts alike — goes to the same neutral dark. This throws
// away the original textures entirely, but gives one consistent showroom
// finish regardless of which line a given machine came from.
// "chrome"/"metal"/"steel"/"alumin" are deliberately NOT in this list: they
// show up just as often on small chrome-plated hardware (dumbbell handles,
// guide rods) as on the actual frame, and the latter is far more common —
// only the paint/coating call-outs reliably mean "this is the frame".
const FRAME_KEYWORDS=['paint','frame','coating','wht','white'];
function isFrameMaterial(name){
	const n=(name||'').toLowerCase();
	return FRAME_KEYWORDS.some(k=>n.includes(k));
}
// Several product lines keep a genuinely separate "Plastic_yellow" material for
// the pin/knob hardware (weight-stack selector pins, adjustment knobs) — Matrix
// paints those safety yellow on the real machines, so keep that accent instead
// of collapsing it into the dark bucket with everything else.
function isYellowMaterial(name){
	return (name||'').toLowerCase().includes('yellow');
}
function flattenMaterial(m){
	if(!m)return;
	const frame=isFrameMaterial(m.name);
	const yellow=!frame&&isYellowMaterial(m.name);
	m.map?.dispose();m.map=null;
	m.emissiveMap?.dispose();m.emissiveMap=null;
	m.metalnessMap?.dispose();m.metalnessMap=null;
	m.roughnessMap?.dispose();m.roughnessMap=null;
	m.color?.set(frame?'#a7abaf':yellow?'#b8860c':'#17191a');
	if('metalness' in m)m.metalness=frame?.65:yellow?.3:.05;
	if('roughness' in m)m.roughness=frame?.3:yellow?.4:.6;
	m.needsUpdate=true;
}

// Real models are exported at wildly different native scales/pivots; fit
// each one into roughly the footprint our procedural machines occupy and
// drop it onto the floor instead of hand-tuning 27 individual transforms.
// Scaling off the LARGER of width/depth crushes anything wide-but-shallow
// (a cable crossover spanning two towers is wide in one axis only) down to
// the same tiny footprint as a compact seated machine; average the two
// instead so an elongated station keeps looking elongated.
// The cable crossover's bounding box spans both towers plus the open gap
// between them, so its footprint average is dominated by that gap rather
// than the towers' actual size — footprint-based scaling shrinks the whole
// rig well below neighboring upright machines. Scale it off height instead,
// to the same effective height a typical tower (e.g. the lat pulldown) ends
// up at under the footprint formula below, so it reads as tall as its
// neighbors instead of squat.
const HEIGHT_TARGETS={cable:2.9};
function normalizeModel(object,id){
	object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(flattenMaterial)}});
	const box=new T.Box3().setFromObject(object);const size=new T.Vector3();box.getSize(size);
	const heightTarget=HEIGHT_TARGETS[id];
	const scale=heightTarget?heightTarget/Math.max(size.y,.1):1.7/Math.max((size.x+size.z)/2,.1);
	object.scale.setScalar(scale);
	const box2=new T.Box3().setFromObject(object);
	object.position.x-=(box2.min.x+box2.max.x)/2;
	object.position.z-=(box2.min.z+box2.max.z)/2;
	object.position.y-=box2.min.y;
}

const modelCache=new Map();
function loadModel(id){
	if(!modelCache.has(id))modelCache.set(id,getLoader().then(loader=>new Promise((resolve,reject)=>loader.load(`./models/${id}.glb`,gltf=>{normalizeModel(gltf.scene,id);resolve(gltf.scene)},undefined,reject))));
	return modelCache.get(id);
}
const material=(color,metalness=0,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
const steel=material('#4c5052',.72,.3),black=material('#171a1c',.25,.45),chrome=material('#c7cbcd',.95,.2),vinyl=material('#242728',.05,.68),edge=material('#373b3e',.1,.65),yellow=material('#d5bb42',.3,.4),belt=material('#141617',0,.94),screen=material('#11272c',.1,.25),cable=material('#080909',.1,.5);
const geoCache=new Map();function cached(key,fn){if(!geoCache.has(key))geoCache.set(key,fn());return geoCache.get(key)}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o}
function box(g,w,h,d,x,y,z,m=steel,r=.025){return mesh(g,cached(['b',w,h,d,r].join(),()=>new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3))),m,x,y,z)}
function cyl(g,r,h,x,y,z,m=chrome){return mesh(g,cached(['c',r,h].join(),()=>new T.CylinderGeometry(r,r,h,20)),m,x,y,z)}
function tube(g,points,r=.045,m=steel){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(g,new T.TubeGeometry(path,Math.max(8,points.length*6),r,8,false),m)}
function beam(g,a,b,r=.045,m=steel){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cyl(g,r,v.length(),...(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray()),m);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o}
function shaft(g,r,h,x,y,z,m=chrome){const o=cyl(g,r,h,x,y,z,m);o.rotation.z=Math.PI/2;return o}
function bolt(g,x,y,z){shaft(g,.037,.023,x,y,z,chrome)}
function foot(g,x,z){box(g,.28,.1,.36,x,.065,z,black,.04);box(g,.11,.14,.16,x,.15,z,steel)}
function pad(g,w,h,d,x,y,z,rot=0){const backing=box(g,w+.025,h+.025,d+.025,x,y-.015,z,black,.055);const o=box(g,w,h,d,x,y,z,vinyl,.055);o.rotation.x=rot;backing.rotation.x=rot;return o}
function plate(g,x,y,z,r=.32){shaft(g,r,.12,x,y,z,black);shaft(g,r*.78,.133,x,y,z,edge);shaft(g,.06,.145,x,y,z,chrome);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;shaft(g,.048,.15,x,y+Math.sin(a)*r*.51,z+Math.cos(a)*r*.51,black)}}
function pulley(g,x,y,z){shaft(g,.115,.055,x,y,z,black);shaft(g,.077,.07,x,y,z,steel);bolt(g,x+.04,y,z)}
function grip(g,a,b){beam(g,a,b,.035,black);}
function base(g){[-.57,.57].forEach(x=>{tube(g,[[x,.13,.85],[x,.15,-.6],[x*.6,.25,-1.05]],.065);foot(g,x,.85);foot(g,x,-.7)})}
function stack(g,x=0,z=-.85){box(g,.72,1.92,.38,x,1.1,z,black,.1);box(g,.61,1.57,.03,x,1.02,z+.205,edge,.015);for(let k=0;k<13;k++){box(g,.49,.087,.31,x,.31+k*.105,z+.04,black,.018);shaft(g,.015,.023,x,.35+k*.105,z+.218,chrome)}[-.18,.18].forEach(dx=>beam(g,[x+dx,.2,z],[x+dx,2.1,z],.018,chrome));box(g,.65,.09,.4,x,1.75,z,steel);cyl(g,.045,.065,x+.12,.79,z+.23,yellow).rotation.x=Math.PI/2;[-.43,.43].forEach(dx=>tube(g,[[x+dx,.12,z+.1],[x+dx,1.95,z],[x+dx*.8,2.16,z]],.052));pulley(g,x,2.13,z);beam(g,[x,1.75,z],[x,2.12,z],.009,cable);box(g,.23,.29,.014,x,1.5,z+.225,chrome,.005);for(let i=0;i<5;i++)box(g,.16,.008,.009,x,1.57-i*.035,z+.235,black,.001)}
function chair(g){base(g);beam(g,[0,.17,.35],[0,.65,.35],.065,chrome);box(g,.19,.3,.18,0,.42,.35,steel);pad(g,.57,.13,.65,0,.7,.36);pad(g,.57,.95,.13,0,1.21,-.05,-.12);beam(g,[0,.2,-.45],[0,1.5,-.18],.055);shaft(g,.045,.12,.15,.45,.35,yellow)}
function consolePanel(g,x,y,z){const p=new T.Group();p.position.set(x,y,z);p.rotation.x=-.35;g.add(p);box(p,.74,.4,.13,0,0,0,black,.075);box(p,.42,.23,.012,0,.035,.075,screen,.01);for(let i=0;i<3;i++)box(p,.085,.013,.005,-.12+i*.12,.07,.083,chrome,.001);[-.2,-.08,.08,.2].forEach((x,i)=>{const m=i===1?yellow:edge;const b=cyl(p,.025,.015,x,-.135,.078,m);b.rotation.x=Math.PI/2});return p}
function bench(g,incline=false){[-.7,.7].forEach(z=>{beam(g,[-.48,.12,z],[.48,.12,z],.06);foot(g,-.48,z);foot(g,.48,z);beam(g,[0,.12,z],[0,.5,z],.065)});beam(g,[0,.4,-.9],[0,.4,.9],.07);pad(g,.55,.14,1.25,0,incline?.9:.62,-.3,incline?-.55:0);pad(g,.55,.14,.5,0,.62,.65);if(incline){beam(g,[0,.35,.3],[0,1.06,-.55],.055,chrome);shaft(g,.055,.18,.1,.45,0,yellow)}[-.4,.4].forEach(x=>shaft(g,.085,.08,x,.14,-.85,black));beam(g,[0,.4,.85],[0,.4,1.07],.035,black)}
function rack(g,kind){[-.85,.85].forEach(x=>{for(const z of [-.6,.6]){box(g,.105,2.62,.105,x,1.37,z,steel,.01);foot(g,x,z);for(let k=0;k<13;k++)box(g,.029,.029,.014,x,.45+k*.14,z+.059,black,.003)}beam(g,[x,.13,-.9],[x,.13,.9],.065);beam(g,[x,.8,-.6],[x,.8,.65],.043);[-.4,.2].forEach(z=>bolt(g,x+.07,.8,z))});beam(g,[-.85,2.66,-.6],[.85,2.66,-.6],.06);tube(g,[[-1,2.55,.65],[-.7,2.7,.5],[.7,2.7,.5],[1,2.55,.65]],.035,black);if(kind==='rack'||kind==='smith'){beam(g,[-1.38,1.48,.25],[1.38,1.48,.25],.027,chrome);[-1.17,-1.02,1.02,1.17].forEach(x=>plate(g,x,1.48,.25,.32));[-.85,.85].forEach(x=>box(g,.13,.12,.25,x,1.41,.23,black));if(kind==='smith')[-.73,.73].forEach(x=>{beam(g,[x,.18,.25],[x,2.6,.25],.025,chrome);cyl(g,.055,.3,x,1.48,.25,steel)})}if(kind==='trx')[-.32,.32].forEach(x=>{beam(g,[x,2.6,.5],[x,1.04,1],.018,yellow);tube(g,[[x,1.04,1],[x-.12,.82,1],[x+.12,.82,1],[x,1.04,1]],.018,black)})}
function cardio(g,e){if(e.kind==='treadmill'){box(g,1.2,.22,2.55,0,.2,0,black,.12);box(g,.88,.025,2.07,0,.33,.1,belt,.01);[-.53,.53].forEach(x=>{box(g,.14,.035,2.08,x,.35,.12,edge);tube(g,[[x,.25,-.93],[x,1.15,-1.2],[x,1.54,-1.04]],.065,steel);tube(g,[[x,1.35,-1.1],[x,1.3,-.55],[x,1.15,-.3]],.04,black);foot(g,x,1)});box(g,1.1,.24,.4,0,.4,-1,edge,.1);consolePanel(g,0,1.53,-.99);for(let i=0;i<24;i++)box(g,.87,.003,.008,0,.345,-.87+i*.077,edge,.001);return}
if(e.kind==='stairs'){box(g,1.17,1.12,1.3,0,.7,-.35,edge,.1);for(let k=0;k<5;k++){box(g,1.1,.12,.34,0,.18+k*.22,.85-k*.32,belt,.01);for(let x=-.45;x<=.45;x+=.09)box(g,.01,.009,.27,x,.246+k*.22,.85-k*.32,steel,.001)}[-.62,.62].forEach(x=>tube(g,[[x,.16,1],[x,.9,.7],[x,2.0,-.65],[x,2,-.95]],.045));consolePanel(g,0,2.07,-.75);return}
if(e.kind==='rower'){beam(g,[0,.32,-1.2],[0,.32,1.65],.065,chrome);pad(g,.43,.15,.45,0,.48,.75);const fan=shaft(g,.4,.28,0,.63,-1,black);for(let i=0;i<16;i++){const a=i*Math.PI/8;beam(g,[.15,.63,-1],[.15,.63+Math.sin(a)*.35,-1+Math.cos(a)*.35],.008,steel)}beam(g,[0,.62,-.75],[0,.7,-.25],.009,cable);grip(g,[-.28,.7,-.25],[.28,.7,-.25]);[-.32,.32].forEach(x=>{box(g,.24,.05,.45,x,.38,-.1,black);box(g,.24,.04,.08,x,.47,-.1,edge);foot(g,x,-1);foot(g,x,1.5)});consolePanel(g,0,1.15,-.92);return}
base(g);const elliptical=e.kind==='elliptical';const fw=shaft(g,.36,.3,0,.48,-.3,edge);shaft(g,.21,.31,0,.48,-.3,black);tube(g,[[0,.2,.8],[0,.65,.05],[0,1.38,-.73]],.075);beam(g,[0,.25,.5],[0,1,.5],.038,chrome);pad(g,.36,.1,.5,0,1.03,.5);tube(g,[[-.35,1.3,-.5],[-.4,1.48,-.8],[.4,1.48,-.8],[.35,1.3,-.5]],.035,black);consolePanel(g,0,1.48,-.85);[-.44,.44].forEach((x,i)=>{const z=i? .38:-.28;beam(g,[x,.48,0],[x,.22,z],.026,chrome);box(g,.22,.04,elliptical?.85:.28,x,.21,z,black);if(elliptical)tube(g,[[x,.22,z],[x,1,-.45],[x,1.75,-.7]],.035,black)})}
function dumbbell(g,x,y,z,r=.14){beam(g,[x,y,z-.2],[x,y,z+.2],.025,chrome);[-.16,.16].forEach(d=>{const a=cyl(g,r,.13,x,y,z+d,black);a.rotation.x=Math.PI/2;const b=cyl(g,r*.7,.14,x,y,z+d,edge);b.rotation.x=Math.PI/2})}
function buildProceduralEquipment(e){const g=new T.Group();g.name=e.id;
if(['treadmill','bike','elliptical','rower','stairs'].includes(e.kind))cardio(g,e);
else if(['rack','smith','pullup','trx'].includes(e.kind))rack(g,e.kind);
else if(e.kind==='bench')bench(g,e.id==='incline');
else if(e.kind==='dumbbells'){[-1.05,1.05].forEach(x=>{tube(g,[[x,.1,.35],[x,.85,0],[x,1.25,-.2]],.065);foot(g,x,.35);foot(g,x,-.25)});for(let j=0;j<3;j++){const y=.42+j*.36,z=.3-j*.23;box(g,2.65,.065,.42,0,y,z,steel);for(let k=0;k<7;k++)dumbbell(g,-1.12+k*.37,y+.16,z,.1+k*.009)}}
else if(e.kind==='mats'){[-.65,.65].forEach(x=>{box(g,.9,.025,2.05,x,.035,0,material('#657365'),.012);for(let j=0;j<20;j++)box(g,.88,.003,.008,x,.05,-.95+j*.1,edge,.001);cyl(g,.12,.5,x,.14,-1.25,vinyl).rotation.z=Math.PI/2})}
else if(e.kind==='kettlebell'){box(g,2.3,.11,1.1,0,.1,0,black);for(let i=0;i<6;i++){const x=(i%3-1)*.7,z=i<3?-.28:.28,r=.18+(i%3)*.02;mesh(g,new T.SphereGeometry(r,20,16),black,x,r+.17,z);const h=mesh(g,new T.TorusGeometry(.12,.025,8,20),steel,x,r*2+.22,z);}}
else if(e.kind==='dips'){[-.55,.55].forEach(x=>{tube(g,[[x,.12,-.65],[x,1.5,-.6],[x,1.6,.8]],.055);grip(g,[x,1.6,.3],[x,1.6,.8]);foot(g,x,-.7);foot(g,x,.7);beam(g,[x,.15,-.7],[x,.15,.7],.07)});beam(g,[-.55,.8,-.6],[.55,.8,-.6],.05)}
else if(e.kind==='cable'){[-1.05,1.05].forEach(x=>{stack(g,x,-.45);beam(g,[x,.2,-.06],[x,2.25,-.06],.025,chrome);box(g,.15,.25,.15,x,1.1,-.06,steel);pulley(g,x,1.15,.04);tube(g,[[x,2.13,-.45],[x,2.18,-.06],[x,1.13,.06],[x,1,.5]],.009,cable);grip(g,[x-.14,1,.5],[x+.14,1,.5]);foot(g,x,.6)});tube(g,[[-1.05,2.2,-.45],[-.95,2.5,-.45],[.95,2.5,-.45],[1.05,2.2,-.45]],.06);grip(g,[-.65,2.5,-.45],[.65,2.5,-.45])}
else if(e.kind==='legpress'){[-.62,.62].forEach(x=>{beam(g,[x,.13,1.1],[x,.13,-1.25],.075);beam(g,[x,.22,.95],[x,1.85,-1.1],.044,chrome);beam(g,[x,.16,-1.2],[x,1.85,-1.1],.07);foot(g,x,1.1);foot(g,x,-1.2);bolt(g,x+.07,1.6,-.85)});pad(g,.6,.14,.75,0,.52,.4);pad(g,.6,.14,1,0,.76,1,-.65);const platform=box(g,1.22,.12,.83,0,1.4,-.65,black);platform.rotation.x=-.7;for(let k=0;k<10;k++){const rib=box(g,1.16,.02,.017,0,1.47+k*.047,-.96+k*.059,steel);rib.rotation.x=-.7}beam(g,[-1.2,1.28,-.48],[1.2,1.28,-.48],.03,chrome);[-1.03,-.89,.89,1.03].forEach(x=>plate(g,x,1.28,-.48,.36));[-.4,.4].forEach(x=>grip(g,[x,.48,.5],[x,.48,.85]))}
else if(e.kind==='hipthrust'){base(g);pad(g,1.05,.2,.45,0,.69,-.7);beam(g,[-.7,.14,-.7],[.7,.14,-.7],.06);[-.65,.65].forEach(x=>{beam(g,[x,.15,-.7],[x,.7,-.7],.06);beam(g,[x,.7,-.7],[x,.6,.6],.065);plate(g,x*1.6,.6,.2,.33)});pad(g,.65,.18,.3,0,.65,.38);box(g,1.2,.12,.85,0,.17,1,black)}
else {chair(g);stack(g);if(e.kind==='lat'){tube(g,[[0,2,-.85],[0,2.52,-.6],[0,2.6,.35]],.065);pulley(g,0,2.58,.35);beam(g,[0,2.58,.35],[0,2.15,.35],.009,cable);tube(g,[[-1,1.98,.35],[-.65,2.15,.35],[.65,2.15,.35],[1,1.98,.35]],.025,chrome);[-.72,.72].forEach(x=>grip(g,[x,2.1,.35],[x*1.32,1.99,.35]));shaft(g,.105,.95,0,.88,.19,vinyl)}
else if(e.kind==='chest'||e.kind==='shoulder'||e.kind==='pecdeck'){[-1,1].forEach(s=>{const a=e.kind==='shoulder'?[[s*.3,1.85,-.6],[s*.73,2.14,-.1],[s*.73,1.7,.45]]:e.kind==='pecdeck'?[[s*.25,1.97,-.6],[s*.9,1.9,.1],[s*.95,1.22,.45]]:[[s*.3,1.85,-.6],[s*.82,1.6,.04],[s*.8,1.17,.65]];tube(g,a,.055);const end=a[a.length-1];grip(g,end,[end[0]-s*.25,end[1],end[2]+.12]);pulley(g,s*.3,1.83,-.6);bolt(g,s*.35,1.83,-.6);beam(g,[s*.3,1.83,-.6],[0,2.13,-.85],.009,cable)})}
else if(e.kind==='row'){pad(g,.4,.5,.14,0,1.12,.13,-.2);[-.5,.5].forEach(x=>{tube(g,[[x,1.45,-.7],[x,.98,-.1],[x,1.05,.68]],.052);grip(g,[x,1.05,.68],[x,1.32,.68]);pulley(g,x,1.45,-.7);const f=box(g,.25,.04,.45,x,.18,1.1,black);f.rotation.x=-.4})}
else if(e.kind==='abductor'){[-.4,.4].forEach(x=>{beam(g,[x*.5,.45,.1],[x,.48,.8],.055);pad(g,.17,.4,.35,x,.77,.7);box(g,.25,.055,.4,x,.25,1,black);pulley(g,x*.5,.45,.1)})}
else if(e.kind==='calf'){pad(g,.85,.16,.35,0,1.04,.65);beam(g,[0,.25,-.2],[0,.88,.8],.06);box(g,.85,.16,.35,0,.13,1.05,black);shaft(g,.055,.2,.14,.7,.5,yellow)}
else {const curl=e.kind==='legcurl';shaft(g,.11,.9,0,curl?1:.31,1.02,vinyl);[-.45,.45].forEach(x=>{beam(g,[x,.63,.37],[x,curl?1:.31,1.02],.046);pulley(g,x,.64,.38);shaft(g,.047,.08,x+.06,.64,.38,yellow)});if(curl)shaft(g,.1,.85,0,.78,.66,vinyl)}}
// Bolts, adjustment pins and rubber feet remain true geometry when zooming in.
if(!['mats','kettlebell','dumbbells'].includes(e.kind)){[-.57,.57].forEach(x=>{bolt(g,x,.19,.72);bolt(g,x,.19,-.6)});box(g,.13,.025,.07,.1,.18,.4,yellow,.008)}
// Batch each material into a single mesh per station to keep mobile draw calls low.
g.updateMatrixWorld(true);const buckets=new Map();g.traverse(o=>{if(o.isMesh){let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}const arr=buckets.get(o.material)||[];arr.push(geo);buckets.set(o.material,arr)}});const result=new T.Group();result.name=e.id;for(const [m,geos]of buckets){const merged=mergeGeometries(geos,false);if(merged){mesh(result,merged,m)}geos.forEach(geo=>geo.dispose())}return result;
}

// The scene needs *something* on screen the instant it loads, so every
// station starts as the (instant, no network) procedural placeholder above;
// if a real Matrix model exists for this id, swap it in once it's ready.
// The placeholder lives in its own child group so map.js's own additions to
// the returned group (hit-boxes, halos are added to `equipment`, not here —
// but callers are still free to add children) are never touched by the swap.
const PROP_LOADERS={kettlebell:loadKettlebellCluster,mats:loadMatsSpread};
export function buildEquipment(e){
	const holder=new T.Group();holder.name=e.id;
	const placeholder=buildProceduralEquipment(e);
	holder.add(placeholder);
	const swap=scene=>{holder.remove(placeholder);placeholder.traverse(o=>{if(o.isMesh){o.geometry.dispose()}});holder.add(scene)};
	if(MODEL_MAP[e.id]){
		loadModel(MODEL_MAP[e.id]).then(scene=>swap(scene.clone(true))).catch(()=>{/* keep the procedural placeholder */});
	}else if(PROP_LOADERS[e.id]){
		PROP_LOADERS[e.id]().then(swap).catch(()=>{/* keep the procedural placeholder */});
	}
	return holder;
}
