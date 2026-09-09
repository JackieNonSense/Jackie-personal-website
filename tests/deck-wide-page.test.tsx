import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {it,expect} from 'vitest';
it('labels the wide mechanism study honestly and provides native inspection controls',async()=>{
 const file=resolve('app/design/deck-wide/page.tsx');expect(existsSync(file),'independent study page exists without replacing homepage').toBe(true);
 const {default:Page}=await import(file);const html=renderToStaticMarkup(createElement(Page));
 expect(html).toContain('静态示意');expect(html).toContain('未接入首页');
 expect(html).toContain('打开面板');expect(html).toContain('关闭面板');expect(html).toContain('检查开合进度');
 expect(html).not.toContain('<audio');
});
