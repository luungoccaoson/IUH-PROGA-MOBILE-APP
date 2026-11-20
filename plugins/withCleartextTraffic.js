const { withAndroidManifest } = require('@expo/config-plugins');

const withCustomAppConfig = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults?.manifest;
    if (androidManifest?.application?.[0]?.$) {
      androidManifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
};

module.exports = withCustomAppConfig;
