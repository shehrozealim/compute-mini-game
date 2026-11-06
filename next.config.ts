import type {NextConfig} from 'next';
const config:NextConfig={poweredByHeader:false,distDir:process.env.NEXT_DIST_DIR||".next",skipTrailingSlashRedirect:true,async headers(){return [{source:'/assets/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, stale-while-revalidate=604800'}]}]},async rewrites(){return [{source:'/socket.io/:path*',destination:`http://127.0.0.1:${process.env.BACKEND_PORT||3001}/socket.io/:path*/`}]}};export default config;



