const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let source=fs.readFileSync(require('node:path').join(__dirname,'../Sources/legacy-rounded-ui.js'),'utf8');
source=source.replace('  function propsFor(t,p) {','  g.testCompat={messageChild:messageChild,composerChildren:composerChildren,styles:profileStyles,visit:visit,props:propsFor,toast:installToastCompatibility};\n  function propsFor(t,p) {');
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
const api=ctx.testCompat;
assert.equal(api.messageChild({locale:'en-US',ast:[{type:0,value:'Restart'}]}),'Restart');
assert.equal(api.messageChild({locale:'ja',ast:[{type:0,value:'再'},{type:0,value:'起動'}]}),'再起動');
const element={$$typeof:Symbol('react.element'),props:{}};assert.equal(api.messageChild(element),element);
const arbitrary={locale:'en',ast:[],extra:true};assert.equal(api.messageChild(arbitrary),arbitrary);
const rich={locale:'en',ast:[{type:1,value:'name'}]};assert.equal(api.messageChild(rich),rich);
const list=[element,{locale:'en',ast:[{type:0,value:'OK'}]}];const normalized=api.messageChild(list);assert.equal(normalized[0],element);assert.equal(normalized[1],'OK');assert.equal(typeof list[1],'object');
const style={actionButton:{borderRadius:4,height:40},actionButtonIcon:{},actionButtonIconActive:{},actionButtonIconDisabled:{}};
const next=api.styles(style);assert.equal(next.actionButton.borderRadius,999);assert.equal(next.actionButton.height,40);assert.equal(style.actionButton.borderRadius,4);
const unrelated={actionButton:{borderRadius:4}};assert.equal(api.styles(unrelated),unrelated);
const mobile={GUILD_BAR_ITEM_MARGIN:12,INPUT_FIELD_RADIUS_MD:{resolve:()=>8}};api.visit({modules:{mobile}},0);assert.equal(mobile.GUILD_BAR_ITEM_MARGIN,4);assert.equal(mobile.INPUT_FIELD_RADIUS_MD.resolve(),16);
assert.equal(ctx.__RAIN_ROUNDED_UI__.errors.length,0);
console.log('PASS: literal message conversion, untouched React/rich values, attachment style immutability, mobile token traversal and guild spacing');

// Composer layout and controlled children must retain identity after reload.
const composer={floatingMainContents:{gap:4},floatingInputBox:{backgroundColor:'blue',height:44},inputFlat:{marginLeft:5},floatingScrimOverlap:{},floatingInputBoxPressed:{opacity:0.8},floatingContainer:{paddingVertical:2},container:{backgroundColor:'black'}};
const restored=api.styles(composer);
assert.equal(restored.floatingMainContents,composer.floatingMainContents);
assert.equal(restored.floatingContainer,composer.floatingContainer);
assert.equal(restored.inputFlat,composer.inputFlat);
assert.equal(restored.floatingInputBox.backgroundColor,'blue');
assert.equal(restored.floatingInputBox.height,44);
assert.equal(restored.floatingInputBox.borderRadius,24);
const children=[element,element,element,element];const props={style:restored.floatingMainContents,children};
assert.equal(api.props('View',props),props);
assert.equal(props.children,children);
console.log('PASS: composer children, native layout and background preserved');
let shake=true;
ctx.__RAIN_BROWSER_LOGIN__=(op,value)=>{assert.equal(op,'shakeMenu');if(value!==undefined)shake=value==='1';return shake?'1':'0'};
const react={useState:init=>[init(),v=>{}],createElement:(type,props)=>({type,props})};api.visit(react,0);
const rows=[{props:{label:'Reload App'}},{type:'SwitchRow',props:{value:false,onValueChange:()=>{}}},{props:{value:false,onValueChange:()=>{}}}];
const group=api.props('Group',{children:rows});assert.equal(group.children.length,4);assert.equal(rows.length,3);
const added=group.children[3];const rendered=added.type(added.props);assert.equal(rendered.props.value,true);rendered.props.onValueChange(false);assert.equal(shake,false);
assert.equal(api.props('Group',group).children.length,4);
console.log('PASS: Rain General switch insertion, saved value and duplicate prevention');
let openedId;
ctx.rain={metro:{findByName:()=>p=>{openedId=p.userId}}};
api.visit({useState:init=>[typeof init==='function'?init():init,()=>{}],useEffect:()=>{},createElement:(type,props)=>({type,key:props.key,props})},0);
const existingCredit={type:'TableRow',props:{label:'cocobo1',subLabel:'Founder & Main Developer',onPress:()=>{}}};
const originalCredits=[existingCredit];
const devGroup=api.props('TableRowGroup',{title:'Developers',children:originalCredits});
assert.equal(originalCredits.length,1);assert.equal(devGroup.children[0],existingCredit);assert.equal(devGroup.children.length,2);
const custom=devGroup.children[1];const credit=custom.type(custom.props);
assert.equal(credit.props.label,'mahoroba');assert.equal(credit.props.subLabel,'Rain Patcher');credit.props.onPress();assert.equal(openedId,'497099669432827904');
assert.equal(api.props('TableRowGroup',devGroup).children.length,2);
console.log('PASS: original credits preserved, custom credit appended once and supplied profile ID used');

const modalComponent=()=>null;let pushed;
ctx.rain.metro.findByFilePath=()=>({default:modalComponent});
const modals={pushModal:options=>{pushed=options;return 42;}};api.visit(modals,0);
const callback=()=>{};const options={key:'oauth2-authorize',modal:{modal:undefined,props:{callback}}};
assert.equal(modals.pushModal(options),42);assert.equal(pushed.modal.modal,modalComponent);assert.equal(pushed.modal.props.callback,callback);assert.equal(options.modal.modal,undefined);
const other={key:'other',modal:{modal:modalComponent}};modals.pushModal(other);assert.equal(pushed,other);
console.log('PASS: OAuth missing-name fallback preserves callback and leaves other modals untouched');

// Custom surfaces must use the real native View, not an animated row type.
const nativeView={render(){}};
api.visit({AppRegistry:{},StyleSheet:{flatten:n=>({31:{flex:1,justifyContent:'center'},32:{flexDirection:'row',alignItems:'flex-end'},33:{backgroundColor:'transparent'}}[n])},View:nativeView},0);
const inputRef={current:{}};
const inputNode={type:'NativeInputContainer',key:'native-input',ref:inputRef,props:{style:[{flex:1,justifyContent:'center',marginLeft:-6}],children:[{type:'TextInput',props:{ref:inputRef}},null]}};
const attachNode={type:'Attachment',props:{style:{paddingBottom:6},children:element}};
const actionNode={type:'EmojiActions',props:{style:{paddingBottom:6},children:element}};
const sendNode={type:'SendButton',props:{onPress:callback}};
const animatedRow=()=>{throw Error('animated row reused as surface');};
const rowNode={type:animatedRow,props:{style:{flexDirection:'row',alignItems:'flex-end',gap:4},children:[attachNode,inputNode,actionNode,sendNode]}};
const reply={type:'ReplyPreview',props:{}};
const responder={collapsable:false,onStartShouldSetResponder:callback,onResponderRelease:callback,onLayout:callback,style:[{backgroundColor:'blue',borderRadius:999}],children:[reply,null,rowNode]};
const fixed=api.props('View',responder);
assert.equal(fixed.children[0],reply);assert.equal(fixed.onLayout,callback);
const surfaces=fixed.children[2].props.children;
assert.equal(surfaces.length,3);for(const item of surfaces)assert.equal(item.type,nativeView);
const fixedParts=[surfaces[0].props.children,...surfaces[1].props.children,surfaces[2].props.children];
assert.equal(fixedParts.length,4);for(const [i,original] of [attachNode,inputNode,actionNode,sendNode].entries()){assert.equal(fixedParts[i].type,original.type);assert.equal(fixedParts[i].props.children,original.props.children);}
assert.equal(fixedParts[1].ref,inputRef);assert.equal(fixedParts[1].key,'native-input');assert.equal(fixedParts[1].props.children[0].props.ref,inputRef);
assert.equal(fixedParts[3],sendNode);assert.equal(fixedParts[3].props.onPress,callback);
assert.equal(surfaces[1].props.style.minHeight,40);assert.equal(surfaces[1].props.style.borderRadius,24);assert.equal(surfaces[1].props.style.backgroundColor,'blue');
assert.equal(surfaces[0].props.style.width,40);assert.equal(surfaces[0].props.style.height,40);assert.equal(surfaces[0].props.style.borderRadius,20);
assert.equal(fixed.style[1].borderWidth,0);assert.equal(fixed.style[0],responder.style);assert.equal(api.props('View',fixed),fixed);
assert.equal(rowNode.props.children[1],inputNode);assert.equal(rowNode.props.children.length,4);assert.equal(inputNode.props.style.length,1);
const numeric={...responder,style:33,children:[reply,null,{...rowNode,props:{style:32,children:[attachNode,{...inputNode,props:{...inputNode.props,style:31}},actionNode,sendNode]}}]};
const numericFixed=api.props('View',numeric);assert.equal(numericFixed.children[2].props.children.length,3);assert.equal(numericFixed.children[2].props.children[1].props.style.backgroundColor,'#1e2d42');
// Lazy missing-name values may be truthy; replace even when already supplied.
modals.pushModal({key:'oauth2-authorize',modal:{modal:()=>undefined,props:{callback}}});
assert.equal(pushed.modal.modal,modalComponent);
console.log('PASS: custom composer uses native View, registered styles resolved, controlled input retained, original input ref/send/reply preserved, idempotence and truthy OAuth fallback');

// Existing and later version alerts must be removed even through a captured
// unwrapped openAlert. Unrelated auth/permission alerts remain present.
let alerts=[{key:'login-warning'},{key:'incompatible-version-alert'}],listeners=[];
const alertModule={useAlertStore:{getState:()=>({alerts}),subscribe:fn=>{listeners.push(fn);return()=>{}}},dismissAlert:key=>{alerts=alerts.filter(a=>a.key!==key);listeners.forEach(fn=>fn());},openAlert:key=>{alerts=alerts.concat([{key}]);listeners.forEach(fn=>fn());}};
const capturedOpen=alertModule.openAlert;
api.visit(alertModule,0);
assert.deepEqual(alerts.map(a=>a.key),['login-warning']);
capturedOpen('incompatible-version-alert');assert.deepEqual(alerts.map(a=>a.key),['login-warning']);
alertModule.openAlert('permission');assert.deepEqual(alerts.map(a=>a.key),['login-warning','permission']);
assert.equal(ctx.__RAIN_ROUNDED_UI__.alertStoreGuard,true);
// Model the real Metro byName.byRaw filter: default export name identifies the
// module, and the badge plugin patches its default hook.
const originalHook=(0,()=>['native-badge']);
const badgeModule={__esModule:true,default:originalHook,QUEST_COMPLETED_BADGE:'quest_completed'};
api.visit(badgeModule,0);
assert.equal(badgeModule.default,originalHook);assert.equal(badgeModule.default.name,'useBadges');
assert.deepEqual(badgeModule.default(),['native-badge']);
const unrelatedDefault=()=>null;const untouched={default:unrelatedDefault,QUEST_COMPLETED_BADGE:'other'};
api.visit(untouched,0);assert.equal(untouched.default.name,'unrelatedDefault');
console.log('PASS: cached version-alert callers covered, unrelated alerts preserved, native badge hook identity and result preserved');

// Rain's negative path cache must not prevent resolving the known v348 module.
ctx.rain.metro.findByFilePath=()=>undefined;
ctx.rain.api={debug:{getDebugInfo:()=>({discord:{version:'348.0'}})}};
ctx.modules={8491:{isInitialized:true,publicModule:{exports:{default:modalComponent}}}};
let required;
ctx.__r=id=>{required=id;return ctx.modules[id].publicModule.exports;};
modals.pushModal(options);assert.equal(required,8491);assert.equal(pushed.modal.modal,modalComponent);
assert.equal(ctx.__RAIN_ROUNDED_UI__.oauthResolution,'verified-348-module');
required=null;ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'349.0'}});
modals.pushModal(options);assert.equal(required,null);
ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'348.0'}});
ctx.modules[8491].dependencyMap=[99];modals.pushModal(options);assert.equal(required,null);
ctx.modules[8491].__filePath='modules/other.tsx';modals.pushModal(options);assert.equal(required,null);
// A path-annotated module works independently of fixed IDs and version guards.
ctx.modules={700:{__filePath:'modules/oauth2/native/OAuth2AuthorizeModal.tsx',isInitialized:true,publicModule:{exports:{default:modalComponent}}}};
modals.pushModal(options);assert.equal(pushed.modal.modal,modalComponent);
assert.equal(ctx.__RAIN_ROUNDED_UI__.oauthResolution,'registry-path');
console.log('PASS: negative-cache OAuth fallback, version/dependency/path guards and annotated registry lookup');

// Rain's toast lazy context must resolve the actual native action object even
// when its file-path lookup fails. Other versions/errors are still rejected.
let toastOpened;
const nativeToasts={open:options=>{toastOpened=options},close:()=>{}};
const toastContext={forceLoad:()=>{throw Error('ToastActionCreators path unavailable')}};
ctx.modules={4131:{isInitialized:true,publicModule:{exports:{default:nativeToasts}}}};
ctx.__r=id=>ctx.modules[id].publicModule.exports;
ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'348.0'}});
ctx.rain.metro.common={toasts:{}};
ctx.rain.metro.lazy={getLazyContext:()=>toastContext};
api.toast(ctx.rain);
const notification={key:'rain-toast-test',content:'Importing data...',source:12};
toastContext.forceLoad().open(notification);assert.equal(toastOpened,notification);
assert.equal(ctx.__RAIN_ROUNDED_UI__.toastCompatibility,true);
ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'349.0'}});
assert.throws(()=>toastContext.forceLoad(),/path unavailable/);
console.log('PASS: failed Rain toast lookup repaired with native actions, notification payload retained and version guard enforced');

(async()=>{
 const cache={findIndex:{'raw::rain.metro.byName(useBadges)':{_1:true},other:{12:1}},flagsIndex:{12:1}};
 const text=JSON.stringify(cache);
 const nativeFS={getConstants:()=>({}),fileExists:()=>true,writeFile:()=>{},readFile:async()=>text};
 api.visit(nativeFS,0);
 const result=JSON.parse(await nativeFS.readFile('/Documents/rain/caches/metro_modules.json','utf8'));
 assert.equal(result.findIndex['raw::rain.metro.byName(useBadges)'],undefined);
 assert.deepEqual(result.findIndex.other,{12:1});assert.deepEqual(result.flagsIndex,cache.flagsIndex);
 assert.equal(await nativeFS.readFile('/Documents/rain/settings.json','utf8'),text);
 console.log('PASS: only badge lookup cache invalidated; unrelated module index and files preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Captured lazy proxies must bypass stale indexes and wrapped hook names.
const contexts=new WeakMap();
const lazy={getLazyContext:p=>contexts.get(p),createLazyModule:filter=>{const p={};contexts.set(p,{filter,indexed:true,getExports:()=>{},forceLoad:()=>{throw Error('stale name cache')}});return p;}};
api.visit(lazy,0);
const rawProxy=lazy.createLazyModule({uniq:'raw::rain.metro.byName(useBadges)'});
const wrappedBadge={QUEST_COMPLETED_BADGE:'quest_completed',default:()=>['wrapped-badge']};
ctx.modules={7675:{isInitialized:true,publicModule:{exports:wrappedBadge}}};
assert.equal(lazy.getLazyContext(rawProxy).forceLoad(),wrappedBadge);
assert.equal(lazy.getLazyContext(rawProxy).indexed,false);
let patchedExport;lazy.getLazyContext(rawProxy).getExports(e=>patchedExport=e);assert.equal(patchedExport,wrappedBadge);
const unrelatedProxy=lazy.createLazyModule({uniq:'other'});assert.throws(()=>lazy.getLazyContext(unrelatedProxy).forceLoad(),/stale name cache/);
assert.equal(fixedParts[1].props.style[0],inputNode.props.style);assert.equal(fixedParts[1].props.children,inputNode.props.children);
console.log('PASS: captured badge lazy resolver preserves shared wrapped hook and unrelated failures; native input style and children retained');

// Rain's lexical lazy factory creates its proxy before window.rain exists.
vm.runInContext(`var earlyMap=new WeakMap(), earlyProxy={}; var earlyContext={filter:{uniq:'raw::rain.metro.byName(useBadges)'},indexed:true,getExports:function(){},forceLoad:function(){throw Error('early stale cache')}};earlyMap.set(earlyProxy,earlyContext);`,ctx);
assert.equal(ctx.earlyContext.forceLoad(),wrappedBadge);
assert.equal(ctx.earlyMap.get(ctx.earlyProxy),ctx.earlyContext);
assert.equal(ctx.earlyContext.indexed,false);
console.log('PASS: pre-Rain lexical lazy context registration repaired without changing WeakMap entries');

// The verified hook can be uninitialized when the GlobalBadges patch starts.
ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'348.0'}});
ctx.modules={7675:{isInitialized:false,hasError:false}};
let requiredBadge;ctx.__r=id=>{requiredBadge=id;return wrappedBadge;};
assert.equal(ctx.earlyContext.forceLoad(),wrappedBadge);assert.equal(requiredBadge,7675);
ctx.rain.api.debug.getDebugInfo=()=>({discord:{version:'349.0'}});
assert.throws(()=>ctx.earlyContext.forceLoad(),/early stale cache/);
assert.equal(fixedParts[0].props.style[1].paddingBottom,0);assert.equal(fixedParts[2].props.style[1].paddingBottom,0);
console.log('PASS: uninitialized v348 native badge hook loaded, other versions rejected, native action padding retained');

// Replay the plugin's existing image callback for the new native URL helper.
vm.runInContext(`var badgeCallbackArray=[]; var callbackRegistry=new Map();callbackRegistry.set('ProfileBadge',badgeCallbackArray);`,ctx);
ctx.badgeCallbackArray.push((component,ret)=>{if(ret.props.id==='gb-test-0')ret.props.source={uri:'https://example.com/custom.png'};});
let officialCalls=0;const badgeURLs={getProfileBadgeIconUrl:b=>{officialCalls++;return b.iconSrc||'official:'+b.icon;},getProfileBadgeLabel:()=>'',isPinnedBadge:()=>false};
api.visit(badgeURLs,0);
const gbBadge={id:'gb-test-0',description:'Test',icon:' _'};
assert.equal(badgeURLs.getProfileBadgeIconUrl(gbBadge),'https://example.com/custom.png');assert.equal(officialCalls,0);assert.equal(gbBadge.source,undefined);
assert.equal(badgeURLs.getProfileBadgeIconUrl({id:'official',icon:'abc'}),'official:abc');
ctx.badgeCallbackArray.splice(0);
assert.equal(badgeURLs.getProfileBadgeIconUrl(gbBadge),'official: _');
assert.equal(fixedParts[1].props.children,inputNode.props.children);assert.equal(fixedParts[1].props.style[0][0].justifyContent,'center');
console.log('PASS: custom badge images use plugin URL cache, official badges unchanged, plugin disable respected, native input alignment retained');

const astChild=Object.freeze({locale:'ja',ast:[{type:0,value:'メッセージ'}]});
const inner=Object.freeze({$$typeof:Symbol.for('react.element'),key:'input',ref:callback,type:'Text',props:Object.freeze({children:astChild,onPress:callback})});
const nested=Object.freeze({$$typeof:Symbol.for('react.element'),key:'wrap',props:Object.freeze({children:Object.freeze([inner])})});
const repaired=api.composerChildren(nested,0);
assert.equal(repaired.props.children[0].props.children,'メッセージ');
assert.equal(repaired.props.children[0].ref,callback);assert.equal(repaired.props.children[0].key,'input');assert.equal(repaired.props.children[0].props.onPress,callback);
assert.equal(inner.props.children,astChild);assert.equal(api.composerChildren(element,0),element);assert.equal(api.composerChildren(rich,0),rich);
console.log('PASS: copied composer subtree translations normalized without modifying frozen originals, keys, refs or callbacks');

assert.equal(api.messageChild({locale:'ja',ast:['メッセージを送信']}),'メッセージを送信');
assert.equal(api.messageChild({locale:'en-US',ast:['Send ',[0,'message']]}),'Send message');
const packedArgs={locale:'ja',ast:['送信先：',[1,'name']]};assert.equal(api.messageChild(packedArgs),packedArgs);
const packedElement={$$typeof:Symbol.for('react.element'),props:{children:{locale:'ja',ast:['メッセージを送信']}}};
assert.equal(api.composerChildren(packedElement,0).props.children,'メッセージを送信');
console.log('PASS: Discord packed literal AST strings/tuples, nested copied input nodes, argument AST left intact');
