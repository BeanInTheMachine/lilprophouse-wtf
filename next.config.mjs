/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        'pino-pretty': false,
        'child_process': false,
        ws: false,
      };
      // Use ESM isows build (avoids CJS require('ws') in browser)
      config.resolve.alias = {
        ...config.resolve.alias,
        isows: 'isows/_esm/index.js',
      };
    }
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
      ws: 'commonjs ws',
    });
    return config;
  },
};

export default nextConfig;
