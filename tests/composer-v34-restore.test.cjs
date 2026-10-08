const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const current=fs.readFileSync('Sources/legacy-rounded-ui.js','utf8');
const old=fs.readFileSync(process.argv[2] || 'tests/fixtures/legacy-rounded-ui-v34.js','utf8');
const section=s=>s.slice(s.indexOf('  function flatStyle'),s.indexOf('  function propsFor')).replace("    try{recordMessage(p.children,'composer-copy',0);}catch(_){}\n",'');
assert.equal(section(current).replace(/  function composerProps\(p\) \{[\s\S]*?    if\(!settingsReact/, '  function composerProps(p) {\n    if(!settingsReact').replaceAll('createElement(nativeComposerView,','createElement(row.type,'),section(old));
function load(s){const c={};vm.createContext(c);vm.runInContext(s.replace('  function propsFor(t,p) {','  g.check={composer:composerProps,visit:visit};\n  function propsFor(t,p) {'),c);c.check.visit({AppRegistry:{},StyleSheet:{},Platform:{},View:()=>{},version:"19.1.0",isValidElement(){},useState(){},createElement(type,props){return {type,props};}},0);return c.check;}
const a=load(current),b=load(old),callback=()=>{},rowType=()=>{};
for(const backgroundColor of ['blue','transparent',undefined]){
 const input={type:'Input',key:'input',ref:callback,props:{style:{flex:1,justifyContent:'center'},children:'text',onChange:callback}};
 const row={type:rowType,props:{style:{flexDirection:'row',alignItems:'flex-end'},children:[{props:{style:{}}},input,{props:{style:{}}},{props:{onPress:callback}}]}};
 const p={collapsable:false,onStartShouldSetResponder:callback,onResponderRelease:callback,onLayout:callback,style:{backgroundColor},children:[null,null,row]};
 assert.equal(JSON.stringify(a.composer(p)),JSON.stringify(b.composer(p)));
 const out=a.composer(p);if(backgroundColor!==undefined){const center=out.children[2].props.children[1];assert.notEqual(center.type,rowType);assert.equal(center.props.children[0].ref,callback);assert.equal(center.props.children[0].props.onChange,callback);assert.equal(out.children[2].props.children[0].props.style[1].width,40);}else assert.equal(out,p);
}
console.log('PASS: v34 layout retained; only wrapper type and native View guard changed; refs/callbacks/upload preserved');

const empty={};vm.createContext(empty);vm.runInContext(current.replace('  function propsFor(t,p) {','  g.composerTest=composerProps;\n  function propsFor(t,p) {'),empty);const untouched={collapsable:false,children:[]};assert.equal(empty.composerTest(untouched),untouched);console.log('PASS: missing native View leaves original composer intact');
