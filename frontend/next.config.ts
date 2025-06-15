import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
 images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      
    ]
  },
  async rewrites() {
    return [
      {
        source: '/MyWebsite/property/view/:id',
        destination: '/MyWebsite/property/view/:id'
      },
      {
        source: '/MyWebsite/property/edit/:id',
        destination: '/MyWebsite/property/edit/:id'
      },
      {
        source: '/payments/booking/:id',
        destination: '/payments/booking/:id'
      },
      {
        source: '/payments/booking/:id/successOp',
        destination: '/payments/booking/:id/successOp'
      },
      {
        source: '/payments/booking/:id/paymentOnline',
        destination: '/payments/booking/:id/paymentOnline'
      },
      {
        source: '/payments/booking/:id/success',
        destination: '/payments/booking/:id/success'
      },
      {
        source: '/propertyDetails/:id',
        destination: '/propertyDetails/:id'
      },
      {
        source: '/:hostId',
        destination: '/'
      },
      {
        source: '/:hostId/:path*',
        destination: '/:path*'
      },
      {
        source: '/preview/:hostId',
        destination: '/preview/:hostId'
      }
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
      'src': __dirname + '/src'
    };
    return config;
  }
};

export default nextConfig;