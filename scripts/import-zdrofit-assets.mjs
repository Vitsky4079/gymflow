// Offline asset preparation only; the app remains dependency-free.
// Install tooling into .tools using the command in docs/ZDROFIT-NIEBOROWSKA.md.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, '.tools/package.json'));
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(require.resolve('@gltf-transform/extensions')));
const { dedup, flatten, join, weld, meshopt, textureCompress, getBounds } = await import(pathToFileURL(require.resolve('@gltf-transform/functions')));
const { MeshoptEncoder, MeshoptDecoder } = await import(pathToFileURL(require.resolve('meshoptimizer')));
const sharp = require('sharp');
const folders = [process.argv[2] || 'C:/Users/Dawid/Desktop/Matrix models/GLB models', process.argv[3] || 'C:/Users/Dawid/Desktop/Matrix models/Kettle and floor/GLB'];
const selected = {
  treadmill:'matrix_t3xm_treadmill', elliptical:'matrix_endurance_gt_ep_1_13_22', bike:'matrix_u600e', recumbent:'matrix_r3xm_recumbent_cycle', rower:'matrix_rower', stairs:'matrix_mx_endurance_touch_xl_cm_1_13_22',
  chest:'matrix_aura_chest_press_g3_s10', shoulder:'matrix_aura_converging_shoulder_press_g3_s23', lat:'matrix_aura_lat_pulldown_g3_s30', row:'matrix_aura_diverging_seated_row_g3_s34', legcurl:'matrix_aura_seated_leg_curl_g3_s72_2', legextension:'matrix_aura_leg_extension_g3_s71', abductor:'matrix_aura_hip_abductor_g3_s75', adductor:'matrix_aura_hip_adductor_g3_s74', pecdeck:'matrix_aura_rear_delt_fly_g3_s22', cable:'matrix_aura_adjustable_cable_crossover_g3_ms20', assisted:'matrix_aura_dip_chin_assist_g3_s60_3d', abdominal:'matrix_aura_abdominal_crunch_g3_s51', backextension:'matrix_aura_back_extension_g3_s52', armcurl:'matrix_aura_arm_curl_g3_s40',
  legpress:'matrix_ultra_leg_press_g7_s70', rack:'matrix_magnum_half_rack_mg_a690', olympic:'matrix_g1_olympic_flat_bench_g1_fw163', incline:'matrix_g1_adjustable_incline_bench_g1_fw153', dumbbells:'matrix_g1_10_pair_dumbbell_rack_g1_fw159', barbell:'matrix_g1_barbell_rack_g1_fw160', plates:'matrix_g1_weight_tree_g1_fw157', hipthrust:'matrix_magnum_glute_trainer_mg_pl78', calf:'matrix_magnum_seated_calf_mg_a53', functional:'matrix_connexus_compact',
  kettlebell16:'kettlebell_16kg', kettlebell24:'kettlebell_24kg', kettlebell32:'kettlebell_32kg', floorMat:'floor_mat', storageRack:'gym_equipment_rack', locker1:'gym_locker_01', locker2:'gym_locker_02', reception:'reception_desk_no51',
};
const inventory = [];
const sources = new Map();
for (const folder of folders) for (const filename of (await readdir(folder)).filter(f=>f.endsWith('.glb')).sort()) {
  const source = path.join(folder,filename), bytes = await readFile(source);
  const json = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const usedAs = Object.keys(selected).filter(key=>selected[key]+'.glb'===filename);
  inventory.push({folder:path.basename(path.dirname(folder))==='Kettle and floor'?'props':'Matrix',filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),meshes:json.meshes?.length||0,materials:json.materials?.length||0,selectedAs:usedAs});
  sources.set(filename,source);
}
await mkdir(path.join(root,'docs/references'),{recursive:true});
await writeFile(path.join(root,'docs/references/model-inventory.json'),JSON.stringify(inventory,null,2));
const out=path.join(root,'dist/zdrofit-assets'); await mkdir(out,{recursive:true});
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const manifest={};
for (const [key,filename] of Object.entries(selected)) {
  const source=sources.get(filename+'.glb'); if(!source)throw Error('Missing source: '+filename);
  const doc=await io.read(source); const bounds=getBounds(doc.getRoot().listScenes()[0]);
  await doc.transform(dedup(),flatten(),join(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  const target=path.join(out,key+'.glb');await io.write(target,doc);
  manifest[key]={url:'./zdrofit-assets/'+key+'.glb',source:filename+'.glb',bounds,bytes:(await stat(target)).size};
  console.log(key+': '+manifest[key].bytes+' bytes');
}
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Inventoried ${inventory.length} source GLBs; prepared ${Object.keys(manifest).length} selected models without mesh simplification.`);
