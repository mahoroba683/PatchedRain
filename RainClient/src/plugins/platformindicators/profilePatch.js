// Discord 348 can render profile layouts without the old named child nodes.
// Patch real callable targets only; missing nodes must leave that tree intact.
export function installProfileIndicators(profile, after, findTree, makeIndicators) {
 const patches=[],seen=new WeakSet();
 function patchType(target,callback){
   const holder=typeof target?.type==='function'?target:typeof target?.type?.type==='function'?target.type:null;
   if(!holder || seen.has(holder))return;
   const unpatch=after('type',holder,callback);
   seen.add(holder);patches.push(unpatch);
 }
 patchType(profile,(_,tree)=>{
   const primary=findTree(tree,c=>c?.type?.name==='PrimaryInfo');
   patchType(primary,(_,tree)=>{
     if(tree?.type?.name!=='UserProfilePrimaryInfo')return;
     patchType(tree,(_,tree)=>{
       const display=findTree(tree,c=>c?.type?.name==='DisplayName');
       patchType(display,(args,result)=>{
         const userId=args?.[0]?.user?.id;
         if(!userId || !result?.props || !Array.isArray(result.props.children))return;
         if(result.props.children.some(child=>child?.key==='UserProfileIcons'))return;
         result.props.children.push(makeIndicators(userId));
       });
     });
   });
 });
 return ()=>{for(const undo of patches.splice(0).reverse())undo();};
}
