// Horizontal camera-relative movement. Normalize diagonals and cap long frame gaps.
export function cameraMovement(keys,forward,elapsed,speed){
 const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
 const z=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
 if(!x&&!z)return {x:0,z:0};
 const length=Math.hypot(forward.x,forward.z)||1;
 const fx=forward.x/length,fz=forward.z/length;
 const scale=Math.max(0,Math.min(.05,elapsed))*speed/Math.hypot(x,z);
 return {x:(fx*z-fz*x)*scale,z:(fz*z+fx*x)*scale};
}
export function isTypingTarget(target){return !!target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]')}
