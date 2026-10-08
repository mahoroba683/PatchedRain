import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {resolve348,compatibleTarget,targets348} from '../RainClient/src/metro/compat348.js';
const sourcePath=new URL('../RainClient/src/metro/finders.ts',import.meta.url);
let source=stripTypeScriptTypes(fs.readFileSync(sourcePath,'utf8'));
source=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const native={__esModule:true,default:function Status(){},StatusWithTyping(){}};
let reads=0,cacheReads=0;
const root={__RAIN_DISCORD_INFO__:{version:'348.0',build:'113691'},modules:{13635:{publicModule:{exports:native}}},__r:id=>{reads++;assert.equal(id,13635);return native;}};
const filter={uniq:'raw::rain.metro.byName(Status)',raw:true};
const sandbox={resolve348:f=>resolve348(f,root),getCacherForUniq:()=>{cacheReads++;throw Error('stale cache used');},requireModule:()=>{throw Error('blacklisted require used');},getModules:()=>{throw Error('stale module enumeration used');}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
assert.equal(sandbox.findExports(filter),native);
assert.equal(sandbox.findExports({...filter,raw:false,uniq:'rain.metro.byName(Status)'}),native.default);
assert.equal(sandbox.findAllExports(filter)[0],native);
assert.equal(cacheReads,0);assert.equal(reads,3);
const old=root.__RAIN_DISCORD_INFO__;root.__RAIN_DISCORD_INFO__={version:'349.0',build:'113691'};
assert.equal(resolve348(filter,root),undefined);root.__RAIN_DISCORD_INFO__=old;
root.modules[13635].__filePath='another.tsx';assert.equal(resolve348(filter,root),undefined);delete root.modules[13635].__filePath;
assert.equal(resolve348({uniq:'rain.metro.byName(Unrelated)'},root),undefined);
assert.equal(reads,3);
const memo={__esModule:true,default:{type:function Anonymous(){}}};root.modules[12586]={publicModule:{exports:memo}};root.__r=id=>memo;
assert.equal(resolve348({uniq:'rain.metro.byTypeName(UserProfileContent)'},root).exports,memo.default);
assert.equal(resolve348({uniq:'raw::rain.metro.byTypeName(UserProfileContent)',raw:true},root).exports,memo);
assert.equal(compatibleTarget({uniq:'rain.metro.byName(UserProfile)'},root),undefined);
// Run Rain's real lazy implementation with an old cached module ID and a
// subscription that must never fire. Compatibility goes through findExports.
let lazy=stripTypeScriptTypes(fs.readFileSync(new URL('../RainClient/src/metro/lazy.ts',import.meta.url),'utf8'));
lazy=lazy.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const lazySandbox={compatibleTarget:f=>compatibleTarget(f,root),findExports:f=>resolve348(f,root)?.exports,
 getMetroCache:()=>({findIndex:{'rain.metro.byTypeName(UserProfileContent)':{99:1,_1:1}}}),metroModules:root.modules,
 subscribeModule:()=>{throw Error('stale subscription used');},_patcherDelaySymbol:Symbol('delay'),
 proxyLazy:(load,options)=>({load,options})};
vm.createContext(lazySandbox);vm.runInContext(lazy,lazySandbox);
const proxy=lazySandbox.createLazyModule({uniq:'rain.metro.byTypeName(UserProfileContent)'});
const context=lazySandbox.getLazyContext(proxy);assert.equal(context.moduleId,12586);
assert.equal(proxy.load(),memo.default);let callbackValue;context.getExports(v=>callbackValue=v);assert.equal(callbackValue,memo.default);
console.log('PASS: real eager/all/lazy Rain finders bypass stale indexes and blacklist, preserve shared native identity, wrong builds/paths rejected');

const activity={__esModule:true,default:{type(){}},getMessagesItemHappeningNowHeight(){return 55;}};
root.modules[15686]={publicModule:{exports:activity}};root.__r=id=>activity;
assert.equal(resolve348({uniq:'rain.metro.byProps(getMessagesItemHappeningNowHeight)'},root).exports,activity);
assert.equal(activity.getMessagesItemHappeningNowHeight(),55);
console.log('PASS: Declutter receives the actual module with its height helper and memo component');

const friendRow={__esModule:true,default:{type:function UserRow(){}}};
root.modules[10353]={publicModule:{exports:friendRow}};root.__r=()=>friendRow;
assert.equal(resolve348({uniq:'rain.metro.byTypeName(UserRow)'},root).exports,friendRow.default);
const svg={__esModule:true,Svg:function Svg(){},Path:function Path(){}};
root.modules[7898]={publicModule:{exports:svg}};root.__r=()=>svg;
assert.equal(resolve348({uniq:'rain.metro.byProps(Svg,Path)'},root).exports,svg);
root.modules[7898].hasError=true;
assert.equal(resolve348({uniq:'rain.metro.byProps(Svg,Path)'},root),undefined);
console.log('PASS: verified friends row and SVG exports resolve through real filters; failed native module rejected');

const primary={__esModule:true,default:function UserProfilePrimaryInfo(){},DisplayName(){},ProfileBadgeRows(){}};
root.modules[10559]={publicModule:{exports:primary},__filePath:'modules/user_profile/native/UserProfilePrimaryInfo.tsx'};root.__r=()=>primary;
assert.equal(resolve348({uniq:'rain.metro.byProps(DisplayName,ProfileBadgeRows)'},root).exports,primary);
console.log('PASS: verified profile DisplayName export resolves independent of old child function names');
