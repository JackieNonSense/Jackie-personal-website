import {fireEvent,render,screen,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import ReviewGallery from '../components/studies/inktrace-living-review/ReviewGallery';

describe('living archive phase-one art review',()=>{
 it('renders and switches scenes without React child-key warnings',()=>{
  const errors:unknown[][]=[];
  const observe=vi.spyOn(console,'error').mockImplementation((...args:unknown[])=>{errors.push(args);});
  try{
   render(<ReviewGallery still/>);
   for(const label of ['Characters','AI Assistant','Wiki','Timeline'])fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
   expect(errors.filter(args=>args.some(arg=>String(arg).includes('unique "key"')))).toEqual([]);
  }finally{observe.mockRestore();}
 });
 it('clearly identifies concepts rather than claiming a working product demo',()=>{
  render(<ReviewGallery still/>);
  expect(screen.getByText('PHASE 01 / ART DIRECTION')).toBeVisible();
  expect(screen.getByText(/These boards preserve the approved art direction/)).toBeVisible();
  expect(screen.getByRole('link',{name:/Open playable archive/})).toHaveAttribute('href','/studies/inktrace/living-archive');
  expect(screen.getByRole('link',{name:/Visit InkTrace/})).toHaveAttribute('href','https://inktrace.app');
 });
 it('keeps the mobile heading separated and accurately describes the timeline overview',()=>{
  render(<ReviewGallery still/>);
  expect(screen.getByRole('heading',{name:'The living archive.'})).toBeVisible();
  expect(screen.getByText(/the reading slot shows the year overview/)).toBeVisible();
  expect(screen.getByText(/This study does not replace the homepage/)).toBeVisible();
 });
 it('uses four distinct boards and keeps artwork separate from readable action notes',()=>{
  render(<ReviewGallery still/>);
  for(const [label,id] of [['Timeline','timeline'],['Characters','characters'],['AI Assistant','ai'],['Wiki','wiki']]){
   fireEvent.click(screen.getByRole('tab',{name:new RegExp(label)}));
   const panel=screen.getByRole('tabpanel');
   expect(within(panel).getByRole('img')).toHaveAttribute('src',`/studies/inktrace/living-archive/review/${id}-board.png`);
   expect(within(panel).getByRole('region',{name:'Action storyboard'})).toBeVisible();
   expect(within(panel).getByText('Default / information expanded')).toBeVisible();
  }
 });
 it('moves tab focus manually without changing the selected scene',()=>{
  render(<ReviewGallery still/>);
  const first=screen.getByRole('tab',{name:/Timeline/});first.focus();
  fireEvent.keyDown(first,{key:'ArrowRight'});
  const second=screen.getByRole('tab',{name:/Characters/});
  expect(second).toHaveFocus();expect(first).toHaveAttribute('aria-selected','true');
  fireEvent.keyDown(second,{key:'Enter'});expect(second).toHaveAttribute('aria-selected','true');
  fireEvent.keyDown(second,{key:'End'});expect(screen.getByRole('tab',{name:/Wiki/})).toHaveFocus();
  expect(second).toHaveAttribute('aria-selected','true');
 });
 it('keeps the storyboard and a retry control when artwork fails',()=>{
  render(<ReviewGallery still/>);
  fireEvent.error(within(screen.getByRole('tabpanel')).getByRole('img'));
  expect(screen.getByText('Concept image unavailable. The action plan remains readable below.')).toBeVisible();
  expect(screen.getByRole('region',{name:'Action storyboard'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Retry concept image'}));
  expect(within(screen.getByRole('tabpanel')).getByRole('img')).toBeVisible();
 });
 it('shows real text specimens and never starts audio or embeds the product',()=>{
  const {container}=render(<ReviewGallery still/>);
  const specimen=screen.getByRole('region',{name:'Fusion Pixel live type specimen'});
  expect(within(specimen).getByText('The archive remembers.')).toHaveAttribute('data-type-size','32');
  expect(within(specimen).getByText('A record, not a popup.')).toHaveAttribute('data-type-size','24');
  expect(within(specimen).getByText('312 / 09 / 21 — 01 : 06')).toHaveAttribute('data-type-size','16');
  expect(container.querySelector('audio,video,iframe')).toBeNull();
 });
 it('explains that AI confirmation is a visitor action and Wiki uses real reflow',()=>{
  render(<ReviewGallery still/>);
  fireEvent.click(screen.getByRole('tab',{name:/AI Assistant/}));
  expect(screen.getByText(/Only your confirmation starts the archive action/)).toBeVisible();
  fireEvent.click(screen.getByRole('tab',{name:/Wiki/}));
  expect(screen.getByText(/The image narrows and moves right; live text reflows around it/)).toBeVisible();
 });
});
