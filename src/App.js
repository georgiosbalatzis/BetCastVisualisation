import React, { useState, useEffect } from 'react';
import './App.css';
import BettingVisualizations from './components/BetCast';

function App() {
    const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

    useEffect(() => {
        document.body.className = darkMode ? 'dark-mode' : 'light-mode';
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    return (
        <div className="App">
            <header className="bg-blue-600 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">BetCast F1Stories</h1>
                    <div className="flex items-center">
                        <button 
                            onClick={toggleTheme} 
                            className="theme-toggle mr-4 p-2 rounded-full flex items-center justify-center"
                            aria-label="Toggle theme"
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5"></circle>
                                    <line x1="12" y1="1" x2="12" y2="3"></line>
                                    <line x1="12" y1="21" x2="12" y2="23"></line>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                    <line x1="1" y1="12" x2="3" y2="12"></line>
                                    <line x1="21" y1="12" x2="23" y2="12"></line>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                </svg>
                            )}
                        </button>
                        <div className="text-sm">
                            <span>Powered by Georgios Balatzis</span>
                        </div>
                    </div>
                </div>
            </header>

            <BettingVisualizations />

            <footer className="bg-gray-800 text-white p-4 text-center text-sm">
                <div className="container mx-auto">
                    <p>© {new Date().getFullYear()} BetCast - Αναλυτικά Στατιστικά Στοιχημάτων</p>
                    <p className="mt-2">
                        <a
                            href="https://f1stories.gr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:underline"
                        >
                            View on F1stories.gr
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;