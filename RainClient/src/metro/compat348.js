globalThis.__RAIN_PLUGIN_COMPAT__ ||= {version:58, baseUI:34, resolved:{}, errors:[]};
// Verified against Discord iOS 348.0 / build 113691. No eager preloading,
// factory wrapping, cache edits, global prototype hooks or UI token changes.
export const targets348 = [
 [10559, "UserProfilePrimaryInfo", "modules/user_profile/native/UserProfilePrimaryInfo.tsx", "function", ["DisplayName", "ProfileBadgeRows"]],
 [7898, "Svg", null, "svg", ["Svg", "Path"]],
 [10353, "UserRow", "modules/main_tabs_v2/native/shared_components/user_list/UserRow.tsx", "memo"],
 [15551, "ErrorBoundary", "components_native/ErrorBoundary.tsx", "function"],
 [8251, 'CutoutableAvatarDecoration', 'modules/collectibles/native/components/CutoutableAvatarDecoration.tsx', 'function'],
 [8258, 'Nameplate', 'modules/collectibles/nameplates/native/Nameplate.tsx', 'function'],
 [16024, 'YouBarNameplate', 'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx', 'memo'],
 [7653, 'ProfileFrame', 'modules/collectibles/profile_frames/native/ProfileFrame.tsx', 'function'],
 [7644, 'useProfileFrame', 'modules/collectibles/profile_frames/hooks/useProfileFrame.tsx', 'function'],
 [12797, 'PrivateChannelHeader', 'modules/main_tabs_v2/native/channel/header/PrivateChannelHeader.tsx', 'memo'],
 [10698, 'UserProfileAboutMeCard', 'modules/user_profile/native/UserProfileAboutMeCard.tsx', 'function'],
 [15686, 'MessagesItemHappeningNow', 'modules/main_tabs_v2/native/tabs/messages/items/MessagesItemHappeningNow.tsx', 'memo', ['getMessagesItemHappeningNowHeight']],
 [13507, 'GuildActionSheetProgress', 'modules/guild_action_sheet/native/components/GuildActionSheetProgress.tsx', 'function'],
 [9850, 'GifProvider', 'modules/gif_picker/GifProvider.tsx', 'gif'],
 [11594, 'JumpToPresentButton', 'components_native/chat/JumpToPresentButton.tsx', 'function'],
 [12586, 'UserProfileContent', 'modules/user_profile/native/UserProfileContent.tsx', 'memo'],
 [12790, 'PrivateChannelButtons', 'modules/main_tabs_v2/native/channel/header/PrivateChannelButtons.tsx', 'memo'],
 [12794, 'ChannelHeader', 'modules/main_tabs_v2/native/channel/header/ChannelHeader.tsx', 'function'],
 [13635, 'Status', 'design/void/Status/native/Status.tsx', 'function'],
 [15888, 'useGuildActionRows', 'modules/guild_sidebar/useGuildActionRows.tsx', 'function'],
 [16970, 'VideoButton', 'modules/voice_panel/native/controls/buttons/VoicePanelVideoButton.tsx', 'function'],
 [10400, 'ChannelLongPressActionSheet', 'modules/channel/native/ChannelLongPressActionSheet.tsx', 'function'],
 [12646, 'UserProfileContactButtons', 'modules/user_profile/native/UserProfileContactButtons.tsx', 'function'],
 [9792, 'ForumPostLongPressActionSheet', 'modules/action_sheet/native/components/LongPressForumPostActionSheet.tsx', 'function'],
 [7367, 'createMessageContent', 'modules/messages/native/renderer/createMessageContent.tsx', 'function'],
 [12663, 'NameplateProductPreview', 'modules/collectibles/nameplates/native/NameplateProductPreview.tsx', 'function'],
 [12662, 'AvatarDecorationProductPreview', 'modules/collectibles/native/AvatarDecorationProductPreview.tsx', 'function'],
 [7609, 'ProductDetailsActionSheet', 'modules/collectibles/native/ProductDetailsActionSheet.tsx', 'function'],
 [10541, 'ProfileEffectUserPreview', 'modules/collectibles/profile_effects/native/previews/ProfileEffectUserPreview.tsx', 'function'],
 [5081, 'useDisplayNameStyles', 'modules/display_name_styles/hooks/useDisplayNameStyles.tsx', 'function'],
 [15666, 'MessagesItemChannelContent', 'modules/main_tabs_v2/native/tabs/messages/items/channel/MessagesItemChannelContent.tsx', 'memo'],
];
export function compatibleTarget(filter, root = globalThis) {
 const info = root.__RAIN_DISCORD_INFO__;
 if (!info || info.version !== '348.0' || String(info.build) !== '113691') return;
 const key = String(filter.uniq || '').replace(/^raw::/, '');
 return targets348.find(([id, name, path, kind, props]) =>
   (props && key === `rain.metro.byProps(${props.join(",")})`) ||
   (kind !== 'gif' && key === `rain.metro.byName(${name})`) ||
   (kind === 'memo' && key === `rain.metro.byTypeName(${name})`) ||
   key === `rain.metro.byFilePath(${path},false)` || key === `rain.metro.byFilePath(${path},true)`);
}
export function resolve348(filter, root = globalThis) {
 const target = compatibleTarget(filter, root);
 if (!target || typeof root.__r !== 'function') return;
 const [id, name, path, kind] = target;
 const module = root.modules?.[id];
 if (!module || module.hasError || (module.__filePath && module.__filePath !== path)) return;
 const exports = root.__r(id); // Same live exports used by Discord; no stand-in components.
 if (module.hasError || (module.__filePath && module.__filePath !== path)) return;
 if (kind === 'svg' ? typeof exports?.Svg !== 'function' || typeof exports?.Path !== 'function'
    : kind === 'gif' ? typeof exports?.getSearchPlaceholder !== 'function' || !('GIF_PROVIDER' in exports)
    : kind === 'memo' ? typeof exports?.default?.type !== 'function'
    : typeof exports?.default !== 'function') return;
 if (target[4] && String(filter.uniq).includes('rain.metro.byProps(') && !target[4].every(p => typeof exports[p] === 'function')) return;
 const defaultExport = !String(filter.uniq).includes('rain.metro.byProps(') && !filter.raw && !String(filter.uniq).endsWith(',false)');
 const value = defaultExport ? exports.default : exports;
 const state = root.__RAIN_PLUGIN_COMPAT__ ||= {version:58, baseUI:34, resolved:{}, errors:[]};
 state.resolved[name] = (state.resolved[name] || 0) + 1;
 return {id, defaultExport, exports:value};
}
