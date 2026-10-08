import React, { useEffect, useState } from "react";
import { FluxDispatcher } from "@metro/common";

import { PresenceStore, SessionsStore, UserStore } from "@metro/common/stores";

import { getStatusColor } from "./colors";
import StatusIcon from "./StatusIcon";
import { usePlatformIndicatorSettings } from "./storage";

import { userPlatforms } from "./presence";

export default function StatusIcons(props: { userId: string; size?: number }) {
    const settings = usePlatformIndicatorSettings();

    const userId = props.userId;

    const iconSize = props.size ?? 16;

    const [,update]=useState(0);
    useEffect(()=>{
        let last=JSON.stringify(userPlatforms(userId,{PresenceStore,SessionsStore,UserStore}));
        let alive=true;
        const refresh=()=>{if(!alive)return;
            const next=JSON.stringify(userPlatforms(userId,{PresenceStore,SessionsStore,UserStore}));
            if(next!==last){last=next;update(n=>n+1);}};
        const stores=[PresenceStore,SessionsStore].filter(s=>typeof s?.addChangeListener==="function");
        stores.forEach(s=>s.addChangeListener(refresh));
        const events=["PRESENCE_UPDATES","PRESENCES_REPLACE","SESSIONS_REPLACE"];
        events.forEach(e=>FluxDispatcher.subscribe(e,refresh));
        refresh();
        return ()=>{alive=false;stores.forEach(s=>s.removeChangeListener(refresh));events.forEach(e=>FluxDispatcher.unsubscribe(e,refresh));};
    },[userId]);
    const statuses = userPlatforms(userId,{PresenceStore,SessionsStore,UserStore});

    return (
        <>
            {Object.entries(statuses ?? {}).map(([platform, status]) =>
                <StatusIcon key={platform} platform={platform} color={getStatusColor(status, settings.useThemeColors)} iconSize={iconSize}/>)}
        </>
    );
}
