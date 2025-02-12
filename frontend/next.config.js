/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['your-domain.com'], // 필요한 이미지 도메인 추가
  },
}

module.exports = nextConfig 