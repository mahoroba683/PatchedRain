import React from "react";
import { onJsxCreateType } from "@api/react/jsx";
import { appendTitleIndicator, rendererSlot } from "./rowIndicators";
import { after, before } from "@api/patcher";
import { waitForHydration } from "@api/storage";
import { findInReactTree } from "@lib/utils";
import { findByName,findByProps, findByTypeName, findByTypeNameAll } from "@metro";
import { ReactNative } from "@metro/common";
import { definePlugin } from "@plugins";
import { Contributors,Developers } from "@rain/Developers";

import Settings from "./settings";
import StatusIcons from "./StatusIcons";
import { platformIndicatorSettings,usePlatformIndicatorSettings } from "./storage";

const { View, Text } = ReactNative;

type Unpatch = () => void;

const unpatches: Unpatch[] = [];

export default definePlugin({
    name: "PlatformIndicators",
    description: "Shows platform indicators on users",
    author: [Contributors.MSMA, Developers.kmmiio99o],
    id: "platformindicators",
    version: "1.5.0",
    async start() {
        await waitForHydration(usePlatformIndicatorSettings);

        // Message cell indicators are retired. Do not install native cell hooks,
        // publish authors, or refresh all visible cells on presence updates.
        (globalThis as any).__RAIN_NATIVE_PLATFORMS__?.("enable","0");
        const debugLabels = false;
        const patchedRenderers=new WeakSet();
        const patchRender=(component:any, callback:any)=>{
            const slot=rendererSlot(component);
            if(!slot || patchedRenderers.has(slot[0]))return;
            patchedRenderers.add(slot[0]);
            unpatches.push(after(slot[1],slot[0],callback));
        };
        const indicator=(userId:string,key:string)=>(
            <View key={key} pointerEvents="none" style={{flexDirection:"row",alignItems:"center",gap:3,marginLeft:4}}>
                <StatusIcons userId={userId}/>
            </View>
        );
        // v348 header renders a title component with accessibleTitle and userId.
        patchRender(findByTypeName("PrivateChannelHeader"), ([props]:any[], tree:any)=>{
            if(!platformIndicatorSettings.dmTopBar)return;
            const title=findInReactTree(tree,c=>c?.props?.userId && "accessibleTitle" in c.props);
            const userId=title?.props?.userId;
            if(!userId)return;
            return appendTitleIndicator(tree,c=>c===title,indicator(userId,"RainDMHeaderPlatforms"),React.cloneElement);
        });

        // Intercept the original component identity: internal module closures
        // can bypass a replacement of the public DisplayName export.
        const primary=findByProps("DisplayName","ProfileBadgeRows");
        const OriginalName=primary?.DisplayName;
        if(typeof OriginalName==="function") {
            function ProfileNameWithPlatforms(props:any) {
                const original=React.createElement(OriginalName,props);
                const userId=props?.user?.id;
                if(!platformIndicatorSettings.profileUsername || !userId)return original;
                return <View style={{flexDirection:"row",alignItems:"center",flexWrap:"wrap"}}>{original}{indicator(userId,"RainProfilePlatforms")}</View>;
            }
            unpatches.push(onJsxCreateType(OriginalName,(_,element)=>{
                if(!element?.props?.user?.id)return element;
                // createElement preserves props/ref/key and does not re-enter
                // Rain's jsx/jsxs interception when rendering the original.
                return React.createElement(ProfileNameWithPlatforms,{...element.props,key:element.key});
            }));
        }

        // Status patch
        const Status = findByName("Status", false);
        if(typeof Status?.default==="function") unpatches.push(before("default", Status, args => {
            if (!args) return;
            if (!args[0]) return;
            if (!platformIndicatorSettings.removeDefaultMobile) return;
            args[0].isMobileOnline = false;
        }));

        // Guild member row
        const Rows = findByProps("GuildMemberRow");
        if (Rows?.GuildMemberRow) {
            unpatches.push(after("type", Rows.GuildMemberRow, (args: any[], res: any) => {
                const user = args[0]?.user;
                if (!platformIndicatorSettings.userList || !user?.id) return;
                const statusIconsView = findInReactTree(res, c => c.key === "GuildMemberRowStatusIconsView");
                if (!statusIconsView) {
                    const row = findInReactTree(res, c => c.props?.style?.flexDirection === "row");
                    if (row && Array.isArray(row.props.children)) {
                        row.props.children.splice(2, 0,
                            <View
                                key="GuildMemberRowStatusIconsView"
                                style={{
                                    flexDirection: "row"
                                }}>
                                {debugLabels ? <Text>GMRSIV</Text> : <StatusIcons userId={user.id} />}
                            </View>
                        );
                    }
                }
            }));
        }

        // The native UserRow label is shared by friends and member lists.
        const rowPatch=([props]:any[],tree:any)=>{
            const userId=props?.user?.id;
            if(!platformIndicatorSettings.userList || !userId || !tree?.props?.label)return;
            if(findInReactTree(tree.props.label,c=>c?.key==="RainUserRowPlatforms"))return;
            return React.cloneElement(tree,{label:(
                <View style={{flexDirection:"row",alignItems:"center"}}>
                    {tree.props.label}{indicator(userId,"RainUserRowPlatforms")}
                </View>
            )});
        };
        patchRender(findByTypeName("UserRow"),rowPatch);
        findByTypeNameAll("UserRow").forEach(component=>patchRender(component,rowPatch));

        // v348 DM titles may use styled names instead of the old Text variant.
        patchRender(findByTypeName("MessagesItemChannelContent"),([props]:any[],tree:any)=>{
            if(!platformIndicatorSettings.userList)return;
            const recipients=props?.channel?.recipients;
            if(!Array.isArray(recipients) || recipients.length!==1)return;
            const userId=recipients[0];
            return appendTitleIndicator(tree,c=>
                (c.props.userId===userId && "userName" in c.props) ||
                (typeof c.props.variant==="string" && c.props.variant.includes("channel-title")),
                indicator(userId,"RainDMListPlatforms"),React.cloneElement);
        });
    },
    stop() {
        for (const unpatch of unpatches) unpatch();
        unpatches.length = 0;
    },
    settings: Settings,
});
