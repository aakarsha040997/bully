import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? "a4b508d4-e546-405f-8919-adb679fd27a3-00-30jr5gsuv08dy.pike.replit.dev";
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
