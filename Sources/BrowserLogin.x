// Independent implementation of the OpenInDiscord browser handoff protocol.
#import "BrowserLogin.h"
#import "Utils.h"
#import "Settings.h"
#import <AuthenticationServices/AuthenticationServices.h>
#import <Security/Security.h>
#import <CommonCrypto/CommonCrypto.h>
#import <UIKit/UIKit.h>

static NSObject *sessionLock;
static NSString *sessionState, *pendingToken;
static NSData *sessionSecret;
static NSDate *sessionDate, *pendingDate;
static BOOL authKnown, loggedIn;
static NSString *browserPhase = @"idle";
static BOOL handleLoginURL(NSURL *url);

static NSString *encodeURL(NSData *bytes) {
    return [[[[bytes base64EncodedStringWithOptions:0] stringByReplacingOccurrencesOfString:@"+" withString:@"-"] stringByReplacingOccurrencesOfString:@"/" withString:@"_"] stringByReplacingOccurrencesOfString:@"=" withString:@""];
}
static NSData *decodeURL(NSString *text) {
    if (!text || text.length > 16384) return nil;
    NSString *value = [[text stringByReplacingOccurrencesOfString:@"-" withString:@"+"] stringByReplacingOccurrencesOfString:@"_" withString:@"/"];
    while (value.length % 4) value = [value stringByAppendingString:@"="];
    return [[NSData alloc] initWithBase64EncodedString:value options:0];
}
static NSData *randomBytes(NSUInteger count) {
    NSMutableData *value = [NSMutableData dataWithLength:count];
    return SecRandomCopyBytes(kSecRandomDefault, count, value.mutableBytes) == errSecSuccess ? value : nil;
}
static void clearHandshake(void) { sessionState=nil; sessionSecret=nil; sessionDate=nil; }
static void loginError(NSString *message) {
    dispatch_async(dispatch_get_main_queue(), ^{ showErrorAlert(@"Rain Browser Login", message, nil); });
}
static void startLogin(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSData *state=randomBytes(24), *secret=randomBytes(64);
        if(!state || !secret) { loginError(@"ログイン用の乱数を生成できませんでした。"); return; }
        NSString *nonce=encodeURL(state);
        @synchronized(sessionLock) {
            clearHandshake(); pendingToken=nil; pendingDate=nil;
            sessionState=nonce; sessionSecret=secret; sessionDate=[NSDate date]; browserPhase=@"safari-opening";
        }
        NSString *address=[NSString stringWithFormat:@"https://discord.com/login#login-state=%@&login-secret=%@",nonce,encodeURL(secret)];
        NSURLComponents *url=[NSURLComponents componentsWithString:address]; url.scheme=@"x-safari-https";
        [UIApplication.sharedApplication openURL:url.URL options:@{} completionHandler:^(BOOL success) {
            @synchronized(sessionLock) {
                if(![sessionState isEqualToString:nonce])return;
                browserPhase=success ? @"safari-awaiting-callback" : @"safari-open-failed";
                if(!success)clearHandshake();
            }
            if(!success)loginError(@"Safariを開けませんでした。Safariがインストールされているか確認してください。");
        }];
    });
}
static BOOL handleLoginURL(NSURL *url) {
    if (![url.scheme.lowercaseString isEqualToString:@"raintweak-login"] || ![url.host.lowercaseString isEqualToString:@"login"]) return NO;
    NSURLComponents *parts = [NSURLComponents componentsWithURL:url resolvingAgainstBaseURL:NO];
    NSMutableDictionary *query = [NSMutableDictionary dictionary];
    for (NSURLQueryItem *item in parts.queryItems) {
        if (!item.value || query[item.name]) return YES; // Reject ambiguous duplicate fields.
        query[item.name]=item.value;
    }
    BOOL failed=NO;
    @synchronized(sessionLock) {
        if (!sessionState || ![sessionState isEqualToString:query[@"state"]]) return YES;
        NSData *iv=decodeURL(query[@"iv"]), *cipher=decodeURL(query[@"ciphertext"]), *mac=decodeURL(query[@"mac"]);
        NSTimeInterval age=-sessionDate.timeIntervalSinceNow;
        if (sessionSecret.length!=64 || age<0 || age>600 || iv.length!=16 || !cipher.length || cipher.length>8192 || cipher.length%16 || mac.length!=32) failed=YES;
        if (!failed) {
            NSMutableData *message=[[sessionState dataUsingEncoding:NSUTF8StringEncoding] mutableCopy];
            [message appendData:iv]; [message appendData:cipher];
            unsigned char expected[32];
            CCHmac(kCCHmacAlgSHA256, (const uint8_t *)sessionSecret.bytes+32, 32, message.bytes, message.length, expected);
            const uint8_t *actual=mac.bytes; unsigned char difference=0;
            for (NSUInteger i=0;i<32;i++) difference|=expected[i]^actual[i];
            failed=difference!=0;
            if (!failed) {
                NSMutableData *plain=[NSMutableData dataWithLength:cipher.length+16]; size_t size=0;
                CCCryptorStatus status=CCCrypt(kCCDecrypt,kCCAlgorithmAES,kCCOptionPKCS7Padding,sessionSecret.bytes,32,iv.bytes,cipher.bytes,cipher.length,plain.mutableBytes,plain.length,&size);
                if (status!=kCCSuccess) failed=YES;
                else {
                    plain.length=size;
                    NSString *token=[[NSString alloc] initWithData:plain encoding:NSUTF8StringEncoding];
                    if (token.length<20 || token.length>4096 || [token rangeOfCharacterFromSet:NSCharacterSet.whitespaceAndNewlineCharacterSet].location!=NSNotFound) failed=YES;
                    else { pendingToken=token; pendingDate=[NSDate date]; }
                }
            }
        }
        browserPhase=failed ? @"callback-invalid" : @"callback-verified";
        clearHandshake(); // One-time callback, including failed verification.
    }
    if (failed) loginError(@"ログイン応答を確認できないか、10分の有効期限が切れています。もう一度お試しください。");
    return YES;
}
NSString *RainBrowserLoginBridge(NSString *operation, NSString *value) {
    if ([operation isEqualToString:@"preferredLocale"]) {
        NSArray *languages=[NSUserDefaults.standardUserDefaults arrayForKey:@"AppleLanguages"];
        NSString *first=languages.firstObject ?: NSLocale.preferredLanguages.firstObject;
        return first ?: @"en";
    }
    if ([operation isEqualToString:@"settingsOpen"]) {
        dispatch_async(dispatch_get_main_queue(), ^{ showSettingsSheet(); }); return @"1";
    }
    if ([operation isEqualToString:@"shakeMenu"]) {
        if ([value isEqualToString:@"0"] || [value isEqualToString:@"1"])
            rainSetShakeMenuEnabled([value isEqualToString:@"1"]);
        return rainShakeMenuEnabled() ? @"1" : @"0";
    }
    @synchronized(sessionLock) {
        if ([operation isEqualToString:@"status"]) return browserPhase;
        if ([operation isEqualToString:@"reset"]) { authKnown=NO; loggedIn=NO; }
        if ([operation isEqualToString:@"auth"]) { authKnown=YES; loggedIn=[value isEqualToString:@"1"]; }
        if ([operation isEqualToString:@"peek"]) {
            if (pendingDate && -pendingDate.timeIntervalSinceNow>60) { pendingToken=nil; pendingDate=nil; loginError(@"Rainがログインを完了できませんでした。再度お試しください。"); }
            return pendingToken;
        }
        if ([operation isEqualToString:@"ack"] && [pendingToken isEqualToString:value]) {
            pendingToken=nil; pendingDate=nil; loggedIn=YES; browserPhase=@"applied";
            // Do not call reloadApp here: that helper suspends then exits(0).
            // JavaScript requests Discord's own runtime reload after acknowledgement.
        }
    }
    return nil;
}
static void cancelNativeRequest(ASAuthorizationController *controller) {
    id<ASAuthorizationControllerDelegate> delegate=controller.delegate;
    if ([delegate respondsToSelector:@selector(authorizationController:didCompleteWithError:)])
        [delegate authorizationController:controller didCompleteWithError:[NSError errorWithDomain:ASAuthorizationErrorDomain code:ASAuthorizationErrorCanceled userInfo:nil]];
}
static BOOL useBrowser(ASAuthorizationController *controller) {
    @synchronized(sessionLock) { if (!authKnown || loggedIn) return NO; }
    for (ASAuthorizationRequest *request in controller.authorizationRequests)
        if ([request conformsToProtocol:@protocol(ASAuthorizationPublicKeyCredentialAssertionRequest)]) {
            NSString *rp=[(id<ASAuthorizationPublicKeyCredentialAssertionRequest>)request relyingPartyIdentifier];
            if ([rp isEqualToString:@"discord.com"]) return YES;
        }
    return NO;
}
%group RainBrowserLogin
%hook ASAuthorizationController
- (void)performRequests
{
    if (useBrowser(self)) {
        cancelNativeRequest(self);
        startLogin();
        return;
    }
    %orig;
}
- (void)performRequestsWithOptions:(NSUInteger)options
{
    if (useBrowser(self)) {
        cancelNativeRequest(self);
        startLogin();
        return;
    }
    %orig;
}
%end
%hook RCTLinkingManager
+ (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary *)options {
    if (handleLoginURL(url)) return YES;
    return %orig;
}
%end
%end
%ctor {
    sessionLock=[NSObject new];
    if (![[NSFileManager defaultManager] fileExistsAtPath:NSBundle.mainBundle.appStoreReceiptURL.path]) { %init(RainBrowserLogin); }
}
