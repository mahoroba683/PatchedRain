// Copy only the native ancestor path that owns the title. Never mutate a
// compiler-cached/frozen React tree or add a View inside a native Text node.
export function appendTitleIndicator(tree, matches, indicator, clone, style) {
 let inserted=false;
 function visit(node) {
  if(!node?.props || inserted)return node;
  if(node.props.variant || (typeof node.type==="string" && /text/i.test(node.type)))return node;
  const value=node.props.children;
  const children=Array.isArray(value)?value:[value];
  if(children.some(c=>c?.key===indicator.key)) {inserted=true;return node;}
  const index=children.findIndex(c=>c?.props && matches(c));
  if(index>=0){
   inserted=true;
   const next=children.slice();next.splice(index+1,0,indicator);
   return clone(node,{children:next,...(style?{style:[node.props.style,style]}:{})});
  }
  let changed=false;
  const next=children.map(c=>{const result=visit(c);if(result!==c)changed=true;return result;});
  return changed?clone(node,{children:Array.isArray(value)?next:next[0]}):node;
 }
 return visit(tree);
}
export function rendererSlot(component) {
 if(typeof component?.type==='function')return [component,'type'];
 if(typeof component?.type?.render==='function')return [component.type,'render'];
 if(typeof component?.render==='function')return [component,'render'];
}
