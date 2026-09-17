import {fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import Home from '../app/page';

describe('Living Archive on the real homepage',()=>{
 it('keeps the restored poster shell without nesting another main or h1',()=>{
  const {container}=render(<Home/>);
  const work=screen.getByRole('region',{name:'PROJECTS'});
  expect(work).toHaveAttribute('id','work');
  expect(within(work).getByRole('button',{name:'Open the Living Archive'})).toBeVisible();
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
  expect([...container.querySelectorAll('section[id]')].map(e=>e.id)).toEqual(['signal','about','work','experiments','contact']);
  expect(within(work).queryByText('PUBLIC WEBSITE / MIND MAP DEMO')).not.toBeInTheDocument();
  expect(within(work).queryByText('PORTFOLIO PRINT / NOT A PRODUCT SCREENSHOT')).not.toBeInTheDocument();
  expect(within(work).getByRole('link',{name:/Visit Inktrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(within(work).getByText(/An independent/)).toHaveTextContent('An independent space for creation.');
  expect(within(work).queryByText(/THE LIVING ARCHIVE|Sample world|Entirely silent/)).not.toBeInTheDocument();
  expect(within(work).queryByRole('link',{name:/Art direction|Original Wiki study/})).not.toBeInTheDocument();
 });
 it('overlays all four real scenes without replacing work, edits Wiki, then returns to the book',()=>{
  const {container}=render(<Home/>);
  const work=container.querySelector<HTMLElement>('#work')!;
  const book=within(work).getByRole('button',{name:'Open the Living Archive'});
  fireEvent.click(book);
  for(const name of ['Timeline','Characters','AI Assistant','Wiki']){
   fireEvent.click(screen.getByRole('tab',{name:new RegExp(name)}));
   const dialog=screen.getByRole('dialog',{name:`InkTrace — ${name}`});
   expect(within(dialog).getByRole('heading',{name:`InkTrace — ${name}`})).toBeVisible();
   expect(work).not.toContainElement(dialog);
   expect(within(work).getByRole('button',{name:'Open the Living Archive'})).toBe(book);
  }
  fireEvent.click(screen.getByRole('button',{name:'Wrap right'}));
  expect(document.querySelector('[data-wiki-image]')).toHaveStyle({float:'right',width:'44%'});
  fireEvent.keyDown(screen.getByRole('button',{name:'Close Living Archive'}),{key:'Escape'});
  expect(screen.getByRole('button',{name:'Open the Living Archive'})).toHaveFocus();
  expect(document.querySelector('[data-living-window]')).toBeNull();
  expect(screen.getAllByRole('main')).toHaveLength(1);
 });
 it('honours homepage pause without losing a local pause or starting audio',async()=>{
  const original=window.matchMedia;
  const media=vi.spyOn(window,'matchMedia').mockImplementation(query=>({...original(query),matches:false}));
  const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
  try{
   render(<Home/>);
   fireEvent.click(screen.getByRole('button',{name:'Open the Living Archive'}));
   await waitFor(()=>expect(screen.getByRole('button',{name:'Pause demo'})).toBeVisible());
   fireEvent.click(screen.getByRole('button',{name:'Pause demo'}));
   fireEvent.click(screen.getByRole('button',{name:'暂停动态效果'}));
   expect(screen.getByRole('button',{name:'Next key step'})).toBeVisible();
   expect(screen.queryByRole('button',{name:'Continue demo'})).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'恢复动态效果'}));
   expect(screen.getByRole('button',{name:'Continue demo'})).toBeVisible();
   expect(play).not.toHaveBeenCalled();
  }finally{media.mockRestore();play.mockRestore();}
 });
});
