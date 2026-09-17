const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Gradle (and IDE Java tooling) create and delete .gradle/, build/ and bin/ folders
// inside node_modules while building native code. Without Watchman (Windows), Metro
// watches those folders itself and crashes with ENOENT when one disappears mid-crawl.
// Only generated native output is excluded; some packages ship JS under android/ paths.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
    ...(Array.isArray(existingBlockList)
        ? existingBlockList
        : existingBlockList
          ? [existingBlockList]
          : []),
    /[\\/]\.gradle[\\/].*/,
    /[\\/]node_modules[\\/].*[\\/]android[\\/](build|bin|\.cxx)[\\/].*/,
    /[\\/]node_modules[\\/].*gradle-plugin[\\/].*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
