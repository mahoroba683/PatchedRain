import { after } from "@api/patcher";
import { findByPropsLazy } from "@metro";

type Callback = (Component: any, ret: JSX.Element) => JSX.Element;
const callbacks = new Map<string, Callback[]>();
const typeCallbacks = new Map<any, Callback[]>();
export function onJsxCreateType(type: any, callback: Callback) {
    const list=typeCallbacks.get(type) ?? [];
    list.push(callback);typeCallbacks.set(type,list);
    return () => { const current=typeCallbacks.get(type);if(!current)return;
        const i=current.indexOf(callback);if(i>=0)current.splice(i,1);
        if(!current.length)typeCallbacks.delete(type); };
}

export const jsxRuntime = findByPropsLazy("jsx", "jsxs");

export function onJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) callbacks.set(Component, []);
    callbacks.get(Component)!.push(callback);
}

export function deleteJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) return;
    const cbs = callbacks.get(Component)!;
    cbs.splice(cbs.indexOf(callback), 1);
    if (cbs.length === 0) callbacks.delete(Component);
}

/**
 * @internal
 */
export function patchJsx() {
    const callback = ([Component]: unknown[], ret: JSX.Element) => {
        // Band-aid fix for iOS invalid element type crashes
        if (typeof ret.type === "undefined") {
            const diag=(globalThis as any).__RAIN_RENDER_DIAG__;
            if(diag){
                diag.replacementCount++;
                if(diag.replacements.length<12)diag.replacements.push({componentType:typeof Component,
                    componentName:typeof Component==="function"?Component.name:null,
                    propKeys:Object.keys(ret.props || {}),stack:new Error("undefined JSX type").stack});
            }
            ret.type = "RCTView";
            return ret;
        }

        const exact=typeCallbacks.get(Component);
        if(exact)for(const cb of exact){const next=cb(Component,ret);if(next!==undefined)ret=next;}
        if(exact)return ret;
        // The check could be more complex, but this is fine for now to avoid overhead
        if (typeof Component === "function" && callbacks.has(Component.name)) {
            const cbs = callbacks.get(Component.name)!;
            for (const cb of cbs) {
                const _ret = cb(Component, ret);
                if (_ret !== undefined) ret = _ret;
            }
            return ret;
        }
    };

    const patches = [
        after("jsx", jsxRuntime, callback),
        after("jsxs", jsxRuntime, callback)
    ];

    return () => patches.forEach(unpatch => unpatch());
}
