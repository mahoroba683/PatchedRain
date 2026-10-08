import { fileExists, readFile, writeFile } from "@api/native/fs";
import { NativeClientInfoModule } from "@api/native/modules";
import { debounce } from "es-toolkit";

import { ModuleFlags, ModulesMapInternal } from "./enums";

const CACHE_VERSION = 2;
const RAIN_METRO_CACHE_PATH = "caches/metro_modules.json";

type ModulesMap = {
    [flag in number | `_${ModulesMapInternal}`]?: ModuleFlags;
};

interface MetroCache {
    _v: number;
    _buildNumber: string | number;
    _modulesCount: number;
    _assetScanComplete: boolean;
    flagsIndex: Record<string, number>;
    findIndex: Record<string, ModulesMap | undefined>;
    polyfillIndex: Record<string, ModulesMap | undefined>;
}

let _metroCache = null as unknown as MetroCache;
let _assetScanPromise: Promise<void> = Promise.resolve();

export const getMetroCache = () => _metroCache;

function buildInitCache() {
    const cache: MetroCache = {
        _v: CACHE_VERSION,
        _buildNumber: NativeClientInfoModule.getConstants().Build,
        _modulesCount: Object.keys(window.modules).length,
        _assetScanComplete: false,
        flagsIndex: {},
        findIndex: {},
        polyfillIndex: {}
    };

    const moduleIds = Object.keys(window.modules);
    const CHUNK_SIZE = 200;
    let index = 0;
    let completeScan!: () => void;
    _assetScanPromise = new Promise<void>(resolve => { completeScan = resolve; });

    function initChunk(deadline?: { timeRemaining: () => number }) {
        const hasTime = !deadline || deadline.timeRemaining() > 5;
        while (index < moduleIds.length && (hasTime || index % CHUNK_SIZE !== 0)) {
            require("./modules").requireModule(Number(moduleIds[index++]));
        }
        if (index < moduleIds.length) {
            setTimeout(initChunk, 0);
            return;
        }

        cache._assetScanComplete = true;
        Promise.resolve(saveCache.flush?.()).then(completeScan, completeScan);
    }

    _metroCache = cache;
    setTimeout(initChunk, 20);
    return cache;
}

/** @internal */
export async function initMetroCache() {
    if (!await fileExists(RAIN_METRO_CACHE_PATH)) {
        buildInitCache();
        await _assetScanPromise;
        return;
    }

    const rawCache = await readFile(RAIN_METRO_CACHE_PATH);
    try {
        _metroCache = JSON.parse(rawCache) as MetroCache;
        if (_metroCache._v !== CACHE_VERSION) throw new Error("cache version mismatch");
        if (_metroCache._buildNumber !== NativeClientInfoModule.getConstants().Build) throw new Error("build mismatch");
        if (_metroCache._modulesCount !== Object.keys(window.modules).length) throw new Error("module count mismatch");
        const hasAssetModules = Object.values(_metroCache.flagsIndex).some(flags => flags & ModuleFlags.ASSET);
        if (!_metroCache._assetScanComplete || !hasAssetModules) throw new Error("asset scan incomplete");
    } catch {
        buildInitCache();
        await _assetScanPromise;
    }
}

const saveCache = debounce(() => {
    writeFile(RAIN_METRO_CACHE_PATH, JSON.stringify(_metroCache));
}, 1000);

function extractExportsFlags(moduleExports: any) {
    if (!moduleExports) return undefined;
    const bit = ModuleFlags.EXISTS;
    return bit;
}

/** @internal */
export function indexExportsFlags(moduleId: number, moduleExports: any) {
    const flags = extractExportsFlags(moduleExports);
    if (flags && flags !== ModuleFlags.EXISTS) {
        _metroCache.flagsIndex[moduleId] = flags;
    }
}

/** @internal */
export function indexBlacklistFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.BLACKLISTED;
}

/** @internal */
export function indexAssetModuleFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.ASSET;
    saveCache();
}

/** @internal */
export function getCacherForUniq(uniq: string, allFind: boolean) {
    const indexObject = _metroCache.findIndex[uniq] ??= {};

    return {
        cacheId(moduleId: number, exports: any) {
            indexObject[moduleId] ??= extractExportsFlags(exports);
            saveCache();
        },
        finish(notFound: boolean) {
            if (allFind) indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            if (notFound) indexObject[`_${ModulesMapInternal.NOT_FOUND}`] = 1;
            saveCache();
        }
    };
}

/** @internal */
export function getPolyfillModuleCacher(name: string) {
    const indexObject = _metroCache.polyfillIndex[name] ??= {};

    return {
        getModules() {
            return require("@metro/internals/modules").getCachedPolyfillModules(name);
        },
        cacheId(moduleId: number) {
            indexObject[moduleId] = 1;
            saveCache();
        },
        finish() {
            indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            saveCache();
        }
    };
}

export function invalidateCache() {
    _metroCache = buildInitCache();
    saveCache.flush?.();
}
