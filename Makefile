TARGET := iphone:clang:latest:26.0
ARCHS = arm64
INSTALL_TARGET_PROCESSES = Discord
THEOS_PACKAGE_SCHEME = rootless
FINALPACKAGE = 1
VERSION_CODE = 1100

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = RainTweak
BUNDLE_NAME = BunnyResources

RainTweak_FILES = $(wildcard Sources/*.x Sources/*.xm Sources/*.m Sources/*.mm Sources/**/*.x Sources/**/*.xm Sources/**/*.m Sources/**/*.mm)
RainTweak_CFLAGS = -fobjc-arc -DPACKAGE_VERSION='@"$(THEOS_PACKAGE_BASE_VERSION)"' -I$(THEOS_PROJECT_DIR)/Headers -Wno-error=deprecated-declarations
RainTweak_CCFLAGS = -std=c++17 -Wno-c++11-narrowing -I$(THEOS_PROJECT_DIR)/Headers
RainTweak_FRAMEWORKS = Foundation UIKit QuartzCore CoreGraphics CoreText CoreFoundation UniformTypeIdentifiers MediaPlayer AuthenticationServices Security
RainTweak_LDFLAGS = -undefined dynamic_lookup

BunnyResources_INSTALL_PATH = "/Library/Application\ Support/"
BunnyResources_RESOURCE_DIRS = Resources

include $(THEOS_MAKE_PATH)/tweak.mk
include $(THEOS_MAKE_PATH)/bundle.mk

before-all::
	$(ECHO_NOTHING)mkdir -p Resources$(ECHO_END)
	$(ECHO_NOTHING)cp Sources/startup-diagnostics.js Resources/startup-diagnostics.js$(ECHO_END)
	$(ECHO_NOTHING)bash build-rain-client.sh$(ECHO_END)
	$(ECHO_NOTHING)mkdir -p Resources$(ECHO_END)
	$(ECHO_NOTHING)cp Sources/legacy-rounded-ui.js Resources/legacy-rounded-ui.js$(ECHO_END)
	$(ECHO_NOTHING)cp Sources/browser-login.js Resources/browser-login.js$(ECHO_END)
	$(ECHO_NOTHING)mkdir -p Resources$(ECHO_END)
	$(ECHO_NOTHING)sed -e 's/@PACKAGE_VERSION@/$(THEOS_PACKAGE_BASE_VERSION)/g' \
		-e 's/@TWEAK_NAME@/$(TWEAK_NAME)/g' \
		Sources/payload-base.template.js > Resources/payload-base.js$(ECHO_END)

after-stage::
	$(ECHO_NOTHING)find $(THEOS_STAGING_DIR) -name ".DS_Store" -delete$(ECHO_END)

after-package::
	$(ECHO_NOTHING)rm -rf Resources$(ECHO_END)
