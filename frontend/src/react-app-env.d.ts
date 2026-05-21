/// <reference types="react-scripts" />

// CSS modules
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

// SVG / image / font assets
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
declare module '*.png'  { const src: string; export default src; }
declare module '*.jpg'  { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif'  { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.ico'  { const src: string; export default src; }
declare module '*.woff' { const src: string; export default src; }
declare module '*.woff2'{ const src: string; export default src; }
declare module '*.ttf'  { const src: string; export default src; }
declare module '*.eot'  { const src: string; export default src; }
