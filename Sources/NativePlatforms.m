#import "NativePlatforms.h"
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <objc/message.h>
#import <stdlib.h>

// Discord 348 / 113691: verified Objective-C metadata, not global UILabel hooks.
static NSMutableDictionary<NSString *, NSDictionary *> *platforms;
static NSHashTable<UIView *> *cells;
static NSMutableArray<NSString *> *errors;
static BOOL enabled, installed;
static NSUInteger stackUpdates, labelUpdates;
static IMP originalLayout, originalReuse;
static char iconRowKey, labelKey;
static NSString *const marker = @"RainNativePlatformAttachment";

static void note(NSString *message) { if (errors.count < 8) [errors addObject:message]; }
static id objectGetter(id object, NSString *name) {
    SEL selector = NSSelectorFromString(name);
    Method method = object ? class_getInstanceMethod(object_getClass(object), selector) : NULL;
    if (!method || method_getNumberOfArguments(method) != 2) return nil;
    char *type = method_copyReturnType(method);
    BOOL safe = type && type[0] == '@'; free(type);
    if (!safe) return nil;
    return ((id (*)(id, SEL))objc_msgSend)(object, selector);
}
static NSAttributedString *withoutIcons(NSAttributedString *text) {
    if (!text.length) return text;
    NSMutableArray<NSValue *> *ranges = [NSMutableArray array];
    [text enumerateAttribute:marker inRange:NSMakeRange(0, text.length) options:0 usingBlock:^(id value, NSRange range, BOOL *stop) {
        if (value) [ranges addObject:[NSValue valueWithRange:range]];
    }];
    if (!ranges.count) return text;
    NSMutableAttributedString *clean = [text mutableCopy];
    for (NSValue *range in ranges.reverseObjectEnumerator) [clean deleteCharactersInRange:range.rangeValue];
    return clean;
}
static void removeIcons(UIView *cell) {
    UIView *row = objc_getAssociatedObject(cell, &iconRowKey);
    if ([row.superview isKindOfClass:UIStackView.class]) [(UIStackView *)row.superview removeArrangedSubview:row];
    [row removeFromSuperview];
    objc_setAssociatedObject(cell, &iconRowKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    UILabel *label = objc_getAssociatedObject(cell, &labelKey);
    if (label) {
        NSAttributedString *clean = withoutIcons(label.attributedText);
        if (clean != label.attributedText) label.attributedText = clean;
    }
    objc_setAssociatedObject(cell, &labelKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}
static UIColor *statusColor(NSString *status) {
    if ([status isEqualToString:@"dnd"]) return [UIColor colorWithRed:0.949 green:0.247 blue:0.263 alpha:1];
    if ([status isEqualToString:@"idle"]) return [UIColor colorWithRed:0.941 green:0.698 blue:0.196 alpha:1];
    return [UIColor colorWithRed:0.137 green:0.647 blue:0.353 alpha:1];
}
static NSArray<NSDictionary *> *iconsFor(NSDictionary *statuses) {
    NSArray *keys = @[@"desktop", @"mobile", @"web", @"embedded", @"vr"];
    NSDictionary *symbols = @{@"desktop":@"desktopcomputer", @"mobile":@"iphone", @"web":@"globe", @"embedded":@"gamecontroller", @"vr":@"visionpro"};
    static NSCache *cache; if (!cache) cache=[[NSCache alloc] init];
    NSMutableArray *result = [NSMutableArray array];
    for (NSString *key in keys) {
        NSString *status = statuses[key];
        if (![status isKindOfClass:NSString.class] || ![@[@"online", @"idle", @"dnd"] containsObject:status]) continue;
        NSString *imageKey=[key stringByAppendingFormat:@":%@",status];
        UIImage *cached=[cache objectForKey:imageKey];
        if (cached) { [result addObject:@{@"image":cached,@"key":imageKey}]; continue; }
        UIImage *source = [UIImage systemImageNamed:symbols[key] withConfiguration:[UIImageSymbolConfiguration configurationWithPointSize:14 weight:UIImageSymbolWeightRegular]];
        if (!source) continue;
        source = [source imageWithTintColor:statusColor(status) renderingMode:UIImageRenderingModeAlwaysOriginal];
        UIImage *image = [[[UIGraphicsImageRenderer alloc] initWithSize:CGSizeMake(16, 16)] imageWithActions:^(UIGraphicsImageRendererContext *context) {
            CGFloat scale = MIN(16 / source.size.width, 16 / source.size.height);
            CGSize size = CGSizeMake(source.size.width * scale, source.size.height * scale);
            [source drawInRect:CGRectMake((16-size.width)/2, (16-size.height)/2, size.width, size.height)];
        }];
        [cache setObject:image forKey:imageKey];
        [result addObject:@{@"image":image, @"key":[key stringByAppendingFormat:@":%@", status]}];
    }
    return result;
}
// Prefer an existing arranged header/tag row, so styled names are not recolored
// or replaced. If this build uses ordinary views, append image attachments only
// to its real UILabel; never overlay icons over tags or timestamps.
static UIStackView *headerStack(UIView *tagView, UIView **anchor) {
    if ([tagView isKindOfClass:UIStackView.class]) { *anchor = nil; return (UIStackView *)tagView; }
    UIView *child = tagView;
    for (NSUInteger depth=0; child && depth<3; depth++, child=child.superview) {
        if ([child.superview isKindOfClass:UIStackView.class]) {
            UIStackView *stack = (UIStackView *)child.superview;
            if ([stack.arrangedSubviews containsObject:child]) { *anchor=child; return stack; }
        }
    }
    return nil;
}
static void refreshCell(UIView *cell) {
    [cells addObject:cell];
    if (!enabled) { removeIcons(cell); return; }
    id model = objectGetter(cell, @"baseViewModel");
    id message = objectGetter(model, @"message");
    NSString *userID = objectGetter(message, @"authorID");
    if (![userID isKindOfClass:NSString.class]) { removeIcons(cell); return; }
    NSArray *icons = iconsFor(platforms[userID]);
    if (!icons.count) { removeIcons(cell); return; }
    UIView *usernameView = objectGetter(cell, @"usernameContainerView");
    if (![usernameView isKindOfClass:UIView.class] || usernameView.hidden) { removeIcons(cell); return; }
    UILabel *label = objectGetter(cell, @"usernameLabel");
    UIView *tags = objectGetter(cell, @"tagsAfterUsernameView");
    UIView *anchor = nil;
    UIStackView *stack = [tags isKindOfClass:UIView.class] ? headerStack(tags, &anchor) : nil;
    NSMutableArray *keys = [NSMutableArray array];
    for (NSDictionary *item in icons) [keys addObject:item[@"key"]];
    NSString *signature = [NSString stringWithFormat:@"%@/%@", userID, [keys componentsJoinedByString:@","]];
    UIStackView *row = objc_getAssociatedObject(cell, &iconRowKey);
    if (stack && !stack.hidden) {
        if (row.superview==stack && [row.accessibilityIdentifier isEqualToString:signature]) return;
        removeIcons(cell);
        row = [[UIStackView alloc] init]; row.axis=UILayoutConstraintAxisHorizontal;
        row.alignment=UIStackViewAlignmentCenter; row.spacing=4;
        row.userInteractionEnabled=NO; row.accessibilityElementsHidden=YES;
        row.accessibilityIdentifier=signature;
        [row setContentHuggingPriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
        for (NSDictionary *item in icons) {
            UIImageView *image = [[UIImageView alloc] initWithImage:item[@"image"]];
            image.contentMode=UIViewContentModeScaleAspectFit;
            [image.widthAnchor constraintEqualToConstant:16].active=YES;
            [image.heightAnchor constraintEqualToConstant:16].active=YES;
            [row addArrangedSubview:image];
        }
        if (anchor) [stack insertArrangedSubview:row atIndex:[stack.arrangedSubviews indexOfObject:anchor]+1];
        else [stack addArrangedSubview:row];
        objc_setAssociatedObject(cell, &iconRowKey, row, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        stackUpdates++; return;
    }
    if (![label isKindOfClass:UILabel.class] || label.hidden || !label.text.length) { removeIcons(cell); return; }
    NSAttributedString *current = label.attributedText;
    NSAttributedString *clean = withoutIcons(current);
    if (current.length && [current attribute:marker atIndex:current.length-1 effectiveRange:NULL] &&
        [objc_getAssociatedObject(cell, &labelKey) isEqual:label] &&
        [objc_getAssociatedObject(label, &iconRowKey) isEqualToString:signature]) return;
    if (row) removeIcons(cell);
    UIFont *font = label.font ?: [UIFont systemFontOfSize:16];
    NSMutableAttributedString *result = clean ? [clean mutableCopy] : [[NSMutableAttributedString alloc] initWithString:label.text attributes:@{NSFontAttributeName:font, NSForegroundColorAttributeName:label.textColor ?: UIColor.labelColor}];
    NSUInteger start = result.length;
    for (NSDictionary *item in icons) {
        [result appendAttributedString:[[NSAttributedString alloc] initWithString:@" " attributes:@{NSFontAttributeName:font}]];
        NSTextAttachment *attachment = [[NSTextAttachment alloc] init]; attachment.image=item[@"image"];
        attachment.bounds=CGRectMake(0, (font.capHeight-16)/2, 16, 16);
        [result appendAttributedString:[NSAttributedString attributedStringWithAttachment:attachment]];
    }
    [result addAttribute:marker value:@YES range:NSMakeRange(start, result.length-start)];
    label.attributedText=result;
    objc_setAssociatedObject(cell, &labelKey, label, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    objc_setAssociatedObject(label, &iconRowKey, signature, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    labelUpdates++;
}
static void layout(id self, SEL selector) {
    ((void (*)(id,SEL))originalLayout)(self,selector);
    @try { refreshCell(self); } @catch (NSException *e) { note(e.reason ?: e.name); @try { removeIcons(self); } @catch (NSException *cleanup) { note(cleanup.reason ?: cleanup.name); } }
}
static void reuse(id self, SEL selector) {
    @try { removeIcons(self); } @catch (NSException *e) { note(e.reason ?: e.name); }
    ((void (*)(id,SEL))originalReuse)(self,selector);
}
static BOOL hook(Class cls, SEL selector, IMP replacement, IMP *previous) {
    Method method = class_getInstanceMethod(cls, selector);
    if (!method || method_getNumberOfArguments(method)!=2) return NO;
    char *type = method_copyReturnType(method); BOOL valid=type && type[0]=='v'; free(type);
    if (!valid) return NO;
    *previous=method_getImplementation(method);
    // An inherited UIKit method must be overridden locally, never modified.
    if (!class_addMethod(cls, selector, replacement, method_getTypeEncoding(method)))
        method_setImplementation(class_getInstanceMethod(cls, selector), replacement);
    return YES;
}
static void install(void) {
    if (installed) return;
    NSDictionary *info=NSBundle.mainBundle.infoDictionary;
    if (![info[@"CFBundleShortVersionString"] isEqual:@"348.0"] || ![[info[@"CFBundleVersion"] description] isEqual:@"113691"]) { note(@"Unsupported Discord build"); return; }
    Class cls=NSClassFromString(@"DCDMessageTableViewCell");
    if (!cls || ![cls isSubclassOfClass:UIView.class] || !class_getInstanceMethod(cls,NSSelectorFromString(@"usernameLabel")) || !class_getInstanceMethod(cls,NSSelectorFromString(@"baseViewModel"))) { note(@"Native message cell unavailable"); return; }
    installed=hook(cls,@selector(layoutSubviews),(IMP)layout,&originalLayout);
    if (installed) hook(cls,@selector(prepareForReuse),(IMP)reuse,&originalReuse);
}
NSString *RainNativePlatformsBridge(NSString *operation, NSString *value) {
    static dispatch_once_t once;
    dispatch_once(&once, ^{ platforms=[NSMutableDictionary dictionary]; cells=[NSHashTable weakObjectsHashTable]; errors=[NSMutableArray array]; });
    if ([operation isEqualToString:@"diag"]) {
        __block NSString *result;
        void (^read)(void)=^{ result=[[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:@{@"version":@58,@"installed":@(installed),@"enabled":@(enabled),@"users":@(platforms.count),@"cells":@(cells.count),@"stackUpdates":@(stackUpdates),@"labelUpdates":@(labelUpdates),@"errors":errors} options:0 error:nil] encoding:NSUTF8StringEncoding]; };
        if (NSThread.isMainThread) read(); else dispatch_sync(dispatch_get_main_queue(),read);
        return result;
    }
    if ([operation isEqualToString:@"enable"]) {
        BOOL active=[value isEqualToString:@"1"];
        dispatch_async(dispatch_get_main_queue(), ^{
            if (active) install(); enabled=active && installed;
            if (!enabled) [platforms removeAllObjects];
            for (UIView *cell in cells.allObjects) { if (!enabled) removeIcons(cell); [cell setNeedsLayout]; }
        }); return @"queued";
    }
    if (![operation isEqualToString:@"set"] || value.length>8192) return nil;
    NSDictionary *input=[NSJSONSerialization JSONObjectWithData:[value dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
    if (![input isKindOfClass:NSDictionary.class] || ![input[@"userId"] isKindOfClass:NSString.class] || ![input[@"statuses"] isKindOfClass:NSDictionary.class]) return nil;
    NSString *userID=input[@"userId"]; if (!userID.length || userID.length>32) return nil;
    NSMutableDictionary *valid=[NSMutableDictionary dictionary];
    for (NSString *key in @[@"desktop",@"mobile",@"web",@"embedded",@"vr"])
        if ([input[@"statuses"][key] isKindOfClass:NSString.class] && [@[@"online",@"idle",@"dnd"] containsObject:input[@"statuses"][key]]) valid[key]=input[@"statuses"][key];
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!enabled) return;
        if (platforms.count>=2048 && !platforms[userID]) [platforms removeAllObjects];
        platforms[userID]=valid;
        for (UIView *cell in cells.allObjects) [cell setNeedsLayout];
    }); return @"queued";
}
