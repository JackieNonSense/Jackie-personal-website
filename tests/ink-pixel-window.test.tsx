import {fireEvent,render,screen,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import PixelShowcase from '../components/studies/inktrace-pixel/PixelShowcase';
const open=()=>fireEvent.click(screen.getByRole('button',{name:'Open InkTrace demo'}));
describe('pixel-window interface',()=>{
 it('keeps the external visit link outside its closed window',()=>{
  render(<PixelShowcase still/>);
  expect(screen.getByRole('link',{name:/Visit InkTrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(screen.queryByRole('region',{name:'InkTrace feature demo'})).not.toBeInTheDocument();
 });
 it('opens an accessible labelled window and starts on Timeline',()=>{
  render(<PixelShowcase still/>);open();
  expect(screen.getByRole('region',{name:'InkTrace feature demo'})).toBeVisible();
  expect(screen.getByRole('tab',{name:/Timeline/})).toHaveAttribute('aria-selected','true');
  expect(screen.getByText('FEATURE DEMO / SAMPLE CONTENT')).toBeVisible();
 });
 it('moves tab focus without automatically activating a film',()=>{
  render(<PixelShowcase still/>);open();
  const first=screen.getByRole('tab',{name:/Timeline/});first.focus();
  fireEvent.keyDown(first,{key:'ArrowRight'});
  const second=screen.getByRole('tab',{name:/Characters/});expect(second).toHaveFocus();
  expect(first).toHaveAttribute('aria-selected','true');
  fireEvent.keyDown(second,{key:'Enter'});expect(second).toHaveAttribute('aria-selected','true');
 });
 it('offers all four films and never wraps past Wiki',()=>{
  render(<PixelShowcase still/>);open();
  fireEvent.click(screen.getByRole('tab',{name:/Wiki/}));
  expect(screen.getByRole('button',{name:'Next feature'})).toBeDisabled();
  expect(screen.getByText('04 / 04')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Previous feature'}));
  expect(screen.getByRole('tab',{name:/AI Assistant/})).toHaveAttribute('aria-selected','true');
 });
 it('supports static keyframes and marks AI results as awaiting confirmation',()=>{
  render(<PixelShowcase still/>);open();
  fireEvent.click(screen.getByRole('tab',{name:/AI Assistant/}));
  const next=screen.getByRole('button',{name:'Next keyframe'});
  fireEvent.click(next);fireEvent.click(next);
  expect(screen.getByText('Waiting for your confirmation')).toBeVisible();
  fireEvent.click(next);expect(screen.getByText('Board created in this demo')).toBeVisible();
 });
 it('closes with Escape, returns focus, then reopens on Timeline',()=>{
  render(<PixelShowcase still/>);open();
  fireEvent.click(screen.getByRole('tab',{name:/Wiki/}));
  fireEvent.keyDown(screen.getByRole('region',{name:'InkTrace feature demo'}),{key:'Escape'});
  expect(screen.getByRole('button',{name:'Open InkTrace demo'})).toHaveFocus();
  open();expect(screen.getByRole('tab',{name:/Timeline/})).toHaveAttribute('aria-selected','true');
 });
 it('keeps an operable launcher when the sprite fails',()=>{
  render(<PixelShowcase still/>);
  const launcher=screen.getByRole('button',{name:'Open InkTrace demo'});
  fireEvent.error(within(launcher).getByAltText(''));
  expect(launcher).toBeEnabled();open();expect(screen.getByRole('tablist')).toBeVisible();
 });
 it('contains no audio, video player, iframe or editable product form',()=>{
  const {container}=render(<PixelShowcase still/>);open();
  expect(container.querySelector('audio,video,iframe,input,textarea')).toBeNull();
 });
 it('opens a real event drawer from an object on the book, and can close it',()=>{
  render(<PixelShowcase still/>);open();
  fireEvent.click(screen.getByRole('button',{name:'Read event: The archive opens'}));
  const drawer=screen.getByRole('region',{name:'Event archive'});
  expect(within(drawer).getByText('Chapter I')).toBeVisible();
  expect(within(drawer).getByText('Mara · Ivo')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Put away event'}));
  expect(screen.queryByRole('region',{name:'Event archive'})).not.toBeInTheDocument();
 });
 it('removes a selected event when another chapter is activated',()=>{
  render(<PixelShowcase still/>);open();
  fireEvent.click(screen.getByRole('button',{name:'Read event: The archive opens'}));
  fireEvent.click(screen.getByRole('tab',{name:/Characters/}));
  expect(screen.queryByRole('region',{name:'Event archive'})).not.toBeInTheDocument();
 });
});
