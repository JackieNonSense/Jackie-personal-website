import {fireEvent,render,screen,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import Home from '../app/page';

describe('InkTrace press run on the real homepage',()=>{
 it('keeps the poster shell without nesting another main or h1',()=>{
  const {container}=render(<Home/>);
  const work=screen.getByRole('region',{name:'PROJECTS'});
  expect(work).toHaveAttribute('id','work');
  expect(within(work).getByRole('img',{name:/printed zine/})).toBeVisible();
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
  expect([...container.querySelectorAll('section[id]')].map(e=>e.id)).toEqual(['signal','about','work','experiments','contact']);
  expect(within(work).getByRole('link',{name:/Visit Inktrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(within(work).getByText(/An independent/)).toHaveTextContent('An independent space for creation.');
  expect(screen.queryByRole('button',{name:'Open the Living Archive'})).not.toBeInTheDocument();
  expect(document.querySelector('[data-living-window]')).toBeNull();
 });
 it('follows the homepage pause without starting audio',()=>{
  const original=window.matchMedia;
  const media=vi.spyOn(window,'matchMedia').mockImplementation(query=>({...original(query),matches:false}));
  const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
  try{
   render(<Home/>);
   fireEvent.click(screen.getByRole('button',{name:'暂停动态效果'}));
   expect(document.querySelector('[data-print-stage]')).toHaveAttribute('data-playing','false');
   fireEvent.click(screen.getByRole('button',{name:'恢复动态效果'}));
   expect(play).not.toHaveBeenCalled();
  }finally{media.mockRestore();play.mockRestore();}
 });
});
