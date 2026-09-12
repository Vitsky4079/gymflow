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
function segmentClear(a,b,equipment,gym,floor){
	const dx=b[0]-a[0],dz=b[2]-a[2],dist=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(dist/.2));
	for(let i=0;i<=steps;i++){
		const t=i/steps,x=a[0]+dx*t,z=a[2]+dz*t;
		if(x<-gym.width/2+1||x>gym.width/2-1||z<gym.minZ+1||z>gym.maxZ-1)return false;
		if(equipment.some(e=>e.floor===floor&&Math.abs(x-e.x)<(e.footprint?e.footprint.w/2+.15:1.4)&&Math.abs(z-e.z)<(e.footprint?e.footprint.d/2+.15:1.7)))return false;
		if(gym.obstacles.some(o=>(o.floor===undefined||o.floor===floor)&&Math.abs(x-o.x)<o.w/2+.15&&Math.abs(z-o.z)<o.d/2+.15))return false;
	}
	return true;
}
// The BFS above only ever steps axis-aligned at a 0.5m grid resolution, so
// once the gaps between individual machines opened up as crossable, the raw
// path started zigzagging in and out of every gap it passed near — a visible
// staircase instead of the fairly direct line a person would actually walk.
// "String-pull" it afterwards: greedily extend a straight line-of-sight from
// the last kept waypoint as far as it can go before it would clip an
// obstacle, and only drop a new waypoint where the walk genuinely has to
// bend. Same route, far fewer (and often diagonal, more natural-looking)
// segments.
function simplifyPath(points,equipment,gym,floor){
	if(points.length<3)return points;
	const result=[points[0]];
	let anchor=0;
	for(let i=2;i<points.length;i++){
		if(!segmentClear(points[anchor],points[i],equipment,gym,floor)){
			result.push(points[i-1]);
			anchor=i-1;
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
			if(first.length&&second.length)return [...simplifyPath(first,equipment,gym,floor),...simplifyPath(second,equipment,gym,floor).slice(1)];
		}
	}
	const path=gridPath(start,end,equipment,gym,floor);
	return path.length?simplifyPath(path,equipment,gym,floor):path;
}
