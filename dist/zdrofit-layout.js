// Photo-informed reconstruction, not a measured architectural survey.
// Current finishes: seven official Zdrofit photographs. Room connections:
// Google/Adwebmedia March 2020 panoramas (older Total Fitness branding).
import { equipment, presets, trainerPresets } from './data.js';

const stations=[];
function add(id, templateId, model, x, z, height, options={}) {
  const template=equipment.find(e=>e.id===templateId);
  const number=stations.length+1;
  stations.push({...template,id,translationKey:templateId,model,x,z,height,floor:0,number,rotY:0,footprint:{w:1.8,d:2.4},...options});
}
// Window-side cardio, with a circulation aisle separating it from machines.
add('treadmill','treadmill','treadmill',-3,9.5,1.55,{rotY:Math.PI});
add('treadmill-2','treadmill','treadmill',-.5,9.5,1.55,{rotY:Math.PI});
add('treadmill-3','treadmill','treadmill',2,9.5,1.55,{rotY:Math.PI});
for(let i=0;i<6;i++)add(i?'elliptical-'+(i+1):'elliptical','elliptical','elliptical',5+i*2.5,9.5,1.8,{rotY:Math.PI,footprint:{w:1.1,d:2}});
add('bike','bike','bike',-3,5.4,1.45);
add('recumbent','bike','recumbent',.5,5.4,1.22);
add('rower','rower','rower',4,5.4,.95,{rotY:Math.PI/2,footprint:{w:2.5,d:1.1}});
add('rower-2','rower','rower',8,5.4,.95,{rotY:Math.PI/2,footprint:{w:2.5,d:1.1}});
add('stairs','stairs','stairs',12,5.4,2.12);
// Silver Matrix selectorized machines; the corridor at z=3.5 stays open.
[
  ['chest','chest',-2,-10,1.7],['shoulder','shoulder',2,-10,1.65],['lat','lat',6,-10,2.22],
  ['row','row',-2,-6,1.65],['legcurl','legcurl',2,-6,1.55],['legextension','legextension',6,-6,1.55],
  ['abductor','abductor',-2,-2,1.55],['adductor','adductor',2,-2,1.55],['pecdeck','pecdeck',6,-2,2.02],
].forEach(([id,model,x,z,h])=>add(id,id,model,x,z,h));
add('pullup','pullup','assisted',-6,-2,2.28);
add('cable','cable','cable',-6,-7.7,2.3,{rotY:Math.PI/2,footprint:{w:1.1,d:4.8}});
// Free-weight bay, mirrored on two adjacent walls. Counts are estimates.
for(let i=0;i<3;i++)add(i?'dumbbells-'+(i+1):'dumbbells','dumbbells','dumbbells',-17+i*3.5,-10.8,.95,{footprint:{w:2.9,d:.9}});
for(let i=0;i<3;i++)add(i?'incline-'+(i+1):'incline','incline','incline',-17+i*3.5,-7.7,1.02,{footprint:{w:.9,d:1.8}});
add('bench','bench','olympic',-17,-3.8,1.35);
add('bench-2','bench','olympic',-12.5,-3.8,1.35);
add('rack','rack','rack',-17,0,2.45,{footprint:{w:2.7,d:2.2}});
add('legpress','legpress','legpress',-12.5,0,1.7);
add('hipthrust','hipthrust','hipthrust',-8.5,0,1.35);
add('calf','calf','calf',-8.5,-4,1.18);
// Functional strip beside the studio entrance.
add('trx','trx','functional',17,0,2.5,{footprint:{w:2.8,d:2.2}});
add('kettlebell','kettlebell','kettlebell24',12,0,.3,{footprint:{w:1.5,d:1}});
add('mats','mats','floorMat',16,-8,0,{floorPatch:true,footprint:{w:.8,d:1.7}});
const custom=[
 ['abdominal','abdominal',17,5.4,1.55,'Brzuch — maszyna','Abdominal crunch'],
 ['backextension','backextension',-6,2.5,1.55,'Prostowniki grzbietu','Back extension'],
 ['armcurl','armcurl',6,2,1.55,'Uginanie ramion','Arm curl'],
];
for(const [id,model,x,z,h,pl,en] of custom){
  add(id,'chest',model,x,z,h,{translationKey:null,kind:id,zone:'Siła',name:pl,short:pl,area:pl,
    labels:{pl,en},steps:['Dopasuj ustawienie siedziska i podpór zgodnie z instrukcją na urządzeniu.','Wybierz niewielki opór i wykonuj spokojny, kontrolowany ruch.','Odłóż obciążenie bez uderzania stosu.'],
    tip:'Sprawdź instrukcję producenta i poproś trenera o ustawienie urządzenia.',sets:3,reps:'10–12',rest:60});
}
for(const e of stations)e.approach={x:0,z:e.z>8?-1.75:e.footprint.d/2+.65};
for(const e of stations.filter(e=>e.model==='olympic'))e.footprint.w=2.4;
for(const id of ['legextension','armcurl'])stations.find(e=>e.id===id).approach={x:-1.5,z:0};
export const zdrofitEquipment=stations;
export const zdrofitGym={
  id:'zdrofit-nieborowska',name:'Zdrofit · Gdańsk Nieborowska',
  description:{en:'Photo-informed reconstruction · Nieborowska 10 · approximate layout',pl:'Rekonstrukcja ze zdjęć · Nieborowska 10 · układ przybliżony'},
  floors:1,width:40,depth:25,minZ:-12.5,maxZ:12.5,
  sourceUrl:'https://zdrofit.pl/kluby-fitness/gdansk-nieborowska/',
  reconstruction:true,equipment:stations,
  placements:stations.map(({id,x,z,floor,rotY})=>({id,x,z,floor,rotY})),
  presets:[...presets,...trainerPresets].map(p=>({...p,ids:p.ids.filter(id=>stations.some(e=>e.id===id))})).filter(p=>p.ids.length),
  // Wall segments, column footprints and reception; openings are traversable.
  obstacles:[
    {x:-15,z:-1.8,w:1,d:1},{x:-19,z:-6,w:.9,d:1.5},
    {x:10,z:.1,w:.7,d:1.2},{x:10,z:-9.2,w:1,d:3},
    {x:8.5,z:-7.75,w:.2,d:9.5},
    {x:10.5,z:-3,w:4,d:.2},{x:18,z:-3,w:4,d:.2},
    {x:-10,z:8.75,w:.2,d:7.5},{x:-16.5,z:3,w:7,d:.2},
    {x:-15,z:8,w:.2,d:9},
    {x:-6.8,z:9,w:3.4,d:1.2},
    ...[-6,6].flatMap(x=>[-4,4].map(z=>({x,z,w:.55,d:.55}))),
  ],
};
