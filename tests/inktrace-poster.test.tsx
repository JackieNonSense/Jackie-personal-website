import {fireEvent,render,screen,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import LivingArchive from '../components/studies/inktrace-living/LivingArchive';
import {StrictMode} from 'react';

describe('homepage InkTrace poster',()=>{
 it('keeps the normal poster copy and visit link without study explanations',()=>{
  render(<LivingArchive embedded still/>);
  const poster=screen.getByRole('region',{name:'PROJECTS'});
  expect(within(poster).getByText(/An independent/)).toHaveTextContent('An independent space for creation.');
  expect(within(poster).getByRole('link',{name:/Visit Inktrace/})).toHaveAttribute('href','https://inktrace.app');
  expect(poster).not.toHaveTextContent(/THE LIVING ARCHIVE|SELECTED WORK|Sample world|Entirely silent|Four little worlds|waiting to be opened|ONE CONNECTED WORLD/);
  expect(within(poster).getByRole('button',{name:'Open the Living Archive'})).not.toHaveTextContent(/Open|Time|People/);
 });
 it('opens a separate non-modal window while keeping the original book and paper mounted',()=>{
  render(<LivingArchive embedded still/>);
  const poster=screen.getByRole('region',{name:'PROJECTS'});
  const book=within(poster).getByRole('button',{name:'Open the Living Archive'});
  const originalOverflow=document.body.style.overflow;
  fireEvent.click(book);
  const dialog=screen.getByRole('dialog',{name:'InkTrace — Timeline'});
  expect(dialog).toHaveAttribute('aria-modal','false');
  expect(poster).not.toContainElement(dialog);
  expect(within(poster).getByRole('button',{name:'Open the Living Archive'})).toBe(book);
  expect(document.body.style.overflow).toBe(originalOverflow);
  expect(screen.getByRole('button',{name:'Close Living Archive'})).toHaveFocus();
  expect(dialog).not.toHaveTextContent('FEATURE DEMO / SAMPLE CONTENT');
  expect(dialog).toHaveAttribute('aria-description','An interactive feature demonstration using independent sample content.');
 });
 it('does not steal focus on the initial StrictMode render',()=>{
  render(<StrictMode><LivingArchive embedded still/></StrictMode>);
  expect(screen.getByRole('button',{name:'Open the Living Archive'})).not.toHaveFocus();
 });
 it('returns focus on Escape and reopens from Timeline after exploring Wiki',()=>{
  render(<LivingArchive embedded still/>);
  const book=screen.getByRole('button',{name:'Open the Living Archive'});
  fireEvent.click(book);
  fireEvent.click(screen.getByRole('tab',{name:/Wiki/}));
  fireEvent.click(screen.getByRole('button',{name:'Wrap right'}));
  expect(document.querySelector('[data-wiki-image]')).toHaveStyle({float:'right',width:'44%'});
  fireEvent.keyDown(screen.getByRole('dialog',{name:'InkTrace — Wiki'}),{key:'Escape'});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(book).toHaveFocus();
  fireEvent.click(book);
  expect(screen.getByRole('dialog',{name:'InkTrace — Timeline'})).toBeVisible();
  expect(screen.getByRole('button',{name:'Next key step'})).toBeEnabled();
  expect(document.querySelector('audio,video,iframe')).toBeNull();
 });
 it('does not close or change the window when the outside poster is clicked',()=>{
  render(<LivingArchive embedded still/>);
  fireEvent.click(screen.getByRole('button',{name:'Open the Living Archive'}));
  fireEvent.click(screen.getByRole('region',{name:'PROJECTS'}));
  expect(screen.getByRole('dialog',{name:'InkTrace — Timeline'})).toBeVisible();
  expect(screen.getAllByRole('tab')).toHaveLength(4);
 });
});
