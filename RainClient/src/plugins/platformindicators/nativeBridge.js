export function createNativePublisher(bridge, getStatuses) {
 const seen=new Map(); let active=false;
 const call=(op,value)=>{try{return bridge?.(op,value);}catch{return null;}};
 function publish(userId) {
  if(!active || typeof userId!=="string" || !userId.length)return;
  const raw=getStatuses(userId) ?? {}, statuses={};
  for(const key of ["desktop","mobile","web","embedded","vr"])
   if(["online","idle","dnd"].includes(raw[key]))statuses[key]=raw[key];
  const value=JSON.stringify({userId,statuses});
  if(seen.get(userId)===value)return;
  if(seen.size>=2048 && !seen.has(userId))seen.clear();
  if(call("set",value)!=null)seen.set(userId,value);
 }
 return {publish,refresh(){for(const id of [...seen.keys()])publish(id);},
  enable(value){active=!!value;seen.clear();call("enable",active?"1":"0");}};
}
let publisher;
export function setNativePublisher(value){publisher=value;}
export function enableNativeIndicators(value){publisher?.enable(value);}
