export const approachPoint=e=>e.approach?{x:e.x+e.approach.x,z:e.z+e.approach.z}:{x:e.x,z:e.z+2};
// Real stations are ~2.7m wide x ~3.13m deep (cable's own footprint is the
// one wider exception) — a flat 1.65m isotropic margin overshoots that
// half-width (1.35m) enough that two same-row neighbours 3m apart (a normal
// aisle-free row spacing) have their exclusion zones overlap along the
// entire row, sealing it into one solid wall with no way through except
// around the ends. Use the real half-width/half-depth (plus a slim personal
// buffer that stays under the ~1.5m half-spacing) as the default so the
// actual gap between machines opens up as a crossable single-file gap.
function gridPath(startPt,endPt,equipment,gym,floor){const step=.5,start=[Math.round(startPt.x/step),Math.round(startPt.z/step)],end=[Math.round(endPt.x/step),Math.round(endPt.z/step)],key=p=>p.join(','),queue=[start],seen=new Map([[key(start),null]]);let cursor=0;while(cursor<queue.length){const p=queue[cursor++];if(key(p)===key(end)){const path=[];let current=p;while(current){path.push([current[0]*step,.12,current[1]*step]);current=seen.get(key(current))}return path.reverse()}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz],x=n[0]*step,z=n[1]*step;if(x<-gym.width/2+1||x>gym.width/2-1||z<gym.minZ+1||z>gym.maxZ-1||seen.has(key(n)))continue;if(equipment.some(e=>e.floor===floor&&Math.abs(x-e.x)<(e.footprint?e.footprint.w/2+.15:1.4)&&Math.abs(z-e.z)<(e.footprint?e.footprint.d/2+.15:1.7)))continue;if(gym.obstacles.some(o=>(o.floor===undefined||o.floor===floor)&&Math.abs(x-o.x)<o.w/2+.15&&Math.abs(z-o.z)<o.d/2+.15))continue;seen.set(key(n),p);queue.push(n)}}return []}
// The BFS above only ever steps axis-aligned at a 0.5m grid resolution, so
// once the gaps between individual machines opened up as crossable, the raw
// path could zigzag in and out of every gap it passed near — a dense row of
// 0.5m dashes instead of a few corridor-length runs. An earlier version of
// this smoothed it with line-of-sight "string-pulling," which does shorten
// it but can cut a genuine diagonal across the open floor instead of
// following the pathway the search actually found. Collapse it instead:
// keep a waypoint only where the walk's direction actually changes, merging
// every run of consecutive same-direction steps into one straight segment.
// Since the BFS itself never steps diagonally, every merged segment stays
// perfectly axis-aligned — straight down the middle of whatever gap or
// aisle it's in, just drawn as one bar instead of a dozen.
function simplifyPath(points){
	if(points.length<3)return points;
	const dir=(a,b)=>[Math.sign(b[0]-a[0]),Math.sign(b[2]-a[2])];
	const result=[points[0]];
	let prevDir=dir(points[0],points[1]);
	for(let i=1;i<points.length-1;i++){
		const nextDir=dir(points[i],points[i+1]);
		if(nextDir[0]!==prevDir[0]||nextDir[1]!==prevDir[1]){
			result.push(points[i]);
			prevDir=nextDir;
		}
	}
	result.push(points[points.length-1]);
	return result;
}
// Studio 01 marks a concrete aisle down the middle (gym.aisle={min,max}) as
// the walk-in path between the free-weight and machine mat zones. Crossing
// from one to the other should funnel through it like an actual visitor
// would, not cut straight across the mats just because that's a few grid
// steps shorter — the plain grid search has no notion of that, since every
// open cell costs the same regardless of which zone it's in. When the two
// stops sit on opposite sides of the aisle, route to a waypoint at the
// aisle's own centre first, then on to the destination, instead of a single
// direct search.
export function findGymPath(equipment,a,b,gym,floor){
	const start=approachPoint(a),end=approachPoint(b);
	// Keep the new room on its verified aisle grid; diagonal smoothing can
	// clip the narrow gaps beside its columns and studio doorway.
	if(gym.reconstruction)return gridPath(start,end,equipment,gym,floor);
	const aisle=gym.aisle;
	if(aisle){
		const side=x=>x<aisle.min?-1:x>aisle.max?1:0;
		if(side(start.x)*side(end.x)===-1){
			const mid={x:(aisle.min+aisle.max)/2,z:Math.min(Math.max((start.z+end.z)/2,gym.minZ+1),gym.maxZ-1)};
			const first=gridPath(start,mid,equipment,gym,floor),second=gridPath(mid,end,equipment,gym,floor);
			// Simplify each half on its own, before joining them, so the aisle
			// waypoint itself always survives as a hard pinch point — simplifying
			// the joined path in one pass would just line-of-sight straight across
			// the open mats and erase the very crossing this was meant to force.
			if(first.length&&second.length)return [...simplifyPath(first),...simplifyPath(second).slice(1)];
		}
	}
	const path=gridPath(start,end,equipment,gym,floor);
	return path.length?simplifyPath(path):path;
}
