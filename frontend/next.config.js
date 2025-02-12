/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 빌드 시 ESLint 검사를 건너뜁니다
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    domains: ['your-domain.com'], // 필요한 이미지 도메인 추가
  },
}

module.exports = nextConfig 