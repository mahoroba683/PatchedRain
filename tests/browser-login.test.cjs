const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const script=fs.readFileSync(require('node:path').join(__dirname,'../Sources/browser-login.js'),'utf8');
function setup(auth, pending, updater) {
  const calls=[];let tick, refresh;
  const context={nativeModuleProxy:{BundleUpdaterManager:updater},setTimeout:fn=>{refresh=fn},setInterval:fn=>{tick=fn},console:{warn:()=>{}},__RAIN_BROWSER_LOGIN__:(op,value)=>{if(op==='preferredLocale')return 'en';calls.push([op,value]);return op==='peek'?pending:op==='status'?(calls.some(c=>c[0]==='ack')?'applied':'in-app-awaiting-callback'):null}};
  vm.createContext(context);vm.runInContext(script,context);
  context.rain={metro:{findByProps:()=>auth}};
  return {context,calls,tick:()=>tick(),refresh:()=>refresh()};
}
let current=null;
const auth={getToken:()=>current,setToken:token=>{current=token}};
let t=setup(auth,'test-session-not-a-real-token');t.tick();
assert.equal(current,'test-session-not-a-real-token');
assert.equal(t.calls[0][0],'auth');assert.equal(t.calls[0][1],'0');
assert.equal(t.calls.filter(c=>c[0]==='ack').length,1);assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.nativePhase,'applied');assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.applied,true);
const count=t.calls.length;t.tick();assert.equal(t.calls.length,count);
t=setup(auth,null);t.tick();assert.equal(t.calls[0][1],'1');assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.applied,false);
t=setup({getToken:()=>null,setToken:()=>{}},'test-session-not-a-real-token');t.tick();
assert.equal(t.calls.some(c=>c[0]==='ack'),false);assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.error,'Browser login application failed');
t=setup(null,null);t.tick();assert.equal(t.calls.length,0);
console.log('PASS: login handoff, acknowledgement, existing session, unavailable store and failure handling');

current=null;let reloads=0;
t=setup(auth,'mock-token-runtime-refresh',{reload:()=>{reloads++}});t.tick();
assert.equal(reloads,0);t.refresh();assert.equal(reloads,1);
assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.refresh,'requested');
t.tick();assert.equal(reloads,1);
t=setup(auth,'mock-token-no-updater');t.tick();t.refresh();
assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.refresh,'unavailable');
t=setup(auth,'mock-token-reload-failure',{reload:()=>{throw Error('test')}});t.tick();t.refresh();
assert.equal(t.context.__RAIN_BROWSER_LOGIN_STATUS__.refresh,'failed');
console.log('PASS: delayed runtime refresh, one-shot reload and missing/failing updater');
