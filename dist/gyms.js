import {equipment,presets,trainerPresets} from './data.js';
// Studio 01's cardio row sits against the back wall (TVs mounted above it) —
// these machines face it (rotY) rather than the default orientation the
// shared equipment data uses everywhere else, like Atlas Club's own grid.
const CARDIO_WALL=['treadmill','bike','elliptical','rower','stairs','airbike'];
export const gyms=[
// Studio 01 drops the floor-mats station (a second leg press sits in its old
// spot instead) — Atlas Club keeps it, so it stays in the shared equipment
// data and is just filtered out of this gym's own placements.
{id:'studio',name:'Studio 01',description:{en:'Open-plan training studio',pl:'Otwarta przestrzeń treningowa'},floors:1,width:36,depth:33,minZ:-13.5,maxZ:19.5,placements:equipment.filter(e=>e.id!=='mats').map(e=>({id:e.id,x:e.x,z:e.z,floor:0,...(CARDIO_WALL.includes(e.id)?{rotY:Math.PI}:{})})),presets:[...presets,...trainerPresets],obstacles:[]},
{id:'atlas',name:'Atlas Club',description:{en:'Two floors · strength & movement',pl:'Dwa poziomy · siła i ruch'},floors:2,width:28,depth:24,minZ:-12,maxZ:12,placements:[
...['treadmill','bike','elliptical','airbike','rower','stairs','mats','kettlebell','trx','pullup','dips','dumbbells'].map((id,i)=>({id,x:-10+(i%4)*6,z:-8+Math.floor(i/4)*6,floor:0})),
...['chest','lat','row','shoulder','legcurl','legextension','cable','abductor','hipthrust','rack','bench','incline'].map((id,i)=>({id,x:-10+(i%4)*6,z:-8+Math.floor(i/4)*6,floor:1}))],
presets:[{id:'full',name:'Całe ciało A',description:'6 ćwiczeń · około 45 min',ids:['treadmill','legcurl','chest','lat','row','shoulder'],category:'builtin'},{id:'upper',name:'Góra ciała',description:'6 ćwiczeń · około 45 min',ids:['treadmill','pullup','chest','row','shoulder','cable'],category:'builtin'},{id:'lower',name:'Nogi + plecy',description:'5 ćwiczeń · około 40 min',ids:['treadmill','hipthrust','legcurl','legextension','lat'],category:'builtin'},...trainerPresets],obstacles:[{x:0,z:-8,w:.5,d:5,floor:0},{x:-10,z:1,w:7,d:.5,floor:1}],stairs:{x:10,z:7}}
];
export const getGym=id=>gyms.find(g=>g.id===id)||gyms[0];
export function equipmentForGym(id){return getGym(id).placements.map(p=>({...equipment.find(e=>e.id===p.id),...p,featured:getGym(id).presets.some(preset=>preset.ids.includes(p.id))}))}
export function normalizeSteps(steps,gymId){const available=new Set(getGym(gymId).placements.map(p=>p.id));return Array.isArray(steps)?steps.filter(s=>s&&available.has(s.id)).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i).map(s=>({id:s.id,sets:Math.min(10,Math.max(1,Math.floor(Number(s.sets)||3))),reps:String(s.reps||'10–12').slice(0,20),rest:Math.min(600,Math.max(0,Math.round(Number(s.rest)||0))),weight:String(s.weight||'').slice(0,10),note:String(s.note||'').slice(0,200)})):[]}
