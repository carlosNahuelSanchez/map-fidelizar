const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') throw new Error('Se esperaba Gradle Groovy.');
    let source = config.modResults.contents;
    source = source.replaceAll('-DCMAKE_OBJECT_PATH_MAX=128', '-DCMAKE_OBJECT_PATH_MAX=240');
    if (!source.includes('-DCMAKE_OBJECT_PATH_MAX=240')) {
      source = source.replace('defaultConfig {', `defaultConfig {
        externalNativeBuild { cmake { arguments '-DCMAKE_OBJECT_PATH_MAX=240' } }`);
    }
    if (!source.includes('FIDELIZAR_KEYSTORE_FILE')) {
      source = source.replace('signingConfigs {', `signingConfigs {
        release {
            def keyFile = System.getenv('FIDELIZAR_KEYSTORE_FILE')
            if (keyFile) {
                storeFile file(keyFile)
                storePassword System.getenv('FIDELIZAR_KEYSTORE_PASSWORD')
                keyAlias 'fidelizar'
                keyPassword System.getenv('FIDELIZAR_KEYSTORE_PASSWORD')
            }
        }`);
      source = source.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig) signingConfigs\.debug/, '$1 signingConfigs.release');
    }
    config.modResults.contents = source;
    return config;
  });
};
