const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../Sources/browser-login.js'),'utf8');
for(const preferred of ['ja-JP','en-US','fr-FR','ko-KR','zh-TW']) {
 const timers=[];let overrides=0;
 const locale={_isInitialized:true,locale:'de'};
 const ctx={setInterval:fn=>{timers.push(fn)},setTimeout:()=>{},console:{warn:()=>{}},
 __RAIN_BROWSER_LOGIN__:op=>op==='preferredLocale'?preferred:null,
 rain:{metro:{findByStoreName:()=>locale,findByProps:(...keys)=>keys.includes('dispatch')?{dispatch:()=>overrides++}:null}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 timers.forEach(fn=>fn());
 assert.equal(locale.locale,'de');assert.equal(overrides,0);
 locale.locale='fr';timers.forEach(fn=>fn());assert.equal(locale.locale,'fr');
 assert.equal(ctx.__RAIN_LOCALE_FIX__.mode,'discord');
 assert.equal(timers.length,1); // Browser login only; no locale forcing timer.
}
console.log('PASS: device language never overrides Discord language; later changes remain untouched');
