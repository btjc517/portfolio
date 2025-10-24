const path = require("path");
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "api.microlink.io", // Microlink Image Preview
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@public": path.resolve(__dirname, "public"),
    };

    config.module.rules.push({
      test: /\.pdf$/i,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name]-[hash][ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;
