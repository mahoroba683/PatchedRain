export function userPlatforms(userId, {PresenceStore,SessionsStore,UserStore}) {
 if(!userId)return {};
 if(userId===UserStore.getCurrentUser()?.id){
  const sessions=SessionsStore.getSessions?.() ?? {};
  const result={};
  for(const session of Object.values(sessions)){
   const client=session?.clientInfo?.client;
   if(client && client!=="unknown" && session.status)result[client]=session.status;
  }
  if(Object.keys(result).length)return result;
 }
 return (typeof PresenceStore.getClientStatus==="function"
  ?PresenceStore.getClientStatus(userId):PresenceStore.getState?.()?.clientStatuses?.[userId]) ?? {};
}
