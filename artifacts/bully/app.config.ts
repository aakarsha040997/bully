import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? "";
  return {
    ...config,
    name: config.name ?? "Bully",
    slug: config.slug ?? "bully",
    extra: {
      ...(config.extra ?? {}),
      apiDomain: domain,
    },
  };
};
