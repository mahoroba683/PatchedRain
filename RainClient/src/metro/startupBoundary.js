// Observe Discord's own React error boundary before the first application render.
// React-caught failures do not necessarily reach console.error or ErrorUtils.
export function installStartupBoundary(root=globalThis) {
 const info=root.__RAIN_DISCORD_INFO__,diag=root.__RAIN_STARTUP_DIAG__;
 if(!diag || info?.version!=='348.0' || String(info.build)!=='113691')return false;
 const module=root.modules?.[15551];
 if(!module || module.hasError || (module.__filePath && module.__filePath!=='components_native/ErrorBoundary.tsx'))return false;
 const Boundary=root.__r(15551)?.default,proto=Boundary?.prototype;
 if(module.hasError || (module.__filePath && module.__filePath!=='components_native/ErrorBoundary.tsx') ||
    typeof proto?.componentDidCatch!=='function' || typeof proto.render!=='function')return false;
 if(diag.boundaryHook)return true;
 const original=proto.componentDidCatch;
 proto.componentDidCatch=function(error,details){
   try {
     diag.capture({message:error?.message,stack:String(error?.stack || error)+'\nComponent stack:\n'+String(details?.componentStack || '')},'Discord.ErrorBoundary');
   }catch(_){}
   return original.apply(this,arguments);
 };
 diag.boundaryHook=true;
 return true;
}
