import {randomBytes} from 'node:crypto';
import {defineConfig} from 'vite';

export default defineConfig(({command,isPreview})=>{
  const base=process.env.VITE_BASE_PATH || '/';
  if(command!=='serve' || isPreview)return {base};
  // Vite injects CSS during development. Authorize it with a fresh per-server
  // nonce; the production build retains its strict external-styles-only policy.
  const nonce=randomBytes(24).toString('base64');
  return {
    base,
    html:{cspNonce:nonce},
    plugins:[{
      name:'development-style-nonce',
      transformIndexHtml(html){return html.replace("style-src 'self'",`style-src 'self' 'nonce-${nonce}'`);}
    }]
  };
});
