import assert from 'node:assert/strict';
import {installStartupBoundary} from '../RainClient/src/metro/startupBoundary.js';
let originalCalls=0,captured=[];
class Boundary{render(){return 'native tree';}componentDidCatch(...args){originalCalls++;return args[0];}}
const root={__RAIN_DISCORD_INFO__:{version:'348.0',build:'113691'},__RAIN_STARTUP_DIAG__:{capture:(...args)=>captured.push(args)},modules:{15551:{__filePath:'components_native/ErrorBoundary.tsx'}},__r:()=>({default:Boundary})};
assert.equal(installStartupBoundary(root),true);const error=new TypeError('Cannot convert undefined value to object');
const instance=new Boundary();assert.equal(instance.componentDidCatch(error,{componentStack:'at ActualComponent'}),error);
assert.equal(originalCalls,1);assert.match(captured[0][0].stack,/ActualComponent/);assert.match(captured[0][0].stack,/TypeError/);
assert.equal(instance.render(),'native tree');assert.equal(installStartupBoundary(root),true);
instance.componentDidCatch(error,{});assert.equal(originalCalls,2);assert.equal(captured.length,2);
assert.equal(installStartupBoundary({...root,__RAIN_DISCORD_INFO__:{version:'349.0',build:'113691'}}),false);
console.log('PASS: React-caught startup failure captured with component stack, native catch/render/return preserved, idempotent and build-guarded');
