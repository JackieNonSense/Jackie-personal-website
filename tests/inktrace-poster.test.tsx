import {render,screen,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import InkTracePress from '../components/portfolio/inktrace-press/InkTracePress';

describe('homepage InkTrace poster',()=>{
 it('keeps the normal poster copy and visit link without study explanations',()=>{
  render(<InkTracePress still/>);
  const poster=screen.getByRole('region',{name:'PROJECTS'});
  expect(poster).toHaveAttribute('id','work');
  expect(within(poster).getByText(/An independent/)).toHaveTextContent('An independent space for creation.');
  expect(within(poster).getByRole('link',{name:/Visit Inktrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(poster).not.toHaveTextContent(/THE LIVING ARCHIVE|SELECTED WORK|Sample world|Entirely silent|Four little worlds|waiting to be opened/);
 });
 it('tells its story as one described picture, with nothing to operate',()=>{
  render(<InkTracePress still/>);
  const poster=screen.getByRole('region',{name:'PROJECTS'});
  expect(within(poster).getByRole('img',{name:/printed zine/}).tagName).toBe('CANVAS');
  expect(within(poster).queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 });
 it('prints the finished sheet straight away when motion is paused',()=>{
  render(<InkTracePress still/>);
  expect(screen.getByRole('region',{name:'PROJECTS'})).toHaveAttribute('data-quiet','true');
  expect(document.querySelector('[data-print-stage]')).toHaveAttribute('data-playing','false');
  // The finished sheet ends on the mark, so both ways in are live straight away.
  expect(screen.getByRole('link',{name:/Try InkTrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(screen.getByRole('link',{name:/How InkTrace is built/})).toHaveAttribute('href','https://github.com/JackieNonSense/inktrace-showcase');
  expect(screen.getByRole('link',{name:/Try InkTrace/})).toHaveAttribute('tabindex','0');
  // Nothing to replay when nothing moves.
  expect(screen.queryByRole('button',{name:/REPRINT/})).not.toBeInTheDocument();
 });
 it('does the same for reduced-motion visitors even when the homepage is running',()=>{
  // tests/setup.ts reports prefers-reduced-motion as matching.
  render(<InkTracePress/>);
  expect(screen.getByRole('region',{name:'PROJECTS'})).toHaveAttribute('data-quiet','true');
 });
 it('plays the run by itself otherwise, with the ways in out of reach until it ends',()=>{
  const original=window.matchMedia;
  const media=vi.spyOn(window,'matchMedia').mockImplementation(query=>({...original(query),matches:false}));
  try{
   render(<InkTracePress/>);
   expect(screen.getByRole('region',{name:'PROJECTS'})).toHaveAttribute('data-quiet','false');
   expect(document.querySelector('[data-print-stage]')).toHaveAttribute('data-playing','true');
   // At the top of the run the ways in are not printed yet: out of reach and out of the tab order.
   expect(screen.queryByRole('link',{name:/Try InkTrace/})).not.toBeInTheDocument();
   expect(document.querySelector('a[href="https://inktrace.app"][tabindex="-1"]')).not.toBeNull();
  }finally{media.mockRestore();}
 });
});
