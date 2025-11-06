# Project Overview

This project is a "Food Timer" web application built with React. It allows users to input multiple food items with their respective cooking times. The application then calculates a cooking schedule to ensure all items are ready at the same time, providing alerts for when to start cooking each item.

**Key Technologies:**

*   **Frontend:** React.js
*   **Styling:** CSS

**Architecture:**

The application consists of a single main component, `App.js`, which manages the state and logic for the food timer. It uses React hooks (`useState`, `useEffect`) to handle user input, manage the list of food items, and control the timer.

# Building and Running

**1. Install Dependencies:**

To install the necessary dependencies, run the following command in your terminal:

```bash
npm install
```

**2. Run the Application:**

To start the development server and run the application locally, use the following command:

```bash
npm start
```

This will open the application in your default web browser at `http://localhost:3000`.

**3. Build for Production:**

To create a production-ready build of the application, run:

```bash
npm run build
```

This will generate a `build` directory with the optimized and minified application files.

**4. Run Tests:**

To run the test suite, use the following command:

```bash
npm test
```

# Development Conventions

*   **Component-Based:** The application is built using React's component-based architecture.
*   **Functional Components:** The codebase uses functional components with React hooks for state management and side effects.
*   **Styling:** Basic styling is provided in the `src/App.css` file.
*   **State Management:** The application state is managed locally within the `App` component using the `useState` hook.
