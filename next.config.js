// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚠️ Supprime cette section entièrement
  // experimental: {
  //   serverActions: true,
  // },
  env: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
};

module.exports = nextConfig;