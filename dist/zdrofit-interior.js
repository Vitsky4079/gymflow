import * as T from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { getLanguage } from './i18n.js';

// New-room details inferred from the referenced photos. No old-room geometry
// or material is altered. Architectural dimensions are intentionally approximate.
export async function buildZdrofitInterior(scene,assets) {
  const root=new T.Group();root.name='Zdrofit Nieborowska interior';scene.add(root);
  const ceiling=new T.Group();ceiling.name='Exposed services';ceiling.visible=false;root.add(ceiling);
  const materials=new Map();
  const mat=(color,metalness=0,roughness=.65)=>{
    const key=[color,metalness,roughness].join();
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness,roughness}));
    return materials.get(key);
  };
  const dark=mat('#24292e'),wall=mat('#b7b9b8'),steel=mat('#9da5ab',.7,.29),orange=mat('#d77718'),wood=mat('#c4aa83'),white=mat('#e1e5e7');
  const glow=new T.MeshStandardMaterial({color:'#eefaff',emissive:'#d8edff',emissiveIntensity:2});
  const blueGlow=new T.MeshStandardMaterial({color:'#adc5ff',emissive:'#5989ff',emissiveIntensity:2});
  const geo=new Map();
  function box(w,h,d,x,y,z,m=wall,parent=root,r=0){
    const key=[w,h,d,r].join();if(!geo.has(key))geo.set(key,r?new RoundedBoxGeometry(w,h,d,2,r):new T.BoxGeometry(w,h,d));
    const mesh=new T.Mesh(geo.get(key),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function beam(a,b,r=.04,m=steel,parent=root){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
    const mesh=new T.Mesh(new T.CylinderGeometry(r,r,direction.length(),12),m);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const localized=[];
  function text(pl,en,x,y,z,w,h,rotation=0,floor=false,color='#e8eff1',background='#283038'){
    const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const m=new T.MeshBasicMaterial({map:texture,transparent:background==='transparent',side:T.DoubleSide});
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.y=rotation;if(floor)mesh.rotation.x=-Math.PI/2;root.add(mesh);
    const draw=()=>{ctx.clearRect(0,0,c.width,c.height);if(background!=='transparent'){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height)}ctx.fillStyle=color;ctx.font=`700 ${Math.min(c.height*.53,90)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(getLanguage()==='pl'?pl:en,c.width/2,c.height/2,c.width*.92);texture.needsUpdate=true};
    draw();localized.push(draw);return mesh;
  }
  // A roofless 40 x 25 m envelope matches the published 1,000 m² area.
  box(40.4,.4,25.4,0,-.25,0,mat('#555d62'));
  box(40,.08,25,0,-.02,0,mat('#74777a',.12,.48));
  box(40,.05,.2,0,.04,-12.4,dark);box(.2,.05,25,-19.9,.04,0,dark);
  box(40,.05,.2,0,.04,12.4,dark);box(.2,.05,25,19.9,.04,0,dark);
  box(40,3.25,.18,0,1.63,-12.5);box(.18,3.25,25,-20,1.63,0);
  // Near wall cutaway keeps the gym readable from its normal overview.
  box(.18,1.05,25,20,.525,0);
  // Window frontage: same facade serves reception and the cardio row.
  const glass=new T.MeshPhysicalMaterial({color:'#96adbb',metalness:.08,roughness:.16,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});
  for(let x=-19;x<20;x+=2.5){box(2.35,2.75,.025,x,1.7,12.48,glass);box(.065,3.35,.09,x-1.2,1.67,12.45,dark);box(2.5,.065,.09,x,2.75,12.43,steel)}
  // Mirrors use reflective PBR, avoiding costly recursive render targets.
  const mirror=mat('#c4d1d5',.96,.12);
  function mirrored(w,x,z,rot=0){const group=new T.Group();group.position.set(x,0,z);group.rotation.y=rot;root.add(group);box(w,2,.035,0,1.6,0,mirror,group);box(w,.027,.04,0,2.62,.025,glow,group);box(w,.025,.04,0,.57,.025,glow,group);for(let a=-w/2;a<=w/2;a+=2)box(.012,2,.04,a,1.6,.015,steel,group)}
  mirrored(15.4,-12,-12.36);mirrored(11,-19.87,-6.7,Math.PI/2);
  // Photo-matched rubber square tiles, with small deterministic shade variation.
  for(let x=-19.5;x<-4;x++)for(let z=-11.9;z<2.6;z++)box(.99,.022,.99,x,.038,z,mat(['#3e4245','#424649','#46494b'][(Math.round(x*2+z*4)+200)%3]));
  // Fitness studio (rear right), double-door opening towards the hall.
  box(.18,3.25,9.5,8.5,1.63,-7.75);box(4,3.25,.18,10.5,1.63,-3);box(4,3.25,.18,18,1.63,-3);
  box(3.5,.4,.18,14.25,3.05,-3,wall);
  [12.6,15.9].forEach(x=>box(.07,2.85,.09,x,1.43,-3,steel));
  [13.35,15.1].forEach(x=>{const door=box(1.45,2.75,.035,x,1.38,-3,glass);door.rotation.y=x<14?.12:-.12;beam([x,.95,-2.94],[x,1.32,-2.94],.018)});
  for(let x=8.75;x<20;x+=.25)for(let z=-12;z<-3;z+=1.5)box(.247,.023,1.49,x,.04,z+.65,mat(['#b99c6f','#c3aa7e','#cab58e','#bca17a'][(Math.round(x*4+z*2)+200)%4]));
  mirrored(10.6,14.2,-12.34);mirrored(8.6,19.84,-7.8,-Math.PI/2);
  text('SALA FITNESS','FITNESS STUDIO',14.2,3,-2.88,6,.45);
  text('TRENUJ Z SERCEM','TRAIN WITH HEART',-12,2.98,-12.36,10,.43);
  text('ZDROFIT','ZDROFIT',-19.84,2.95,-5,6,.48,Math.PI/2);
  text('WOLNE CIĘŻARY','FREE WEIGHTS',-12,.08,1.8,7,.9,0,true,'#c7c9ca','transparent');
  text('STREFA MASZYN','STRENGTH',2,.07,3.65,6,.8,0,true,'#d6dbdd','transparent');
  text('CARDIO','CARDIO',7,.065,7.2,5,.7,0,true,'#d6dbdd','transparent');
  // Narrow green functional lane and graduated markings.
  box(10.5,.028,4,14.3,.05,0,mat('#527638'));
  for(let x=9.5;x<19.5;x++){box(.035,.008,3.6,x,.07,0,mat('#d8e3b3'));text(String(Math.round(x-8.5)),String(Math.round(x-8.5)),x,.081,1.25,.35,.35,0,true,'#edf3d4','transparent')}
  text('FUNKCJONALNA','FUNCTIONAL',13.4,.081,-1.2,6,.65,0,true,'#e1e8ce','transparent');
  // Structural column grid and overhead services seen throughout the photos.
  for(const x of [-6,6])for(const z of [-4,4]){box(.52,3.8,.52,x,1.9,z,dark);box(.65,.08,.65,x,.06,z,steel);text('ZDROFIT','ZDROFIT',x,2.65,z+.268,.46,.17);box(.17,.32,.13,x+.32,1.08,z,mat('#b72625'),root,.03)}
  for(const x of [-13,-1,11]){
    beam([x,3.8,-12],[x,3.8,12],.16,steel,ceiling);
    for(let z=-11;z<12;z+=.65){const ring=new T.Mesh(new T.TorusGeometry(.164,.012,5,16),steel);ring.position.set(x,3.8,z);ceiling.add(ring)}
    for(let z=-10;z<12;z+=5){box(2.6,.075,.13,x+1.5,3.45,z,dark,ceiling);box(2.5,.028,.1,x+1.5,3.407,z,glow,ceiling);for(const dx of [.4,2.6])beam([x+dx,3.48,z],[x+dx,3.95,z],.007,steel,ceiling)}
  }
  for(const z of [-8,2,10]){box(39,.25,.45,0,3.9,z,steel,ceiling);beam([-19,3.85,z+.8],[19,3.85,z+.8],.075,orange,ceiling)}
  for(const x of [-12,1,14])for(const z of [-7,5]){box(.95,.16,.95,x,3.52,z,white,ceiling);box(.7,.025,.7,x,3.42,z,steel,ceiling);for(let i=-3;i<=3;i++)box(.8,.02,.022,x,3.4,z+i*.1,dark,ceiling)}
  // Reception is based on the supplied desk; its added facade matches current photos.
  const jobs=[];
  function prop(key,x,z,options={},rotY=0){jobs.push(assets.instance(key,options).then(g=>{g.position.set(x,.065,z);g.rotation.y=rotY;root.add(g);return g}));}
  prop('reception',-6.8,9,{height:1.12},Math.PI);
  box(3.8,1.02,.07,-6.8,.67,8.35,wood);box(3.9,.14,.18,-6.8,1.22,8.35,orange);
  box(3.7,.04,.04,-6.8,.16,8.3,blueGlow);text('ZDROFIT','ZDROFIT',-6.8,.73,8.3,1.7,.35,Math.PI,'','#47515b','#c4aa83');
  // Access-control gate, fit-bar bottles and counter monitor, missing from GLBs.
  [-9.2,-7.8].forEach(x=>{beam([x,.06,10.6],[x,1,10.6],.035);beam([x,1,10.6],[x,1,11.7],.03);beam([x,.06,11.7],[x,1,11.7],.035)});
  box(.5,.35,.045,-7,1.48,8.9,dark,root,.025);beam([-7,1.1,8.9],[-7,1.4,8.9],.035);
  for(let i=0;i<8;i++){beam([-8.2+i*.3,1.23,8.85],[-8.2+i*.3,1.43,8.85],.05,mat(i%2?'#4e779b':'#c6aa57'));box(.05,.025,.05,-8.2+i*.3,1.445,8.85,dark)}
  // Two compact changing rooms, sizes/position inferred rather than surveyed.
  box(.16,2.8,7.5,-10,1.4,8.75);box(7,2.8,.16,-16.5,1.4,3);box(.16,2.8,9,-15,1.4,8);
  for(const x of [-18,-12.5]){
    prop('locker1',x,11.5,{height:1.85},Math.PI);prop('locker2',x,4.2,{height:1.85});
    // White slatted benches and powder-coated steel legs.
    for(let i=0;i<5;i++)box(.085,.055,2.3,x-.2+i*.1,.46,7.8,white,root,.01);
    for(const z of [6.9,8.7]){beam([x-.2,.02,z],[x-.2,.43,z],.022,dark);beam([x+.2,.02,z],[x+.2,.43,z],.022,dark)}
    box(1.4,.1,.5,x,.82,5.8,mat('#52575a'));box(1.4,.8,.03,x,1.35,5.58,mirror);
    for(const dx of [-.35,.35]){const sink=new T.Mesh(new T.TorusGeometry(.17,.045,10,24),white);sink.rotation.x=Math.PI/2;sink.position.set(x+dx,.9,5.8);root.add(sink);beam([x+dx,.85,5.62],[x+dx,1.08,5.62],.013);beam([x+dx,1.08,5.62],[x+dx,1.08,5.8],.013)}
  }
  text('SZATNIE','CHANGING',-15,2.8,3.1,3,.4);
  prop('plates',-15,-1.8,{height:1.15});prop('barbell',-19,-6,{height:1.5},Math.PI/2);
  // Studio storage: actual rack plus custom step decks, body-pump plates, balls.
  prop('storageRack',10,-9.2,{height:1.6},Math.PI/2);
  for(let stack=0;stack<3;stack++)for(let level=0;level<6;level++){
    const x=10.7+stack*1.05,z=-11.1,y=.15+level*.15;
    box(.95,.13,.38,x,y,z,dark,root,.03);[-.34,.34].forEach(dx=>box(.2,.09,.39,x+dx,y-.025,z,mat('#bd4034'),root,.02));
  }
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
    const ball=new T.Mesh(new T.SphereGeometry(.26,20,12),mat(['#8dba52','#6499bc','#bfc6c8'][(i+j)%3]));ball.position.set(17+i*.75,.4+j*.6,-11.5);ball.castShadow=true;root.add(ball);
  }
  for(let j=0;j<3;j++)beam([16.6,.15+j*.6,-11.2],[19,.15+j*.6,-11.2],.03,dark);
  for(let i=0;i<5;i++)for(let j=0;j<3;j++){
    const plate=new T.Mesh(new T.TorusGeometry(.13,.035,8,20),mat(['#cf496b','#5ca6bf','#b9cd50'][j]));plate.position.set(14.2+i*.24,.35+j*.4,-11.45);root.add(plate);
  }
  for(let i=0;i<5;i++)beam([14.2+i*.24,.1,-11.6],[14.2+i*.24,1.65,-11.6],.016,steel);
  // Low sled and battle rope in the functional bay (not supplied as GLBs).
  box(.65,.08,.95,10,.12,.1,dark);[-.25,.25].forEach(dx=>{beam([10+dx,.05,-.5],[10+dx,.05,.7],.04);beam([10+dx,.13,-.3],[10+dx,1,-.3],.025)});
  for(let side=0;side<2;side++){const points=[];for(let i=0;i<60;i++)points.push(new T.Vector3(13+i*.045,.1,1.6+side*.15+Math.sin(i*.4)*.12));const rope=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),60,.022,6,false),dark);root.add(rope)}
  // Merge static architecture by material without reducing any geometry.
  // Imported detailed equipment remains independently selectable.
  for(const parent of [root,ceiling]){
    const batches=new Map();
    for(const mesh of parent.children.filter(o=>o.isMesh&&!Array.isArray(o.material))){
      const key=mesh.material.uuid+Object.keys(mesh.geometry.attributes).sort().join()+Boolean(mesh.geometry.index);
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
    }
    for(const meshes of batches.values())if(meshes.length>1){
      const geometries=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix)});
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      if(geometry){const merged=new T.Mesh(geometry,meshes[0].material);merged.castShadow=merged.receiveShadow=true;parent.add(merged);meshes.forEach(mesh=>parent.remove(mesh))}
    }
  }
  await Promise.all(jobs);
  return {ceiling,language(){localized.forEach(draw=>draw())}};
}
