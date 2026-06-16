const path = require('path');

const isEmbedBuild = process.env.BUILD_EMBED === 'true';

module.exports = {
  paths: (paths) => {
    if (isEmbedBuild) {
      paths.appBuild = path.resolve(__dirname, 'build/embed');
      paths.appHtml = path.resolve(__dirname, 'public/embed.html');
    }
    return paths;
  },
  webpack: {
    configure: (webpackConfig) => {
      if (!isEmbedBuild) {
        return webpackConfig;
      }

      webpackConfig.entry = path.resolve(__dirname, 'src/embed/volusionEmbed.tsx');
      webpackConfig.output.path = path.resolve(__dirname, 'build/embed');
      webpackConfig.output.publicPath = '/embed/';
      webpackConfig.output.filename = 'volusion-embed.js';
      webpackConfig.output.chunkFilename = 'volusion-embed.[name].js';

      const htmlPlugin = webpackConfig.plugins.find(
        (plugin) => plugin.constructor.name === 'HtmlWebpackPlugin'
      );
      if (htmlPlugin) {
        htmlPlugin.userOptions.template = path.resolve(
          __dirname,
          'public/embed.html'
        );
        htmlPlugin.userOptions.filename = 'index.html';
        htmlPlugin.userOptions.inject = false;
      }

      const miniCssExtractPlugin = webpackConfig.plugins.find(
        (plugin) => plugin.constructor.name === 'MiniCssExtractPlugin'
      );
      if (miniCssExtractPlugin) {
        miniCssExtractPlugin.options.filename = 'volusion-embed.css';
        miniCssExtractPlugin.options.chunkFilename = 'volusion-embed.[name].css';
      }

      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        runtimeChunk: false,
        splitChunks: false,
      };

      return webpackConfig;
    },
  },
};
