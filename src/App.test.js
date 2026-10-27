import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

test('renders the Food Timer header', () => {
  render(<App />);
  expect(screen.getByText(/food timer/i)).toBeInTheDocument();
});

test('shows an empty plan before dishes are added', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /your plan/i })).toBeInTheDocument();
  expect(screen.getByText(/add a dish above/i)).toBeInTheDocument();
});

test('parses "50 mins" total with a "25 mins" step-2 and auto-calculates the remaining time', () => {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/food name/i), { target: { value: 'Lasagna' } });
  fireEvent.change(screen.getByPlaceholderText(/total time/i), { target: { value: '50 mins' } });
  fireEvent.change(screen.getByPlaceholderText(/action/i), { target: { value: 'flip' } });
  fireEvent.change(screen.getByPlaceholderText(/at \(mins\)/i), { target: { value: '25 mins' } });

  // Live auto-calc hint: 50 - 25 = 25 minutes left after the flip
  expect(screen.getByText(/then cook 25 min more/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /add dish/i }));

  expect(screen.getByText('Lasagna')).toBeInTheDocument();
  expect(screen.getByText(/50 min total .* flip after 25 min/i)).toBeInTheDocument();
});

test('"your plan" keeps shortest items at the bottom as dishes are added', () => {
  render(<App />);
  const addDish = (name, total) => {
    fireEvent.change(screen.getByPlaceholderText(/food name/i), { target: { value: name } });
    fireEvent.change(screen.getByPlaceholderText(/total time/i), { target: { value: total } });
    fireEvent.click(screen.getByRole('button', { name: /add dish/i }));
  };

  addDish('Veg', '30 mins');
  addDish('Beef', '50 mins');
  addDish('Potato', '40 mins');

  const names = screen.getAllByText(/veg|beef|potato/i).map((el) => el.textContent);
  // Sorted longest -> shortest, so the shortest ("Veg") is last (bottom)
  expect(names.slice(0, 3)).toEqual(['Beef', 'Potato', 'Veg']);
});

test('step-2 time outside the total range blocks adding the dish', () => {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/food name/i), { target: { value: 'Soup' } });
  fireEvent.change(screen.getByPlaceholderText(/total time/i), { target: { value: '30' } });
  fireEvent.change(screen.getByPlaceholderText(/action/i), { target: { value: 'stir' } });
  fireEvent.change(screen.getByPlaceholderText(/at \(mins\)/i), { target: { value: '45' } });

  expect(screen.getByText(/step 2 time must be between 0 and the total time/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add dish/i })).toBeDisabled();
});

test('start cooking runs the staggered schedule and alerts at each event', () => {
  jest.useFakeTimers();
  render(<App />);
  const addDish = (name, total, action, at) => {
    fireEvent.change(screen.getByPlaceholderText(/food name/i), { target: { value: name } });
    fireEvent.change(screen.getByPlaceholderText(/total time/i), { target: { value: total } });
    if (action) {
      fireEvent.change(screen.getByPlaceholderText(/action/i), { target: { value: action } });
      fireEvent.change(screen.getByPlaceholderText(/at \(mins\)/i), { target: { value: at } });
    }
    fireEvent.click(screen.getByRole('button', { name: /add dish/i }));
  };

  // Beef: 50 total, flip at 25 -> start now, flip at +25
  // Veg : 30 total            -> start at +20 so both finish at +50
  addDish('Beef', '50 mins', 'flip', '25 mins');
  addDish('Veg', '30 mins');

  fireEvent.click(screen.getByRole('button', { name: /start cooking/i }));

  // First alarm fires immediately (offset 0): start Beef
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByText(/start "beef" now/i)).toBeInTheDocument();

  // Dismiss -> next event in 20 minutes: start Veg
  fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
  act(() => {
    jest.advanceTimersByTime(20 * 60 * 1000);
  });
  expect(screen.getByText(/start "veg" now/i)).toBeInTheDocument();

  // Dismiss -> next event in 5 minutes: flip the Beef
  fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
  act(() => {
    jest.advanceTimersByTime(5 * 60 * 1000);
  });
  expect(screen.getByText(/flip the "beef"/i)).toBeInTheDocument();

  jest.useRealTimers();
});
