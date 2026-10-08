(function(g){
  if(g.__RAIN_STARTUP_DIAG__)return;
  var state=g.__RAIN_STARTUP_DIAG__={version:58,phase:'before-rain',errors:[]};
  function text(value){
    if(value && typeof value==='object')return String(value.stack || value.message || value);
    return String(value);
  }
  state.capture=function(error,source){
    var detail=text(error);
    if(state.errors.length>=16)return;
    var entry={source:source || state.phase,detail:detail};
    state.errors.push(entry);
    try {
      if(typeof g.__RAIN_BRIDGE_CALL_SYNC__==='function')
        g.__RAIN_BRIDGE_CALL_SYNC__({rain:{method:'startup.capture',args:[JSON.stringify({version:58,phase:state.phase,source:entry.source,errors:state.errors,render:g.__RAIN_RENDER_DIAG__,ui:g.__RAIN_ROUNDED_UI__?{version:g.__RAIN_ROUNDED_UI__.version,composerRows:g.__RAIN_ROUNDED_UI__.composerRows,rainHook:g.__RAIN_ROUNDED_UI__.rainHook}:null})]}});
    }catch(_){}
  };
  if(g.ErrorUtils && typeof g.ErrorUtils.getGlobalHandler==='function' && typeof g.ErrorUtils.setGlobalHandler==='function'){
    var originalHandler=g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler(function(error,fatal){
      state.capture(error,'ErrorUtils');
      return originalHandler.apply(this,arguments);
    });
  }
  var original=g.console && g.console.error;
  if(typeof original==='function')g.console.error=function(){
    for(var i=0;i<arguments.length;i++){
      var value=arguments[i];
      if(value && typeof value==='object' && (value.stack || value.message))state.capture(value,'console.error');
      else if(typeof value==='string' && /Cannot convert undefined value to object/.test(value))state.capture(value,'console.error');
    }
    return original.apply(this,arguments);
  };
})(globalThis);
