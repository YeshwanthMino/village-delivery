const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const finalConfig = withNativeWind(config, { input: './global.css' });

// react-native-maps is native-only and crashes the web bundle
// (codegenNativeComponent is not a function). Alias it to a stub on web.
const defaultResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/shims/react-native-maps.web.tsx') };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = finalConfig;
