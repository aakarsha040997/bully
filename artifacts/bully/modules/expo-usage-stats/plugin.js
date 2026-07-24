/**
 * Expo Config Plugin for expo-usage-stats.
 *
 * Autolinking in EAS managed workflow silently fails to add this local module
 * to ExpoModulesPackageList.kt. This plugin bypasses autolinking entirely by:
 *  1. Copying the Kotlin source directly into the app's source tree.
 *  2. Patching MainApplication.kt to register UsageStatsPackage.
 *
 * Permissions are already declared via app.json android.permissions.
 */

const { withMainApplication, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Absolute path to the Kotlin source directory (relative to this plugin file).
const KOTLIN_SRC = path.join(
  __dirname,
  "android",
  "src",
  "main",
  "java",
  "expo",
  "modules",
  "usagestats"
);

/** Copies UsageStatsModule.kt + UsageStatsPackage.kt into the app's source tree. */
function withUsageStatsKotlinFiles(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const destDir = path.join(
        mod.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "expo",
        "modules",
        "usagestats"
      );

      fs.mkdirSync(destDir, { recursive: true });

      for (const file of fs.readdirSync(KOTLIN_SRC)) {
        if (file.endsWith(".kt")) {
          fs.copyFileSync(path.join(KOTLIN_SRC, file), path.join(destDir, file));
        }
      }

      return mod;
    },
  ]);
}

/** Registers UsageStatsPackage in MainApplication.kt via getPackages(). */
function withUsageStatsRegistration(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    if (contents.includes("UsageStatsPackage")) {
      // Already patched — idempotent.
      return mod;
    }

    // 1. Add import before the class declaration.
    contents = contents.replace(
      /^class MainApplication/m,
      "import expo.modules.usagestats.UsageStatsPackage\n\nclass MainApplication"
    );

    // 2. Inject package into getPackages().
    //    Template pattern (SDK 54):
    //      val packages = PackageList(this).packages
    //      return packages
    if (contents.includes("val packages = PackageList(this).packages")) {
      contents = contents.replace(
        "val packages = PackageList(this).packages",
        "val packages = PackageList(this).packages\n          packages.add(UsageStatsPackage())"
      );
    } else if (contents.includes("return PackageList(this).packages")) {
      // Single-expression variant.
      contents = contents.replace(
        "return PackageList(this).packages",
        [
          "val packages = PackageList(this).packages",
          "          packages.add(UsageStatsPackage())",
          "          return packages",
        ].join("\n")
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = function withUsageStats(config) {
  config = withUsageStatsKotlinFiles(config);
  config = withUsageStatsRegistration(config);
  return config;
};
