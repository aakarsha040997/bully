/**
 * Expo Config Plugin for expo-usage-stats.
 *
 * Autolinking in EAS managed workflow silently fails to register this local
 * module. This plugin bypasses autolinking entirely by:
 *  1. Copying the Kotlin source directly into the app's source tree.
 *  2. Patching MainApplication.kt to register UsageStatsPackage.
 */

const { withMainApplication, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withUsageStatsKotlinFiles(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;

      const srcDir = path.join(
        projectRoot,
        "modules",
        "expo-usage-stats",
        "android",
        "src",
        "main",
        "java",
        "expo",
        "modules",
        "usagestats"
      );

      const destDir = path.join(
        projectRoot,
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

      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith(".kt")) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }

      return mod;
    },
  ]);
}

function withUsageStatsRegistration(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    if (contents.includes("UsageStatsPackage")) {
      return mod;
    }

    // Add import before the class declaration.
    contents = contents.replace(
      /^class MainApplication/m,
      "import expo.modules.usagestats.UsageStatsPackage\n\nclass MainApplication"
    );

    // Inject package. SDK 54 template uses the multi-line pattern.
    if (contents.includes("val packages = PackageList(this).packages")) {
      contents = contents.replace(
        "val packages = PackageList(this).packages",
        "val packages = PackageList(this).packages\n          packages.add(UsageStatsPackage())"
      );
    } else {
      // Single-expression fallback.
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
