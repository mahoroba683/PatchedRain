#import <Foundation/Foundation.h>
#import <MediaPlayer/MediaPlayer.h>
#import <UIKit/UIKit.h>
#import <jsi/jsi.h>
#import <functional>
#import <unistd.h>

#import "LoaderConfig.h"
#import "Logger.h"
#import "Utils.h"
#import "JSI.h"
#import "RCTHost.h"
#import "RCTInstance.h"
#import "Fonts.h"
#import "Settings.h"
#import "BrowserLogin.h"
#import "NativePlatforms.h"

using namespace facebook;

static jsi::Runtime *gRuntime = NULL;
NSString *bunnyPatchesBundlePath;
static LoaderConfig  *loaderConfig;
static NSTimeInterval shakeStartTime = 0;
static BOOL           isShaking      = NO;

static NSURL *resolveDownloadURL(void)
{
    LoaderConfig *fresh = [LoaderConfig getLoaderConfig];
    if (fresh.customLoadUrlEnabled && fresh.customLoadUrl)
    {
        return fresh.customLoadUrl;
    }
    return [NSURL URLWithString:@"https://codeberg.org/raincord/rain/releases/download/latest/rain.98.hbc"];
}

static dispatch_queue_t fsQueue(void)
{
    static dispatch_queue_t queue;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        queue = dispatch_queue_create("app.rain.fsQueue", DISPATCH_QUEUE_SERIAL);
    });
    return queue;
}

static void downloadBundleForNextLaunch(NSURL *rainDir)
{
    NSURL *bundleFileURL = [rainDir URLByAppendingPathComponent:@"bundle.js"];
    NSURL *targetURL = resolveDownloadURL();

    if (!targetURL) return;

    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:targetURL
                                                       cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                                   timeoutInterval:15.0];

    NSFileManager *fm = [NSFileManager defaultManager];
    NSURL *etagFileURL = [rainDir URLByAppendingPathComponent:@"etag.txt"];

    __block NSString *etag = nil;
    dispatch_sync(fsQueue(), ^{
        if ([fm fileExistsAtPath:bundleFileURL.path])
            etag = [NSString stringWithContentsOfURL:etagFileURL encoding:NSUTF8StringEncoding error:nil];
    });
    if (etag)
        [req setValue:etag forHTTPHeaderField:@"If-None-Match"];

    NSURLSession *session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
    [[session dataTaskWithRequest:req
                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if ([response isKindOfClass:[NSHTTPURLResponse class]])
        {
            NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
            if (http.statusCode == 200 && data.length > 0)
            {
                dispatch_sync(fsQueue(), ^{
                    [data writeToURL:bundleFileURL atomically:YES];
                    NSString *newEtag = [http valueForHTTPHeaderField:@"Etag"];
                    if (newEtag)
                        [newEtag writeToURL:etagFileURL atomically:YES encoding:NSUTF8StringEncoding error:nil];
                    else
                        [fm removeItemAtURL:etagFileURL error:nil];
                });
            }
        }
        else if (error)
        {
            BunnyLog(@"downloadBundleForNextLaunch: Error: %@", error.localizedDescription);
        }
        [session finishTasksAndInvalidate];
    }] resume];
}

typedef id (^BridgeHandler)(NSArray *args);

static void presentStartupError(NSString *detail, NSUInteger attempt)
{
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        UIViewController *controller = nil;
        for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
            if (![scene isKindOfClass:[UIWindowScene class]]) continue;
            for (UIWindow *window in ((UIWindowScene *)scene).windows) {
                if (window.isKeyWindow) { controller = window.rootViewController; break; }
            }
        }
        while (controller.presentedViewController) controller = controller.presentedViewController;
        if (!controller || !controller.view.window) {
            if (attempt < 20) presentStartupError(detail, attempt + 1);
            return;
        }
        UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"Rain 起動エラーの診断"
            message:@"起動中のエラーを記録しました。「ログをコピー」を押して、コピーした内容を送ってください。"
            preferredStyle:UIAlertControllerStyleAlert];
        [alert addAction:[UIAlertAction actionWithTitle:@"ログをコピー" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
            NSString *latest = [NSString stringWithContentsOfURL:[getRainDirectory() URLByAppendingPathComponent:@"startup-error.txt"] encoding:NSUTF8StringEncoding error:nil];
            UIPasteboard.generalPasteboard.string = latest ?: detail;
        }]];
        [alert addAction:[UIAlertAction actionWithTitle:@"閉じる" style:UIAlertActionStyleCancel handler:nil]];
        [controller presentViewController:alert animated:YES completion:nil];
    });
}

static NSDictionary<NSString *, BridgeHandler> *bridgeHandlers(void)
{
    static NSDictionary<NSString *, BridgeHandler> *handlers;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        handlers = @{
            @"startup.capture": ^id(NSArray *args) {
                if (!args.count || ![args[0] isKindOfClass:[NSString class]]) return @NO;
                NSString *detail = args[0];
                NSURL *path = [getRainDirectory() URLByAppendingPathComponent:@"startup-error.txt"];
                [detail writeToURL:path atomically:YES encoding:NSUTF8StringEncoding error:nil];
                static BOOL presented = NO;
                if (!presented) { presented = YES; presentStartupError(detail, 0); }
                return @YES;
            },
            @"applemusic.get": ^id(NSArray *args) {
                MPMediaLibraryAuthorizationStatus authorization = [MPMediaLibrary authorizationStatus];

                switch (authorization) {
                    case MPMediaLibraryAuthorizationStatusNotDetermined:
                        return @{
                            @"authorization": @"notDetermined"
                        };
                    case MPMediaLibraryAuthorizationStatusDenied:
                        return @{
                            @"authorization": @"denied"
                        };
                    case MPMediaLibraryAuthorizationStatusRestricted:
                        return @{
                            @"authorization": @"restricted"
                        };
                    case MPMediaLibraryAuthorizationStatusAuthorized: {
                        MPMusicPlayerController *player = [MPMusicPlayerController systemMusicPlayer];
                        MPMediaItem *song = player.nowPlayingItem;

                        if (player.playbackState == MPMusicPlaybackStatePlaying && song) {
                            return @{
                                @"authorization": @"authorized",
                                @"playing": @YES,
                                @"song": @{
                                    @"title": song.title,
                                    @"artist": song.artist,
                                    @"album": song.albumTitle,
                                    @"duration": @{
                                        @"elapsed": @(player.currentPlaybackTime),
                                        @"total": @(song.playbackDuration)
                                    }
                                }
                            };
                        } else {
                            return @{
                                @"authorization": @"authorized",
                                @"playing": @NO
                            };
                        }
                    }
                }
            },

            @"applemusic.request": ^id(NSArray *args) {
                [MPMediaLibrary requestAuthorization:^(MPMediaLibraryAuthorizationStatus status) {}];
                return [NSNull null];
            },

            @"updater.clear": ^id(NSArray *args) {
                NSURL *rainDirectory = getRainDirectory();
                NSFileManager *fm = [NSFileManager defaultManager];
                [fm removeItemAtURL:[rainDirectory URLByAppendingPathComponent:@"bundle.js"] error:nil];
                [fm removeItemAtURL:[rainDirectory URLByAppendingPathComponent:@"etag.txt"] error:nil];
                BunnyLog(@"[Updater] Cache cleared via JSI bridge");
                return [NSNull null];
            },

            @"updater.download": ^id(NSArray *args) {
                BunnyLog(@"[Updater] updater.download JSI bridge method called");
                dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                    NSURL *rainDirectory = getRainDirectory();
                    downloadBundleForNextLaunch(rainDirectory);
                });
                return [NSNull null];
            },

            @"updater.reload": ^id(NSArray *args) {
                dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                    BunnyLog(@"[Updater] Explicit JSI download + reload started");
                    NSURL *rainDirectory = getRainDirectory();
                    downloadBundleForNextLaunch(rainDirectory);
                    dispatch_async(dispatch_get_main_queue(), ^{
                        UIWindow *w = [UIApplication sharedApplication].windows.firstObject;
                        if (w.rootViewController) {
                            reloadApp(w.rootViewController);
                        }
                    });
                });
                return [NSNull null];
            }
        };
    });
    return handlers;
}

static NSDictionary *callBridgeMethodHelper(NSString *methodName, NSArray *args)
{
    @try {
        BridgeHandler handler = bridgeHandlers()[methodName];
        if (!handler)
        {
            return @{@"error": [NSString stringWithFormat:@"Method not implemented: %@", methodName]};
        }

        __block id handlerResult;
        dispatch_sync(fsQueue(), ^{
            handlerResult = handler(args);
        });

        id responseVal = (handlerResult == nil) ? [NSNull null] : handlerResult;
        return @{@"result": responseVal};
    }
    @catch (NSException *exception) {
        return @{@"error": exception.reason ?: @"Unknown Objective-C exception"};
    }
}

static void injectPreBundle(jsi::Runtime &runtime)
{
    try
    {
        RainBrowserLoginBridge(@"reset", nil);
        auto browserLogin = jsi::Function::createFromHostFunction(runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_BROWSER_LOGIN__"), 2,
            [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
                if (!count || !args[0].isString()) return jsi::Value::null();
                NSString *operation = [JSI toNSString:args[0] runtime:rt];
                NSString *value = count > 1 && args[1].isString() ? [JSI toNSString:args[1] runtime:rt] : nil;
                NSString *result = RainBrowserLoginBridge(operation, value);
                return result ? [JSI fromObjC:result runtime:rt] : jsi::Value::null();
            });
        runtime.global().setProperty(runtime, "__RAIN_BROWSER_LOGIN__", browserLogin);
        RainNativePlatformsBridge(@"enable", @"0");
        auto nativePlatforms = jsi::Function::createFromHostFunction(runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_NATIVE_PLATFORMS__"), 2,
            [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
                if (!count || !args[0].isString()) return jsi::Value::null();
                NSString *operation = [JSI toNSString:args[0] runtime:rt];
                NSString *value = count > 1 && args[1].isString() ? [JSI toNSString:args[1] runtime:rt] : nil;
                NSString *result = RainNativePlatformsBridge(operation, value);
                return result ? [JSI fromObjC:result runtime:rt] : jsi::Value::null();
            });
        runtime.global().setProperty(runtime, "__RAIN_NATIVE_PLATFORMS__", nativePlatforms);
        jsi::Object loaderObj(runtime);
        loaderObj.setProperty(runtime, "loaderName", jsi::String::createFromUtf8(runtime, "RainTweak"));
        loaderObj.setProperty(runtime, "loaderVersion", jsi::String::createFromUtf8(runtime, [PACKAGE_VERSION UTF8String]));
        loaderObj.setProperty(runtime, "hasThemeSupport", true);
        loaderObj.setProperty(runtime, "storedTheme", jsi::Value::null());
        loaderObj.setProperty(runtime, "fontPatch", 2);
        runtime.global().setProperty(runtime, "__RAIN_LOADER__", loaderObj);

        auto parsePayload = [](jsi::Runtime &rt, const jsi::Value *args, size_t count, NSString **methodOut, NSArray **argsOut) {
            if (count < 1 || !args[0].isObject()) {
                throw jsi::JSError(rt, "Expected a single payload object as argument.");
            }
            jsi::Object payload = args[0].asObject(rt);

            jsi::Value rainVal = payload.getProperty(rt, "rain");
            if (!rainVal.isObject()) throw jsi::JSError(rt, "Payload missing 'rain' object.");
            jsi::Object rain = rainVal.asObject(rt);

            jsi::Value methodVal = rain.getProperty(rt, "method");
            if (!methodVal.isString()) throw jsi::JSError(rt, "'method' property must be a string.");
            *methodOut = [JSI toNSString:methodVal runtime:rt];

            *argsOut = @[];
            jsi::Value argsVal = rain.getProperty(rt, "args");
            if (argsVal.isObject() && argsVal.asObject(rt).isArray(rt)) {
                *argsOut = [JSI toObjC:argsVal runtime:rt];
            }
        };

        auto syncCall = jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_BRIDGE_CALL_SYNC__"),
            1,
            [parsePayload](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) -> jsi::Value {
                NSString *methodName;
                NSArray *objcArgs;
                parsePayload(rt, args, count, &methodName, &objcArgs);

                NSDictionary *res = callBridgeMethodHelper(methodName, objcArgs);
                return [JSI fromObjC:res runtime:rt];
            }
        );
        runtime.global().setProperty(runtime, "__RAIN_BRIDGE_CALL_SYNC__", syncCall);

        auto asyncCall = jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_BRIDGE_CALL_ASYNC__"),
            1,
            [parsePayload](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) -> jsi::Value {
                NSString *methodName;
                NSArray *objcArgs;
                parsePayload(rt, args, count, &methodName, &objcArgs);

                jsi::Function promiseCtor = rt.global().getPropertyAsFunction(rt, "Promise");
                jsi::Function executor = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forUtf8(rt, "executor"), 2,
                    [methodName, objcArgs](jsi::Runtime &innerRt, const jsi::Value &thisVal, const jsi::Value *innerArgs, size_t innerCount) -> jsi::Value {
                        jsi::Function resolve = innerArgs[0].asObject(innerRt).asFunction(innerRt);
                        NSDictionary *res = callBridgeMethodHelper(methodName, objcArgs);
                        resolve.call(innerRt, [JSI fromObjC:res runtime:innerRt]);
                        return jsi::Value::undefined();
                    });
                return promiseCtor.callAsConstructor(rt, executor);
            }
        );
        runtime.global().setProperty(runtime, "__RAIN_BRIDGE_CALL_ASYNC__", asyncCall);

    }
    catch (const jsi::JSError &e) { BunnyLog(@"injectPreBundle: JSError: %s", e.what()); }
    catch (const std::exception &e) { BunnyLog(@"injectPreBundle: exception: %s", e.what()); }
}

static void executePreloads(jsi::Runtime &runtime, NSURL *rainDir)
{
    NSURL *preloadsDirectory = [rainDir URLByAppendingPathComponent:@"preloads"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:preloadsDirectory.path])
    {
        NSArray *contents = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:preloadsDirectory
                                                           includingPropertiesForKeys:nil options:0 error:nil];
        for (NSURL *fileURL in contents)
        {
            if ([[fileURL pathExtension] isEqualToString:@"js"])
            {
                NSData *data = [NSData dataWithContentsOfURL:fileURL];
                if (data) [JSI evaluate:data tag:@"rain:preload" runtime:runtime];
            }
        }
    }
}

%hook RCTHost

- (void)instance:(id)instance didInitializeRuntime:(facebook::jsi::Runtime &)runtime
{
    gRuntime = &runtime;
    %orig;

    [loaderConfig loadConfig];
    NSURL *rainDir = getRainDirectory();
    injectPreBundle(runtime);

    NSData *loginScript = [NSData dataWithContentsOfFile:[bunnyPatchesBundlePath stringByAppendingPathComponent:@"browser-login.js"]];
    if (loginScript.length) [JSI evaluate:loginScript tag:@"rain:browser-login" runtime:runtime];

    NSDictionary *discordInfo = @{
        @"version": [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: @"",
        @"build": [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: @""
    };
    NSData *discordJSON = [NSJSONSerialization dataWithJSONObject:discordInfo options:0 error:nil];
    if (discordJSON) {
        NSString *json = [[NSString alloc] initWithData:discordJSON encoding:NSUTF8StringEncoding];
        NSData *infoScript = [[NSString stringWithFormat:@"globalThis.__RAIN_DISCORD_INFO__ = %@;", json] dataUsingEncoding:NSUTF8StringEncoding];
        [JSI evaluate:infoScript tag:@"rain:discord-info" runtime:runtime];
    }

    // Install before Rain and application components consume Metro exports.
    NSString *roundedPath = [bunnyPatchesBundlePath stringByAppendingPathComponent:@"legacy-rounded-ui.js"];
    NSData *roundedScript = [NSData dataWithContentsOfFile:roundedPath];
    if (roundedScript.length > 0) {
        [JSI evaluate:roundedScript tag:@"rain:legacy-rounded-ui-v15" runtime:runtime];
    } else {
        BunnyLog(@"[RoundedUI] Missing legacy-rounded-ui.js resource");
    }

    NSData *startupScript = [NSData dataWithContentsOfFile:[bunnyPatchesBundlePath stringByAppendingPathComponent:@"startup-diagnostics.js"]];
    if (startupScript.length) [JSI evaluate:startupScript tag:@"rain:startup-diagnostics" runtime:runtime];

    NSURL *bundleFileURL = [rainDir URLByAppendingPathComponent:@"bundle.js"];
    // The patched client must run before any plugin captures its Metro finders.
    // Use the resource on every default launch; a downloaded stock client must
    // not silently replace this build's compatibility fixes.
    NSString *clientPath = [bunnyPatchesBundlePath stringByAppendingPathComponent:@"rain-client.js"];
    NSData *bundle = loaderConfig.customLoadUrlEnabled
        ? [NSData dataWithContentsOfURL:bundleFileURL]
        : [NSData dataWithContentsOfFile:clientPath];

    if (bundle && bundle.length > 0)
    {
        [JSI evaluate:bundle tag:@"rain:bundle" runtime:runtime];
        executePreloads(runtime, rainDir);
    }
    else
    {
        downloadBundleForNextLaunch(rainDir);
    }
}

%end

%hook UIWindow

- (void)motionBegan:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake && rainShakeMenuEnabled())
    {
        isShaking      = YES;
        shakeStartTime = [[NSDate date] timeIntervalSince1970];
    }
    %orig;
}

- (void)motionEnded:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake && isShaking)
    {
        NSTimeInterval shakeDuration = [[NSDate date] timeIntervalSince1970] - shakeStartTime;
        if (rainShakeMenuEnabled() && shakeDuration >= 0.5 && shakeDuration <= 2.0)
            dispatch_async(dispatch_get_main_queue(), ^{ showSettingsSheet(); });
        isShaking = NO;
    }
    %orig;
}

%end

%ctor
{
    @autoreleasepool
    {
        BOOL newArchEnabled = YES;
        @try {
            id rawVal = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"RCTNewArchEnabled"];
            if (rawVal) newArchEnabled = [rawVal boolValue];
        }
        @catch (...) {
        }

        if (!newArchEnabled)
        {
            dispatch_async(dispatch_get_main_queue(), ^{
                showErrorAlert(@"Incompatible Discord Version",
                              @"This version of Discord is not using bridgeless "
                              @"Please update Discord to v332 or above",
                              nil);
            });
            return;
        }

        NSString *install_prefix = @"/var/jb";
        isJailbroken = [[NSFileManager defaultManager] fileExistsAtPath:install_prefix];
        BOOL jbPathExists = isJailbroken;

        NSString *bundlePath = [NSString stringWithFormat:@"%@/Library/Application Support/BunnyResources.bundle", install_prefix];
        NSString *jailedPath = [[NSBundle mainBundle].bundleURL.path stringByAppendingPathComponent:@"BunnyResources.bundle"];

        if (jbPathExists && [[NSFileManager defaultManager] fileExistsAtPath:bundlePath]) {
            bunnyPatchesBundlePath = bundlePath;
        } else {
            bunnyPatchesBundlePath = jailedPath;
        }

        loaderConfig = [[LoaderConfig alloc] init];
        [loaderConfig loadConfig];

        %init;
    }
}
