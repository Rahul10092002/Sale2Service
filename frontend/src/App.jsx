import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store.js";
import AppRoutes from "./routes/AppRoutes.jsx";

/**
 * Main App component
 * Sets up Redux Provider and Router for the entire application
 */
function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="App min-h-screen bg-gray-50 text-gray-900 dark:text-slate-100 transition-colors duration-300">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
