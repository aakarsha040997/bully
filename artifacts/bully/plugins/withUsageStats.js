const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Config plugin that adds PACKAGE_USAGE_STATS permission to AndroidManifest.xml.
 * This is a "special" permission — the user grants it manually via
 * Settings → Apps → Special app access → Usage access.
 */
module.exports = function withUsageStats(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const permissions = manifest["uses-permission"];
    const permName = "android.permission.PACKAGE_USAGE_STATS";
    const already = permissions.some((p) => p.$?.["android:name"] === permName);

    if (!already) {
      permissions.push({ $: { "android:name": permName } });
    }

    return config;
  });
};
