#pragma once
#import <Foundation/Foundation.h>
// The implementation is Objective-C (.x); Tweak.xm is Objective-C++.
// Both translation units must reference the same C linkage symbol.
#ifdef __cplusplus
extern "C" {
#endif
NSString *RainBrowserLoginBridge(NSString *operation, NSString *value);
#ifdef __cplusplus
}
#endif
