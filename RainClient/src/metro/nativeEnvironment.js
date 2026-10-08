// Discord's own polyfillsNative.tsx (348.0/113691), verified in its HBC.
// Shared Constants.tsx reads location.protocol during module initialization.
// Run the native environment setup before Rain's cache imports Metro modules.
export function prepareNativeEnvironment(root=globalThis) {
 const info=root.__RAIN_DISCORD_INFO__;
 if(info?.version!=='348.0' || String(info.build)!=='113691')return false;
 if(root.location != null)return true;
 const module=root.modules?.[13676];
 if(!module || module.hasError || typeof root.__r!=='function' ||
    (module.__filePath && module.__filePath!=='polyfillsNative.tsx'))
   throw new Error('Discord native environment initializer unavailable (348/113691, module 13676)');
 root.__r(13676);
 if(module.hasError || (module.__filePath && module.__filePath!=='polyfillsNative.tsx') ||
    !root.location || typeof root.location.protocol!=='string')
   throw new Error('Discord native environment did not initialize location');
 if(root.__RAIN_STARTUP_DIAG__)root.__RAIN_STARTUP_DIAG__.nativeEnvironment=true;
 return true;
}
