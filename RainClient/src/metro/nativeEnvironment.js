// Discord's own polyfillsNative.tsx (348.0/113691), verified in its HBC.
// Shared Constants.tsx reads location.protocol during module initialization.
// Run the native environment setup before Rain's cache imports Metro modules.
export async function prepareNativeEnvironment(root=globalThis) {
 const info=root.__RAIN_DISCORD_INFO__;
 if(info?.version!=='348.0' || String(info.build)!=='113691')return false;
 const hasLocation=()=>root.location != null && typeof root.location.protocol==='string' && root.location.protocol.length>0;
 const module=root.modules?.[13676];
 if(!module || typeof root.__r!=='function' ||
    (module.__filePath && module.__filePath!=='polyfillsNative.tsx'))
   throw new Error('Discord native environment initializer unavailable (348/113691, module 13676)');
 // A surviving location alone does not prove the native polyfill module ran.
 // Initialize it when Metro has not executed it in this runtime yet.
 if(module.isInitialized===true && !module.hasError && hasLocation()) {
   if(root.__RAIN_STARTUP_DIAG__)root.__RAIN_STARTUP_DIAG__.nativeEnvironment='already-initialized';
   return true;
 }
 let initializerError;
 if(!module.hasError && module.isInitialized!==true) {
   try { root.__r(13676); } catch(error) { initializerError=error; }
 }
 // Requiring the native module is synchronous. If it is already cached or
 // cannot set location, restore the verified URL fields without delaying Rain.
 if(!hasLocation())root.location={protocol:'https:',host:'discord.com'};
 if(!hasLocation())
   throw new Error('Discord native environment could not restore location; initialized='+module.isInitialized+', factoryPresent='+(typeof module.factory==='function')+', hasError='+module.hasError+', path='+module.__filePath);
 if(root.__RAIN_STARTUP_DIAG__)root.__RAIN_STARTUP_DIAG__.nativeEnvironment=initializerError ? 'restored-after-initializer-error' : (module.isInitialized===true ? 'restored-cached-location' : 'initialized-and-restored');
 return true;
}
