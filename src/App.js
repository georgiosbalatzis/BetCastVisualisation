import React, { useState, useEffect } from 'react';
import './App.css';
import BettingVisualizations from './components/BetCast';

function App() {
    const [darkMode] = useState(true);

    useEffect(() => {
        document.body.className = darkMode ? 'dark-mode' : 'light-mode';
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);


    return (
        <div className="App">
            <header className="bg-blue-600 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="F1 Stories Logo" className="mr-3" style={{height: '40px'}} />
                        <h1 className="text-xl font-bold">BetCast F1Stories</h1>
                    </div>
                    <div className="flex items-center">
                        <div className="text-sm">
                            <span>Powered by Georgios Balatzis & F1 Stories</span>
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
                            Visit us at F1Stories.gr
                        </a>
                    </p>
                    <div className="social-media mt-3">
                        <a href="https://www.youtube.com/@F1_Stories_Original" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-youtube"></i>
                        </a>
                        <a href="https://www.facebook.com/f1storiess" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        <a href="https://www.instagram.com/myf1stories/" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://www.tiktok.com/@f1stories6" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-tiktok"></i>
                        </a>
                        <a href="mailto:myf1stories@gmail.com">
                            <i className="fas fa-envelope"></i>
                        </a>
                        <a href="https://open.spotify.com/show/0qC80ahDY824BME9FtxryS?si=bae4f48cf1ee4ded" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-spotify"></i>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;