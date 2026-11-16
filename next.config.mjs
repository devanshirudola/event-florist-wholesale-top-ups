/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/:path*", destination: "http://localhost:4000/api/:path*" }];
  },
};

export default nextConfig;
