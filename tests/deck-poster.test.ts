import {it,expect} from 'vitest';
import sharp from 'sharp';
it('keeps the fallback model centered under the same physical button positions',async()=>{
 const {data,info}=await sharp('public/portfolio/deploy-standby-v03.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,right=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>200){left=Math.min(left,x);right=Math.max(right,x);}
 expect(Math.abs((left+right)/2-info.width/2)).toBeLessThan(3);
 expect(left/info.width).toBeCloseTo(.05,2);
});
