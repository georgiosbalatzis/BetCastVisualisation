import React from 'react';
import './App.css';
import BettingVisualizations from './components/BetCast';

function App() {
    return (
        <div className="App">
            <header className="bg-blue-600 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">BetCast</h1>
                    <div className="text-sm">
                        <span>Powered by Georgios Balatzis and F1Stories team</span>
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