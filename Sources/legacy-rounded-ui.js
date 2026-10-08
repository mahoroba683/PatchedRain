/* RainTweak Rounded UI v29. Token overrides + Metro/React interception.
 * Legacy values are v331's non-mobile-visual-refresh resolver branches.
 * Pill buttons and circular guild images are explicit restoration choices.
 */
(function () {
  'use strict';
  var g = globalThis;
  if (g.__RAIN_ROUNDED_UI__) return;
  var state = g.__RAIN_ROUNDED_UI__ = {version: 58, badgeImages: 0, badgeImageMisses: 0, badgeResolution: null, badgeContexts: 0, badgeLazyRepairs: 0, badgeCacheRepairs: 0, toastCompatibility: false, toastFallbacks: 0, oauthResolution: null, badgeHooks: 0, alertStoreGuard: false, translationChildren: 0, composerStyles: 0, composerRows: 0, compatibilityAlertsSuppressed: 0, profileExports: 0, profileCalls: 0, profileStyles: 0, profileNavStyles: 0, youBarTokens: 0, sidebarExports: 0, sidebarCalls: 0, jsxCalls: 0, rainHook: false, factories: 0, tokens: 0, guilds: 0, buttons: 0, errors: [], installed: false};
  var seen = new WeakSet(), wrapped = new WeakSet();
  var settingsReact=null, nativeComposerView=null;
  function PatcherCreditRow(p) {
    var metro=g.rain && g.rain.metro;
    var pair=settingsReact.useState(null);
    settingsReact.useEffect(function(){
      var mounted=true;
      try {
        var store=metro.findByStoreName('UserStore');
        var cached=store && store.getUser('497099669432827904');
        if(cached)pair[1](cached);
        var users=metro.findByProps('getUser','fetchProfile');
        if(users && typeof users.getUser==='function') {
          Promise.resolve(users.getUser('497099669432827904')).then(function(result){
            if(mounted)pair[1]((store && store.getUser('497099669432827904')) || (result && result.body) || result || cached);
          }).catch(function(){});
        }
      }catch(e){error(e);}
      return function(){mounted=false;};
    },[]);
    var user=pair[0], icon;
    if(user && user.avatar) {
      try {
        var native=metro.findByProps('Image','View');
        if(native && native.Image)icon=settingsReact.createElement(native.Image,{source:{uri:'https://cdn.discordapp.com/avatars/497099669432827904/'+user.avatar+'.png'},style:{width:48,height:48,borderRadius:8}});
      }catch(e){error(e);}
    }
    return settingsReact.createElement(p.rowType,{label:'mahoroba',subLabel:'Rain Patcher',icon:icon,arrow:true,onPress:function(){
      try {
        var profile=metro.findByName('showUserProfileActionSheet');
        if(typeof profile==='function')profile({userId:'497099669432827904'});
        else if(profile && typeof profile.default==='function')profile.default({userId:'497099669432827904'});
        else error('Profile sheet unavailable');
      }catch(e){error(e);}
    }});
  }
  function ShakeMenuRow(p) {
    var bridge=g.__RAIN_BROWSER_LOGIN__;
    var pair=settingsReact.useState(function(){return bridge('shakeMenu')==='1';});
    return settingsReact.createElement(p.rowType,{label:'Shake to open Recovery Menu',value:pair[0],
      onValueChange:function(value){bridge('shakeMenu',value?'1':'0');pair[1](value);}});
  }

  // Leave chat composer and input-field tokens at Discord's own values.
  var legacy = {GUILD_ITEM_SELECTED_BORDER_RADIUS:16, TABLE_ROW_BORDER_RADIUS:16,
    CARD_DEFAULT_RADIUS:16, YOU_BAR_BORDER_RADIUS:999, INPUT_FIELD_RADIUS_SM:16, INPUT_FIELD_RADIUS_MD:16, INPUT_FIELD_RADIUS_LG:16, CHAT_INPUT_FLOATING_BORDER_RADIUS:24, MEDIA_KEYBOARD_BUTTON_BORDER_RADIUS:999, GUILD_BAR_ITEM_MARGIN:4, CHANNEL_ITEM_RADIUS:999};
  function error(e) { if (state.errors.length < 12) state.errors.push(String(e)); }
  function put(o, k, value) {
    try {
      var d = Object.getOwnPropertyDescriptor(o,k);
      if (!d || d.writable) { o[k] = value; return o[k] === value; }
      if (d.configurable) { Object.defineProperty(o,k,{value:value,writable:true,configurable:true,enumerable:d.enumerable}); return true; }
    } catch(e) {error(e);}
    return false;
  }
  function token(o,k,n) {
    var d = Object.getOwnPropertyDescriptor(o,k);
    if (!d || !('value' in d)) return;
    var v=d.value;
    if (typeof v === 'number') { if (put(o,k,n)) state.tokens++; }
    else if (v && typeof v.resolve === 'function') {
      var descriptors=Object.getOwnPropertyDescriptors(v);
      descriptors.resolve={value:function(){return n;},writable:true,configurable:true,enumerable:true};
      var replacement=Object.create(Object.getPrototypeOf(v),descriptors);
      if (put(o,k,replacement)) state.tokens++;
    }
  }
  function isReactExports(o) {
    // Translation proxies manufacture functions for arbitrary property reads.
    // Check own data descriptors before reading/calling any React API.
    var names=['createElement','useState','isValidElement'];
    var version=Object.getOwnPropertyDescriptor(o,'version');
    if(!version || typeof version.value!=='string' || !/^\d+\.\d+\./.test(version.value))return false;
    return names.every(function(name){var d=Object.getOwnPropertyDescriptor(o,name);return d && typeof d.value==='function';});
  }
  function componentName(t) { return typeof t === 'function' ? (t.displayName || t.name || '') : t && (t.displayName || (t.render && (t.render.displayName || t.render.name))) || ''; }
  // Discord's newer Messages values are {locale, ast} rather than strings.
  // Only normalize that exact message shape in React children.
  var renderDiag=g.__RAIN_RENDER_DIAG__=g.__RAIN_RENDER_DIAG__ || {version:58,messages:[],replacements:[],messageCount:0,replacementCount:0};
  function recordMessage(value,component,depth) {
    if(depth>20)return;
    if(Array.isArray(value)){value.forEach(function(item){recordMessage(item,component,depth+1);});return;}
    if(value && value.$$typeof && value.props){recordMessage(value.props.children,component,depth+1);return;}
    if(!value || typeof value!=='object' || !('locale' in value) || !('ast' in value))return;
    renderDiag.messageCount++;
    var ast=value.ast;
    var sample={component:component,localeType:typeof value.locale,locale:typeof value.locale==='string'?value.locale:null,
      astType:typeof ast,astArray:Array.isArray(ast),keys:Object.keys(value),nodes:Array.isArray(ast)?ast.slice(0,8).map(function(part){
        if(typeof part==='string')return {kind:'literal',text:part.slice(0,160)};
        if(Array.isArray(part))return {kind:'tuple',type:part[0],size:part.length};
        if(part && typeof part==='object')return {kind:'node',type:part.type,keys:Object.keys(part),literal:part.type===0?String(part.value).slice(0,160):undefined};
        return {kind:typeof part};
      }):null};
    var key=JSON.stringify(sample);
    if(renderDiag.messages.some(function(item){return JSON.stringify(item)===key;}))return;
    if(renderDiag.messages.length>=12)renderDiag.messages.shift();renderDiag.messages.push(sample);
  }
  g.__RAIN_RECORD_CHILDREN__=recordMessage;
  function messageChild(value) {
    if(Array.isArray(value)) {
      var changed=false, result=value.map(function(item){var next=messageChild(item);if(next!==item)changed=true;return next;});
      return changed?result:value;
    }
    if(!value || typeof value!=='object' || value.$$typeof || typeof value.locale!=='string' || !Array.isArray(value.ast))return value;
    var keys=Object.keys(value);
    if(keys.length!==2 || keys.indexOf('locale')<0 || keys.indexOf('ast')<0)return value;
    if(value.ast.every(function(part){return typeof part==='string' || (part && part.type===0 && typeof part.value==='string') || (Array.isArray(part) && part.length===2 && part[0]===0 && typeof part[1]==='string');})) {
      state.translationChildren++;
      return value.ast.map(function(part){return typeof part==='string'?part:Array.isArray(part)?part[1]:part.value;}).join('');
    }
    // Rich/plural/argument messages need their caller's formatting arguments.
    // Keep those untouched rather than guessing or dropping their content.
    return value;
  }
  function flatStyle(style) {
    if(Array.isArray(style))return style.reduce(function(result,item){return Object.assign(result,flatStyle(item));},{});
    if(style && typeof style==='object')return style;
    return {};
  }
  function changedElement(element,props) {
    return Object.assign({},element,{props:Object.assign({},element.props,props)});
  }
  // v348 ChatInput: responder box -> [reply, suggestions, four-part row].
  // Match native layout callbacks and the input wrapper, not component names.
  function composerProps(p) {
    if(!nativeComposerView && g.rain && g.rain.metro) {
      try {var rn=g.rain.metro.findByProps('AppRegistry');if(rn && rn.View)nativeComposerView=rn.View;}catch(e){}
    }
    if(!nativeComposerView)return p;
    if(!settingsReact || p.collapsable!==false || typeof p.onStartShouldSetResponder!=='function' ||
       typeof p.onResponderRelease!=='function' || typeof p.onLayout!=='function' ||
       !Array.isArray(p.children) || p.children.length!==3)return p;
    var row=p.children[2], parts=row && row.props && row.props.children;
    if(!Array.isArray(parts) || parts.length!==4 || !parts[1] || !parts[1].props)return p;
    var inputStyle=flatStyle(parts[1].props.style), rowStyle=flatStyle(row.props.style);
    if(inputStyle.flex!==1 || inputStyle.justifyContent!=='center' ||
       rowStyle.flexDirection!=='row' || rowStyle.alignItems!=='flex-end')return p;
    var outer=flatStyle(p.style), background=outer.backgroundColor;
    if(background===undefined)return p;
    var input=changedElement(parts[1],{style:[parts[1].props.style,{marginLeft:0,minWidth:0,paddingBottom:0,position:'relative',top:-1}]});
    var actions=parts[2] && changedElement(parts[2],{style:[parts[2].props.style,{paddingBottom:0}]});
    var center=settingsReact.createElement(nativeComposerView,{key:'rain-composer-center',
      style:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',backgroundColor:background,borderRadius:24,overflow:'hidden',minHeight:40,paddingHorizontal:8,paddingVertical:0},children:[input,actions]});
    var attach=parts[0] && changedElement(parts[0],{style:[parts[0].props.style,
      {width:40,height:40,paddingLeft:0,paddingBottom:0,alignItems:'center',justifyContent:'center',backgroundColor:background,borderRadius:20}]});
    // Give mic/send the same circular backing as attach; preserve the native
    // component and its ref/gesture handlers inside a non-interactive View.
    var send=parts[3] && settingsReact.createElement(nativeComposerView,{key:'rain-composer-send',
      style:{width:40,height:40,alignItems:'center',justifyContent:'center',backgroundColor:background,borderRadius:20,overflow:'visible'},children:parts[3]});
    var restoredRow=changedElement(row,{style:[row.props.style,{paddingHorizontal:0,paddingVertical:0,gap:8}],children:[attach,center,send]});
    state.composerRows++;
    return Object.assign({},p,{style:[p.style,{backgroundColor:'transparent',borderWidth:0,borderRadius:0,overflow:'visible'}],children:[p.children[0],p.children[1],restoredRow]});
  }
  function propsFor(t,p) {
    if (!p || typeof p !== 'object') return p;
    state.jsxCalls++;
    p=composerProps(p);
    if(p.title==='Developers' && settingsReact && typeof settingsReact.useEffect==='function' && Array.isArray(p.children)) {
      var credits=p.children;
      if(credits.length===1 && Array.isArray(credits[0]))credits=credits[0];
      var template=credits.find(function(row){return row && row.props && typeof row.props.onPress==='function' && typeof row.props.subLabel==='string';});
      if(template && !credits.some(function(row){return row && (row.key==='rain-patcher-mahoroba' || (row.props && row.props.label==='mahoroba'));})) {
        p=Object.assign({},p,{children:credits.concat([settingsReact.createElement(PatcherCreditRow,{key:'rain-patcher-mahoroba',rowType:template.type})])});
      }
    }
    // Exact group from Rain General: Reload App, Safe Mode, Developer Settings.
    if(settingsReact && typeof g.__RAIN_BROWSER_LOGIN__==='function' && Array.isArray(p.children) && p.children.length===3) {
      var rows=p.children;
      if(rows[0] && rows[0].props && rows[0].props.label==='Reload App' &&
         rows[1] && rows[1].props && typeof rows[1].props.onValueChange==='function' &&
         rows[2] && rows[2].props && typeof rows[2].props.onValueChange==='function') {
        var added=settingsReact.createElement(ShakeMenuRow,{key:'rain-shake-menu-toggle',rowType:rows[1].type});
        p=Object.assign({},p,{children:rows.concat([added])});
      }
    }
    if(Object.prototype.hasOwnProperty.call(p,'children')) {
      var normalized=messageChild(p.children);
      if(normalized!==p.children)p=Object.assign({},p,{children:normalized});
    }
    if(Object.prototype.hasOwnProperty.call(p,'onPressExpression') &&
       Object.prototype.hasOwnProperty.call(p,'shouldShowGiftButton') &&
       Object.prototype.hasOwnProperty.call(p,'keyboardType'))
      return Object.assign({},p,{shouldShowGiftButton:false});
    if(Object.prototype.hasOwnProperty.call(p,'photosButtonExternalRef') &&
       Object.prototype.hasOwnProperty.call(p,'onAttachPress') &&
       Object.prototype.hasOwnProperty.call(p,'onPollsPress'))
      return Object.assign({},p,{canStartThreads:false,isAppLauncherEnabled:false});
    if(t && (typeof t==='object' || typeof t==='function') && sidebarTypes.has(t))return sidebarProps(p);
    var name=componentName(t);
    if (/^(SimpleGuildContainer|GuildIconInner|GuildIcon|GuildIconPile)$/.test(name) ||
        (Object.prototype.hasOwnProperty.call(p,'guildIconRef') && Object.prototype.hasOwnProperty.call(p,'guildId'))) {
      var size=typeof p.size === 'number' ? p.size : 48;
      state.guilds++;
      return Object.assign({},p,{borderRadius:size/2,style:[p.style,{borderRadius:size/2,overflow:'hidden'}]});
    }
    return p;
  }
  function jsx(o,k) {
    if (typeof o[k] !== 'function' || wrapped.has(o[k])) return;
    var original=o[k];
    function next(t,p) { var a=Array.prototype.slice.call(arguments);a[1]=propsFor(t,p);if(k==='createElement')for(var i=2;i<a.length;i++){a[i]=messageChild(a[i]);}var result=original.apply(this,a);return result; }
    if (put(o,k,next)) wrapped.add(next);
  }
  var sidebarTypes=new WeakSet();
  function sidebarProps(p) {
    if(!p || typeof p!=='object')return p;
    state.sidebarCalls++;
    // This wrapper calculates its Reanimated corner radius from circle.
    // Keep all styles, children, drag config and badge cutouts untouched.
    return Object.assign({},p,{circle:true});
  }
  function sidebarExport(o) {
    if(typeof o.useGuildsBarAnimatedWrapperStyles!=='function' ||
       typeof o.UnreadIndicator!=='function')return;
    var d=Object.getOwnPropertyDescriptor(o,'default');
    if(!d || typeof d.value!=='function' || wrapped.has(d.value))return;
    var original=d.value;sidebarTypes.add(original);
    function sidebar(p) {
      var args=Array.prototype.slice.call(arguments);args[0]=sidebarProps(p);
      return original.apply(this,args);
    }
    if(put(o,'default',sidebar)) {
      wrapped.add(sidebar);sidebarTypes.add(sidebar);state.sidebarExports++;
    }
  }
  // These style signatures belong to UserProfileSharedStyles and
  // YouBannerDecorations (the floating Quests/Shop/Settings navigation).
  // Change their own styles before createStyles resolves/registers them.
  function profileStyles(styles) {
    if(!styles || typeof styles!=='object')return styles;
    if(styles.floatingMainContents && styles.floatingInputBox && styles.inputFlat &&
       styles.floatingScrimOverlap && styles.floatingInputBoxPressed) {
      // Preserve Discord's composer structure and layout. Reparenting its
      // controlled input after auth reload can break native attachment/layout.
      state.composerStyles++;
      return Object.assign({},styles,{
        floatingInputBox:Object.assign({},styles.floatingInputBox,{borderRadius:24}),
        floatingInputBoxPressed:Object.assign({},styles.floatingInputBoxPressed,{borderRadius:24})
      });
    }
    // v348 ChatInputActionButton's exact four-style signature.
    if(styles.actionButton && styles.actionButtonIcon && styles.actionButtonIconActive && styles.actionButtonIconDisabled) {
      return Object.assign({},styles,{actionButton:Object.assign({},styles.actionButton,{borderRadius:999})});
    }
    if(styles.card && styles.cards && styles.profileContentWrapper && styles.customStatusBubbleInset) {
      state.profileStyles++;
      return Object.assign({},styles,{card:Object.assign({},styles.card,{borderRadius:24})});
    }
    if(styles.containerFloating && styles.containerFloatingWrap &&
       styles.containerFloatingGradient && styles.buttonsFloating && styles.loading) {
      state.profileNavStyles++;
      return Object.assign({},styles,{containerFloating:Object.assign({},styles.containerFloating,{borderRadius:999})});
    }
    return styles;
  }
  function profileExports(o) {
    var stylesDescriptor=Object.getOwnPropertyDescriptor(o,'createStyles');
    if(stylesDescriptor && typeof stylesDescriptor.value==='function' && !wrapped.has(stylesDescriptor.value)) {
      var createStyles=stylesDescriptor.value;
      function create() {
        var args=Array.prototype.slice.call(arguments),definition=args[0];
        function prepare(value) { return profileStyles(value); }
        if(typeof definition==='function') {
          args[0]=function(){return prepare(definition.apply(this,arguments));};
        } else args[0]=prepare(definition);
        return createStyles.apply(this,args);
      }
      if(put(o,'createStyles',create))wrapped.add(create);
    }
    var radiusDescriptor=Object.getOwnPropertyDescriptor(o,'useUserProfileCardRadius');
    if(radiusDescriptor && typeof radiusDescriptor.value==='function' && !wrapped.has(radiusDescriptor.value)) {
      var radius=radiusDescriptor.value;
      function cardRadius() {
        // Always run the original hook to preserve React's hook ordering.
        var value=radius.apply(this,arguments);state.profileCalls++;
        if(typeof value==='number')return 24;
        if(value && typeof value.resolve==='function') {
          var holder={value:value};token(holder,'value',24);return holder.value;
        }
        return value;
      }
      if(put(o,'useUserProfileCardRadius',cardRadius)){wrapped.add(cardRadius);state.profileExports++;}
    }
    // UserProfileCard forwards style to its outer card. Identifying it by
    // its two named exports also works when the default has no function name.
    if(typeof o.UserProfileFormRow==='function' && typeof o.UserProfileCardRows==='function') {
      var d=Object.getOwnPropertyDescriptor(o,'default');
      if(d && typeof d.value==='function' && !wrapped.has(d.value)) {
        var original=d.value;
        function card(p) {
          var args=Array.prototype.slice.call(arguments);
          if(p && typeof p==='object') {
            args[0]=Object.assign({},p,{style:[p.style,{borderRadius:24}]});state.profileCalls++;
          }
          return original.apply(this,args);
        }
        if(put(o,'default',card)){wrapped.add(card);state.profileExports++;}
      }
    }
  }
  function oauthComponent(value) {
    var component=value && (value.default || value);
    return component && (typeof component==='function' || (typeof component==='object' && component.$$typeof))?component:null;
  }
  function resolveOAuth(metro) {
    var path='modules/oauth2/native/OAuth2AuthorizeModal.tsx',component=null;
    try {component=oauthComponent(metro && metro.findByFilePath(path,true));}catch(_){}
    if(component){state.oauthResolution='rain-path';return component;}
    // Bypass Rain's persisted NOT_FOUND index. Only require annotated matches.
    var modules=g.modules || {};
    var ids=Object.getOwnPropertyNames(modules);
    for(var i=0;i<ids.length;i++) {
      var entry=modules[ids[i]];
      if(entry && entry.__filePath===path) {
        var exports=entry.publicModule && entry.publicModule.exports;
        if(!entry.isInitialized && typeof g.__r==='function')exports=g.__r(Number(ids[i]));
        component=oauthComponent(exports);
        if(component){state.oauthResolution='registry-path';return component;}
      }
    }
    // Verified against the supplied 348.0 Hermes bundle: Metro ID 8491,
    // dependency map of OAuth2AuthorizeModal.tsx (function #8492).
    var debug=g.rain && g.rain.api && g.rain.api.debug;
    var info=debug && typeof debug.getDebugInfo==='function' && debug.getDebugInfo();
    if(!info || !info.discord || !/^348(?:\.|$)/.test(String(info.discord.version)))return null;
    var target=modules[8491];
    if(!target || target.hasError || (target.__filePath && target.__filePath!==path))return null;
    var dependencies=[19,17,21,4833,589,559,577,8492,4612,4170,5281,1128,8723,5940,5436,4829,8725,6531,2];
    if(target.dependencyMap && (target.dependencyMap.length!==dependencies.length ||
       !dependencies.every(function(id,index){return target.dependencyMap[index]===id;})))return null;
    var value=target.publicModule && target.publicModule.exports;
    if(typeof g.__r==='function')value=g.__r(8491);
    component=oauthComponent(value);
    if(component)state.oauthResolution='verified-348-module';
    return component;
  }
  function installToastCompatibility(rain) {
    if(state.toastCompatibility)return;
    var metro=rain && rain.metro, lazy=metro && metro.lazy;
    if(!lazy || typeof lazy.getLazyContext!=='function' || !metro.common)return;
    var context=lazy.getLazyContext(metro.common.toasts);
    if(!context || typeof context.forceLoad!=='function')return;
    var original=context.forceLoad;
    context.forceLoad=function() {
      try {return original.apply(this,arguments);}
      catch(originalError) {
        var debug=rain.api && rain.api.debug;
        var info=debug && typeof debug.getDebugInfo==='function' && debug.getDebugInfo();
        if(!info || !info.discord || !/^348(?:\.|$)/.test(String(info.discord.version)))throw originalError;
        var entry=g.modules && g.modules[4131];
        if(!entry || entry.hasError || (entry.__filePath && entry.__filePath!=='modules/toast/native/ToastActionCreators.tsx'))throw originalError;
        if(entry.dependencyMap && (entry.dependencyMap.length!==2 || entry.dependencyMap[0]!==586 || entry.dependencyMap[1]!==2))throw originalError;
        var exports=entry.publicModule && entry.publicModule.exports;
        if(typeof g.__r==='function')exports=g.__r(4131);
        var actions=exports && exports.default;
        if(!actions || typeof actions.open!=='function' || typeof actions.close!=='function')throw originalError;
        state.toastFallbacks++;
        return actions;
      }
    };
    state.toastCompatibility=true;
    if(rain.unload && typeof rain.unload.push==='function')rain.unload.push(function(){context.forceLoad=original;});
  }
  var alertStores=new WeakSet();
  function installAlertGuard(o) {
    if(!o || typeof o.dismissAlert!=='function' || !o.useAlertStore)return;
    var store=o.useAlertStore;
    if(typeof store.getState!=='function' || typeof store.subscribe!=='function' || alertStores.has(store))return;
    var busy=false;
    function removeVersionAlert() {
      if(busy)return;
      var snapshot=store.getState(), alerts=snapshot && snapshot.alerts;
      if(!Array.isArray(alerts) || !alerts.some(function(alert){return alert && alert.key==='incompatible-version-alert';}))return;
      busy=true;
      try {o.dismissAlert('incompatible-version-alert');state.compatibilityAlertsSuppressed++;}
      finally {busy=false;}
    }
    var unsubscribe=store.subscribe(removeVersionAlert);
    alertStores.add(store);state.alertStoreGuard=true;
    removeVersionAlert();
    var rain=g.rain;
    if(rain && rain.unload && typeof rain.unload.push==='function')rain.unload.push(unsubscribe);
  }
  function badgeHookCompatibility(o) {
    // Actual v348 useBadges.tsx exports this constant alongside its default.
    // Restore the lookup name without wrapping or replacing the React hook.
    if(o.QUEST_COMPLETED_BADGE!=='quest_completed')return;
    var d=Object.getOwnPropertyDescriptor(o,'default');
    if(!d || typeof d.value!=='function' || d.value.name==='useBadges')return;
    var name=Object.getOwnPropertyDescriptor(d.value,'name');
    if(name && name.configurable) {
      Object.defineProperty(d.value,'name',Object.assign({},name,{value:'useBadges'}));
      state.badgeHooks++;
    }
  }
  var badgeImageCallbacks=Object.create(null);
  var originalMapSet=Map.prototype.set;
  function registerBadgeCallbacks(key,value) {
    var result=originalMapSet.call(this,key,value);
    if((key==='ProfileBadge' || key==='RenderBadge' || key==='RenderedBadge') && Array.isArray(value))
      badgeImageCallbacks[key]=value;
    return result;
  }
  // These callback arrays are Rain's existing plugin registry. Keep references
  // so later enabled/disabled plugins update the same arrays normally.
  put(Map.prototype,'set',registerBadgeCallbacks);
  function customBadgeSource(badge) {
    if(!badge || typeof badge.id!=='string' || !/^(gb-|rain-)/.test(badge.id))return;
    var ret={props:Object.assign({},badge)};
    ['ProfileBadge','RenderBadge','RenderedBadge'].forEach(function(name){
      var callbacks=badgeImageCallbacks[name] || [];
      callbacks.forEach(function(callback){
        if(typeof callback!=='function')return;
        try {var next=callback(null,ret);if(next && next.props)ret=next;}catch(e){error(e);}
      });
    });
    var source=ret.props.source;
    return source && typeof source.uri==='string' && /^(https?:|data:image\/)/.test(source.uri) ? source.uri : undefined;
  }
  function badgeImageCompatibility(o) {
    if(typeof o.getProfileBadgeIconUrl!=='function' || typeof o.getProfileBadgeLabel!=='function' ||
       typeof o.isPinnedBadge!=='function' || wrapped.has(o.getProfileBadgeIconUrl))return;
    var original=o.getProfileBadgeIconUrl;
    function icon(badge) {
      var uri=customBadgeSource(badge);
      if(uri){state.badgeImages++;return uri;}
      if(badge && typeof badge.id==='string' && /^(gb-|rain-)/.test(badge.id))state.badgeImageMisses++;
      return original.apply(this,arguments);
    }
    if(put(o,'getProfileBadgeIconUrl',icon))wrapped.add(icon);
  }
  var repairedBadgeContexts=new WeakSet();
  function repairBadgeContext(context) {
    if(!context || typeof context!=='object' || repairedBadgeContexts.has(context))return;
    var descriptor=Object.getOwnPropertyDescriptor(context,'filter');
    if(!descriptor || !('value' in descriptor) || !descriptor.value)return;
    var key=descriptor.value.uniq;
    if(key!=='raw::rain.metro.byName(useBadges)' && key!=='rain.metro.byName(useBadges)')return;
    if(typeof context.forceLoad!=='function' || typeof context.getExports!=='function')return;
      var original=context.forceLoad;
      context.forceLoad=function() {
        // Resolve by the native export signature, regardless of cached names or
        // names of functions wrapped by another badge plugin. Return the same
        // module object so all plugins still patch the shared native hook.
        var modules=g.modules || {},found;
        Object.keys(modules).some(function(id){
          var m=modules[id],e=m && !m.hasError && m.isInitialized && m.publicModule && m.publicModule.exports;
          if(e && e.QUEST_COMPLETED_BADGE==='quest_completed' && typeof e.default==='function'){found=e;return true;}
          return false;
        });
        // v348's hook may not be initialized yet. Require its verified module
        // before falling back to Rain's name/cache-dependent search.
        if(!found && typeof g.__r==='function') {
          var nativeModule=modules[7675],version;
          try {version=g.rain.api.debug.getDebugInfo().discord.version;}catch(_){}
          if(nativeModule && !nativeModule.hasError &&
             (!nativeModule.__filePath || nativeModule.__filePath==='modules/user_profile/hooks/useBadges.tsx') &&
             (/^348(?:\.|$)/.test(String(version)) || nativeModule.__filePath==='modules/user_profile/hooks/useBadges.tsx')) {
            var loaded=g.__r(7675);
            if(loaded && loaded.QUEST_COMPLETED_BADGE==='quest_completed' && typeof loaded.default==='function') {
              found=loaded;state.badgeResolution='native-348-7675';
            }
          }
        }
        if(!found && g.rain && g.rain.metro && typeof g.rain.metro.findByProps==='function') {
          var candidate=g.rain.metro.findByProps('QUEST_COMPLETED_BADGE');
          if(candidate && candidate.QUEST_COMPLETED_BADGE==='quest_completed' && typeof candidate.default==='function')found=candidate;
        }
        if(found){state.badgeResolution=state.badgeResolution || 'native-export-signature';state.badgeLazyRepairs++;return key.indexOf('raw::')===0 ? found : found.default;}
        return original.apply(this,arguments);
      };
      // Stale indexes must not send patcher subscriptions to an unrelated ID.
      context.indexed=false;
      context.getExports=function(callback){callback(context.forceLoad());return function(){};};
    repairedBadgeContexts.add(context);state.badgeContexts++;
  }
  g.__RAIN_BADGE_DIAG__=function(){
    var m=g.modules && g.modules[7675];
    console.log('Badge診断:',JSON.stringify({patch:state.version,contexts:state.badgeContexts,
      repairs:state.badgeLazyRepairs,resolution:state.badgeResolution,cacheRepairs:state.badgeCacheRepairs,
      images:state.badgeImages,imageMisses:state.badgeImageMisses,callbackGroups:Object.keys(badgeImageCallbacks),
      errors:state.errors,module:m?{initialized:m.isInitialized,hasError:m.hasError,path:m.__filePath,
      exports:Object.keys(m.publicModule && m.publicModule.exports || {})}:null}));
  };
  function badgeLazyCompatibility(o) {
    if(typeof o.createLazyModule!=='function' || typeof o.getLazyContext!=='function' || wrapped.has(o.createLazyModule))return;
    var create=o.createLazyModule;
    function compatibleLazy() {
      var proxy=create.apply(this,arguments);
      repairBadgeContext(o.getLazyContext(proxy));
      return proxy;
    }
    if(put(o,'createLazyModule',compatibleLazy))wrapped.add(compatibleLazy);
  }
  // Rain creates these contexts before publishing window.rain. Observe the
  // exact context registration during bootstrap, then restore WeakMap.set.
  var originalWeakMapSet=WeakMap.prototype.set;
  function registerLazyContext(key,value) {
    var result=originalWeakMapSet.call(this,key,value);
    try {repairBadgeContext(value);}catch(e){error(e);}
    return result;
  }
  put(WeakMap.prototype,'set',registerLazyContext);
  function restoreContextRegistration() {
    if(WeakMap.prototype.set===registerLazyContext)put(WeakMap.prototype,'set',originalWeakMapSet);
    if(Map.prototype.set===registerBadgeCallbacks)put(Map.prototype,'set',originalMapSet);
  }
  function badgeCacheCompatibility(o) {
    if(typeof o.readFile!=='function' || typeof o.writeFile!=='function' ||
       typeof o.fileExists!=='function' || typeof o.getConstants!=='function' || wrapped.has(o.readFile))return;
    var original=o.readFile;
    function read() {
      var args=Array.prototype.slice.call(arguments),result=original.apply(this,args);
      if(typeof args[0]!=='string' || !/\/rain\/caches\/metro_modules\.json$/.test(args[0]))return result;
      return Promise.resolve(result).then(function(text){
        if(typeof text!=='string')return text;
        try {
          var cache=JSON.parse(text),index=cache && cache.findIndex,changed=false;
          if(!index || typeof index!=='object')return text;
          ['raw::rain.metro.byName(useBadges)','rain.metro.byName(useBadges)'].forEach(function(key){
            if(Object.prototype.hasOwnProperty.call(index,key)){delete index[key];changed=true;}
          });
          if(changed){state.badgeCacheRepairs++;return JSON.stringify(cache);}
        }catch(_){}
        return text;
      });
    }
    if(put(o,'readFile',read))wrapped.add(read);
  }
  function visit(o,depth) {
    if (!o || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) return;
    seen.add(o);
    badgeImageCompatibility(o);
    badgeLazyCompatibility(o);
    badgeHookCompatibility(o);
    badgeCacheCompatibility(o);
    installAlertGuard(o);
    if(['AppRegistry','View','StyleSheet','Platform'].every(function(k){return !!Object.getOwnPropertyDescriptor(o,k);}) && o.AppRegistry && typeof o.AppRegistry==='object' && o.View)nativeComposerView=o.View;
    if(isReactExports(o))settingsReact=o;
    var modalDescriptor=Object.getOwnPropertyDescriptor(o,'pushModal');
    if(modalDescriptor && typeof modalDescriptor.value==='function' && !wrapped.has(modalDescriptor.value)) {
      var pushModal=modalDescriptor.value;
      function compatibleModal(options) {
        var args=Array.prototype.slice.call(arguments);
        if(options && options.key==='oauth2-authorize' && options.modal) {
          try {
            var metro=g.rain && g.rain.metro;
            var component=resolveOAuth(metro);
            if(component && (typeof component==='function' || (typeof component==='object' && component.$$typeof))) {
              args[0]=Object.assign({},options,{modal:Object.assign({},options.modal,{modal:component})});
            } else {
              error('Cloud Sync OAuth component unavailable');
              var native=metro && metro.findByProps('Alert','View');
              if(native && native.Alert)native.Alert.alert('Cloud Sync','Authorization UI is unavailable in this Discord version.');
              return;
            }
          }catch(e){error(e);return;}
        }
        return pushModal.apply(this,args);
      }
      if(put(o,'pushModal',compatibleModal))wrapped.add(compatibleModal);
    }
    sidebarExport(o);
    profileExports(o);
    // Rain's versionCheck uses this exact key for both version mismatch
    // prompts. Keep every other alert (including authentication) intact.
    var alertDescriptor=Object.getOwnPropertyDescriptor(o,'openAlert');
    if(alertDescriptor && typeof alertDescriptor.value==='function' &&
       typeof o.dismissAlert==='function' && !wrapped.has(alertDescriptor.value)) {
      var openAlert=alertDescriptor.value;
      function alert() {
        if(arguments[0]==='incompatible-version-alert') {
          state.compatibilityAlertsSuppressed++;return;
        }
        return openAlert.apply(this,arguments);
      }
      if(put(o,'openAlert',alert))wrapped.add(alert);
    }
    for (var k in legacy) {
      var previous=state.tokens;token(o,k,legacy[k]);
      if(k==='YOU_BAR_BORDER_RADIUS')state.youBarTokens+=state.tokens-previous;
    }
    // YouBar uses modules.mobile.YOU_BAR_BORDER_RADIUS for its pressable,
    // background and nameplate clipping. Target only this mobile token.
    var mobileDescriptor=Object.getOwnPropertyDescriptor(o,'mobile');
    if(mobileDescriptor && mobileDescriptor.value && typeof mobileDescriptor.value==='object') {
      var previous=state.tokens;token(mobileDescriptor.value,'YOU_BAR_BORDER_RADIUS',999);
      state.youBarTokens+=state.tokens-previous;
    }
    // In v348 getButtonBorderRadius reads modules.button.BORDER_RADIUS[_LG].
    var bd=Object.getOwnPropertyDescriptor(o,'button');
    if (bd && bd.value && (typeof bd.value==='object')) {
      token(bd.value,'BORDER_RADIUS',999);token(bd.value,'BORDER_RADIUS_LG',999);
    }
    if (typeof o.getButtonBorderRadius==='function') {
      var getRadius=o.getButtonBorderRadius;
      if (put(o,'getButtonBorderRadius',function(){
        var value=getRadius.apply(this,arguments);state.buttons++;
        if(typeof value==='number')return 999;
        if(value && typeof value.resolve==='function')return Object.assign({},value,{resolve:function(){return 999;}});
        return value;
      })) state.tokens++;
    }
    if (typeof o.jsx==='function' && typeof o.jsxs==='function') {jsx(o,'jsx');jsx(o,'jsxs');if(typeof o.jsxDEV==='function')jsx(o,'jsxDEV');}
    if (isReactExports(o)) jsx(o,'createElement');
    if (depth < 3) {
      // Do not invoke arbitrary module getters or walk entire application objects.
      ['default','modules','mobile','tokens','semantic','constants','radii','button'].forEach(function(k){
        var d=Object.getOwnPropertyDescriptor(o,k);if(d && 'value' in d)visit(d.value,depth+1);
      });
    }
  }
  // Rain's lazy runtime resolves the actual Discord JSX module after startup.
  function installRainHook() {
    var rain=g.rain, api=rain && rain.api;
    try {installToastCompatibility(rain);}catch(e){error(e);}
    try {
      if(rain && rain.metro && rain.metro.lazy) {
        var metroForBadges=rain.metro, nativeLazy=metroForBadges.lazy;
        badgeLazyCompatibility(nativeLazy);
        // Rain's bundled finder calls its lexical createLazyModule, so route
        // this one public finder through the compatibility wrapper explicitly.
        if(typeof metroForBadges.findByNameLazy==='function' && !wrapped.has(metroForBadges.findByNameLazy)) {
          var originalBadgeFinder=metroForBadges.findByNameLazy;
          function badgeFinder(name,exportDefault) {
            if(name==='useBadges' && metroForBadges.filters && metroForBadges.filters.byName) {
              var filter=exportDefault===false ? metroForBadges.filters.byName.byRaw(name) : metroForBadges.filters.byName(name);
              return nativeLazy.createLazyModule(filter);
            }
            return originalBadgeFinder.apply(this,arguments);
          }
          if(put(metroForBadges,'findByNameLazy',badgeFinder))wrapped.add(badgeFinder);
        }
      }
    }catch(e){error(e);}

    try {
      var metro=rain && rain.metro;
      if(metro && typeof metro.findByProps==='function') {
        installAlertGuard(metro.findByProps('useAlertStore','dismissAlert'));
        badgeImageCompatibility(metro.findByProps('getProfileBadgeIconUrl','getProfileBadgeLabel','isPinnedBadge') || {});
      }
    } catch(e){error(e);}
    var j=api && api.react && api.react.jsx;
    if(!j || !api.patcher || !j.jsxRuntime) return false;
    var target=j.jsxRuntime;
    var undo=[];
    try {
      ['jsx','jsxs'].forEach(function(k){
        undo.push(api.patcher.before(k,target,function(args){
          var next=Array.prototype.slice.call(args);
          next[1]=propsFor(next[0],next[1]);return next;
        }));
      });
      if(rain.unload && typeof rain.unload.push==='function')
        rain.unload.push(function(){undo.forEach(function(f){f();});});
      restoreContextRegistration();state.rainHook=true;return true;
    } catch(e) {undo.forEach(function(f){f();});error(e);return false;}
  }
  if(typeof g.setInterval==='function') {
    var rainAttempts=0;
    var rainTimer=g.setInterval(function(){
      if(installRainHook() || ++rainAttempts>=120){restoreContextRegistration();g.clearInterval(rainTimer);}
    },250);
  }
  function install() {
    var modules=g.modules;
    if (!modules) return false;
    Object.keys(modules).forEach(function(id){
      var m=modules[id];if(!m)return;
      if(m.isInitialized && m.publicModule) {try {visit(m.publicModule.exports,0);}catch(e){error(e);}}
      if(typeof m.factory==='function' && !wrapped.has(m.factory)) {
        var original=m.factory;
        function factory() {
          // Original exceptions must retain their original behavior.
          var result=original.apply(this,arguments);
          try {if(arguments[4])visit(arguments[4].exports,0);}catch(e){error(e);}
          return result;
        }
        if(put(m,'factory',factory)){wrapped.add(factory);state.factories++;}
      }
    });
    state.installed=true;return true;
  }
  try {
    if(!install() && typeof g.setInterval==='function') {
      var attempts=0;var timer=g.setInterval(function(){try{if(install() || ++attempts>=100)g.clearInterval(timer);}catch(e){error(e);g.clearInterval(timer);}},50);
    }
  } catch(e) {error(e);}
})();
