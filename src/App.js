import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [foodItems, setFoodItems] = useState([]);
  const [foodName, setFoodName] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [isCooking, setIsCooking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [nextItem, setNextItem] = useState(null);



  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const startCooking = () => {
    if (foodItems.length > 0) {
      const sortedItems = [...foodItems].sort((a, b) => b.time - a.time);
      setFoodItems(sortedItems);

      if (sortedItems.length > 1) {
        setNextItem(sortedItems[1]);
        setTimer((sortedItems[0].time - sortedItems[1].time) * 60);
      } else {
        setNextItem(null);
        setTimer(sortedItems[0].time * 60);
      }

      setIsCooking(true);
    }
  };

  useEffect(() => {
    if (isCooking && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (isCooking && timer === 0) {
      const audio = new Audio('/alarm.mp3'); // Placeholder for the alarm sound
      audio.play();

      const message = nextItem ? `Time to add ${nextItem.name}!` : 'All food is ready!';
      setModalMessage(message);
      setShowModal(true);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message);
      }

      const currentIndex = foodItems.findIndex(item => item.name === nextItem.name);
      const nextIndex = currentIndex + 1;

      if (nextIndex < foodItems.length) {
        const nextFoodItem = foodItems[nextIndex];
        setNextItem(nextFoodItem);
        if (foodItems[nextIndex + 1]) {
          setTimer((nextFoodItem.time - foodItems[nextIndex + 1].time) * 60);
        } else {
          setTimer(nextFoodItem.time * 60);
        }
      } else {
        setIsCooking(false);
      }
    }
  }, [isCooking, timer, foodItems, nextItem]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const foodNameInputRef = React.useRef(null);
  const cookTimeInputRef = React.useRef(null);

  const handleFoodNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      cookTimeInputRef.current.focus();
    }
  };

  const handleCookTimeKeyDown = (e) => {
    if (e.key === 'Enter') {
      addFoodItem();
    }
  };

  const addFoodItem = () => {
    if (foodName && cookTime > 0) {
      setFoodItems([...foodItems, { name: foodName, time: parseInt(cookTime, 10) }]);
      setFoodName('');
      setCookTime('');
      foodNameInputRef.current.focus();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Food Timer</h1>
      </header>
      {!isCooking ? (
        <div>
          <div className="form-container">
            <input
              ref={foodNameInputRef}
              type="text"
              placeholder="Food Name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              onKeyDown={handleFoodNameKeyDown}
            />
            <input
              ref={cookTimeInputRef}
              type="number"
              placeholder="Cooking Time (minutes)"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              onKeyDown={handleCookTimeKeyDown}
            />
            <button onClick={addFoodItem}>Add</button>
          </div>
          <p className="instruction-text">Press Enter to advance or submit.</p>
          <button onClick={startCooking} className="start-cooking-btn">Start Cooking</button>
        </div>
      ) : (
        <div className="timer-container">
          {nextItem && <p>Next up: {nextItem.name}</p>}
          <h2>{formatTime(timer)}</h2>
        </div>
      )}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <p>{modalMessage}</p>
            <button onClick={() => setShowModal(false)}>Dismiss</button>
          </div>
        </div>
      )}
      <ul>
        {foodItems.map((food, index) => (
          <li key={index}>
            <span>{food.name}</span>
            <span>{food.time} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;