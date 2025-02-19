import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API_URLS = {
  en: "https://random-word-api.herokuapp.com/word?number=1",
  es: "https://es.wiktionary.org/w/api.php?action=query&list=random&rnnamespace=0&format=json&origin=*",
  fr: "https://fr.wiktionary.org/w/api.php?action=query&list=random&rnnamespace=0&format=json&origin=*",
  de: "https://de.wiktionary.org/w/api.php?action=query&list=random&rnnamespace=0&format=json&origin=*",
};

const KEYBOARDS = {
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
  fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÆÇÈÉÊËÎÏÔŒÙÛÜŸ",
  de: "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
};

function App() {
  // State variables
  const [selectedWord, setSelectedWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [incorrectGuesses, setIncorrectGuesses] = useState(0);
  const [maxMistakes, setMaxMistakes] = useState(6);
  const [lang, setLang] = useState("en");
  const [difficulty, setDifficulty] = useState("medium");
  const [falling, setFalling] = useState(false);
  const [fallOffset, setFallOffset] = useState(0);
  const [playerName, setPlayerName] = useState(
    sessionStorage.getItem("playerName") || "Guest"
  );
  const [wins, setWins] = useState(Number(sessionStorage.getItem("wins")) || 0);
  const [losses, setLosses] = useState(
    Number(sessionStorage.getItem("losses")) || 0
  );
  const [streak, setStreak] = useState(
    Number(sessionStorage.getItem("streak")) || 0
  );
  const [musicOn, setMusicOn] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Refs for canvas and audio elements
  const canvasRef = useRef(null);
  const bgMusicRef = useRef(null);
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);
  const winSoundRef = useRef(null);
  const gameoverSoundRef = useRef(null);

  // updateScoreboard: updates state from sessionStorage
  const updateScoreboard = useCallback(() => {
    setWins(Number(sessionStorage.getItem("wins")) || wins);
    setLosses(Number(sessionStorage.getItem("losses")) || losses);
    setStreak(Number(sessionStorage.getItem("streak")) || streak);
    setPlayerName(sessionStorage.getItem("playerName") || playerName);
  }, [wins, losses, streak, playerName]);

  // updateDifficulty
  const updateDifficulty = useCallback(() => {
    if (difficulty === "easy") setMaxMistakes(8);
    else if (difficulty === "hard") setMaxMistakes(4);
    else setMaxMistakes(6);
  }, [difficulty]);

  // fetchWord
  const fetchWord = useCallback(async () => {
    updateDifficulty();
    try {
      let response, data;
      if (lang === "en") {
        response = await fetch(API_URLS.en);
        data = await response.json();
        if (data && data[0]) {
          setSelectedWord(data[0].toUpperCase());
        } else {
          throw new Error("Random Word API failed");
        }
      } else {
        response = await fetch(API_URLS[lang]);
        data = await response.json();
        if (data.query?.random?.[0]?.title) {
          setSelectedWord(data.query.random[0].title.toUpperCase());
        } else {
          throw new Error("Wiktionary API failed");
        }
      }
    } catch (error) {
      console.error("Error fetching word:", error);
      setSelectedWord("HANGMAN");
    }
    setGuessedLetters([]);
    setIncorrectGuesses(0);
    setFalling(false);
    setFallOffset(0);
    setGameOver(false);
  }, [lang, updateDifficulty]);

  // displayWord
  const displayWord = useCallback(() => {
    return selectedWord
      .split("")
      .map((letter) => (guessedLetters.includes(letter) ? letter : "_"))
      .join(" ");
  }, [selectedWord, guessedLetters]);

  // drawStickFigure
  const drawStickFigure = useCallback(
    (ctx) => {
      if (incorrectGuesses > 0) {
        ctx.beginPath();
        ctx.arc(130, 70, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (incorrectGuesses > 1) {
        ctx.moveTo(130, 90);
        ctx.lineTo(130, 150);
        ctx.stroke();
      }
      if (incorrectGuesses > 2) {
        ctx.moveTo(130, 110);
        ctx.lineTo(110, 130);
        ctx.stroke();
      }
      if (incorrectGuesses > 3) {
        ctx.moveTo(130, 110);
        ctx.lineTo(150, 130);
        ctx.stroke();
      }
      if (incorrectGuesses > 4) {
        ctx.moveTo(130, 150);
        ctx.lineTo(110, 180);
        ctx.stroke();
      }
      if (incorrectGuesses > 5) {
        ctx.moveTo(130, 150);
        ctx.lineTo(150, 180);
        ctx.stroke();
      }
    },
    [incorrectGuesses]
  );

  // drawHangman
  const drawHangman = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 250;
    canvas.height = 250;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#39ff14";

    // Draw gallows (fixed)
    ctx.beginPath();
    ctx.moveTo(20, 230);
    ctx.lineTo(180, 230);
    ctx.moveTo(50, 230);
    ctx.lineTo(50, 30);
    ctx.lineTo(130, 30);
    ctx.lineTo(130, 50);
    ctx.stroke();

    // Draw stick figure with falling effect if applicable
    if (falling) {
      ctx.save();
      ctx.translate(0, fallOffset);
      drawStickFigure(ctx);
      ctx.restore();
    } else {
      drawStickFigure(ctx);
    }
  }, [falling, fallOffset, drawStickFigure]);

  // Handle a letter guess
  const handleGuess = (letter) => {
    if (guessedLetters.includes(letter)) return;
    const newGuessed = [...guessedLetters, letter];
    setGuessedLetters(newGuessed);
    if (!selectedWord.includes(letter)) {
      setIncorrectGuesses((prev) => prev + 1);
      wrongSoundRef.current.play();
    } else {
      correctSoundRef.current.play();
    }
  };

  // Render keyboard buttons
  const renderKeyboard = () => {
    return KEYBOARDS[lang].split("").map((letter) => {
      let btnClass = "keyboard-btn keyboard-btn-large";
      if (guessedLetters.includes(letter)) {
        btnClass += selectedWord.includes(letter) ? " correct" : " wrong";
      }
      return (
        <button
          key={letter}
          className={`btn btn-primary m-1 ${btnClass}`}
          onClick={() => handleGuess(letter)}
          disabled={guessedLetters.includes(letter)}
        >
          {letter}
        </button>
      );
    });
  };

  // Effects: fetch word on language/difficulty change and on mount
  useEffect(() => {
    fetchWord();
  }, [lang, difficulty, fetchWord]);

  useEffect(() => {
    fetchWord();
  }, [fetchWord]);

  // Check win/loss conditions
  useEffect(() => {
    drawHangman();
    if (incorrectGuesses >= maxMistakes && !gameOver) {
      gameoverSoundRef.current.play();
      alert(`💀 Game Over! The word was: ${selectedWord}`);
      setLosses((prev) => {
        const newLoss = prev + 1;
        sessionStorage.setItem("losses", newLoss);
        return newLoss;
      });
      setStreak(0);
      sessionStorage.setItem("streak", 0);
      updateScoreboard();
      setFalling(true);
      setGameOver(true);
    } else if (selectedWord && !displayWord().includes("_") && !gameOver) {
      winSoundRef.current.play();
      alert("🎉 You Win! The word was: " + selectedWord);
      setWins((prev) => {
        const newWin = prev + 1;
        sessionStorage.setItem("wins", newWin);
        return newWin;
      });
      setStreak((prev) => {
        const newStreak = prev + 1;
        sessionStorage.setItem("streak", newStreak);
        return newStreak;
      });
      updateScoreboard();
      setGameOver(true);
      setTimeout(() => fetchWord(), 1500);
    }
  }, [
    incorrectGuesses,
    guessedLetters,
    selectedWord,
    maxMistakes,
    drawHangman,
    displayWord,
    updateScoreboard,
    fetchWord,
    gameOver,
  ]);

  // Animate falling effect
  useEffect(() => {
    if (falling && fallOffset < 300) {
      const animation = requestAnimationFrame(() =>
        setFallOffset(fallOffset + 5)
      );
      return () => cancelAnimationFrame(animation);
    } else if (falling && fallOffset >= 300) {
      setFalling(false);
      setFallOffset(0);
      fetchWord();
    }
  }, [falling, fallOffset, fetchWord]);

  // Toggle music using state
  const handleMusicToggle = () => {
    if (bgMusicRef.current.paused) {
      bgMusicRef.current.play();
      setMusicOn(true);
    } else {
      bgMusicRef.current.pause();
      setMusicOn(false);
    }
  };

  return (
    <div className="App">
      {/* Wrapper to center all content */}
      <div className="w-100 d-flex flex-column align-items-center">
        <div className="container text-center mt-4 p-4 bg-dark rounded">
          {/* Top Controls */}
          <h1 className="mb-3 neon-title neon-title-medium">
            {" "}
            Welcome to Neon Hangman
          </h1>{" "}
          <div className="row mb-4 justify-content-center align-items-center">
            <div className="col-12 mb-3">
              <button
                id="toggle-music"
                className="btn btn-neon btn-large"
                onClick={handleMusicToggle}
              >
                {musicOn ? "Mute Music" : "Play Music"}
              </button>
            </div>
            <div className="col-auto mb-3">
              <label
                htmlFor="language-select"
                className="fw-bold neon-label me-2"
              >
                🌍 Language:
              </label>
              <select
                id="language-select"
                className="form-select neon-select d-inline-block w-auto"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
                <option value="de">🇩🇪 German</option>
              </select>
            </div>
            <div className="col-auto mb-3">
              <label
                htmlFor="difficulty-select"
                className="fw-bold neon-label me-2"
              >
                🎯 Difficulty:
              </label>
              <select
                id="difficulty-select"
                className="form-select neon-select d-inline-block w-auto"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">😃 Easy</option>
                <option value="medium">😐 Medium</option>
                <option value="hard">😈 Hard</option>
              </select>
            </div>
          </div>
          {/* Game Area */}
          <div className="d-flex justify-content-center">
            <canvas id="hangmanCanvas" ref={canvasRef}></canvas>
          </div>
          <p
            id="word-display"
            className="fs-2 fw-bold mt-3 word-display-large"
            style={{ color: "#39ff14" }}
          >
            {displayWord()}
          </p>
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button
              id="hint-btn"
              className="btn btn-neon btn-large"
              onClick={() => {
                let remaining = selectedWord
                  .split("")
                  .filter((letter) => !guessedLetters.includes(letter));
                if (remaining.length > 0) {
                  const hintLetter =
                    remaining[Math.floor(Math.random() * remaining.length)];
                  setGuessedLetters([...guessedLetters, hintLetter]);
                }
              }}
            >
              💡 Hint
            </button>
            <button
              id="restart-btn"
              className="btn btn-neon btn-large"
              onClick={fetchWord}
            >
              🔄 Restart
            </button>
          </div>
          <div
            id="keyboard"
            className="d-flex flex-wrap justify-content-center mt-4 gap-2"
          >
            {renderKeyboard()}
          </div>
        </div>

        {/* Scoreboard (Centered at bottom) */}
        <div
          id="scoreboard"
          className="position-fixed bottom-0 start-50 translate-middle-x m-3 p-3 bg-secondary rounded"
        >
          <div className="mb-2">
            <label htmlFor="player-name" className="fw-bold neon-label">
              Enter Your Name:
            </label>
            <input
              type="text"
              id="player-name"
              className="form-control neon-select"
              placeholder="Your Name"
            />
            <button
              id="save-score"
              className="btn btn-neon mt-2"
              onClick={() => {
                const name =
                  document.getElementById("player-name").value.trim() ||
                  "Guest";
                setPlayerName(name);
                sessionStorage.setItem("playerName", name);
                updateScoreboard();
              }}
            >
              Save Name
            </button>
            <button
              id="toggle-scoreboard"
              className="btn btn-neon btn-sm mt-2"
              onClick={() => {
                const scoreboard = document.getElementById("scoreboard");
                const current = window.getComputedStyle(scoreboard).display;
                if (current === "none") {
                  scoreboard.style.display = "block";
                  document.getElementById("toggle-scoreboard").textContent =
                    "Hide Scoreboard";
                } else {
                  scoreboard.style.display = "none";
                  document.getElementById("toggle-scoreboard").textContent =
                    "Show Scoreboard";
                }
              }}
            >
              Hide Scoreboard
            </button>
          </div>
          <h4 className="text-light">
            Player: <span id="player-name-display">{playerName}</span>
          </h4>
          <p className="text-light mb-0">
            Wins:{" "}
            <span id="wins" className="text-success">
              {wins}
            </span>
          </p>
          <p className="text-light mb-0">
            Losses:{" "}
            <span id="losses" className="text-danger">
              {losses}
            </span>
          </p>
          <p className="text-light">
            Streak:{" "}
            <span id="streak" className="text-warning">
              {streak}
            </span>
          </p>
        </div>
      </div>

      {/* Audio Elements */}
      <audio
        id="bg-music"
        src="https://www.bensound.com/bensound-music/bensound-creativeminds.mp3"
        loop
        ref={bgMusicRef}
      ></audio>
      <audio
        id="correct-sound"
        src="https://www.fesliyanstudios.com/play-mp3/387"
        ref={correctSoundRef}
      ></audio>
      <audio
        id="wrong-sound"
        src="https://www.fesliyanstudios.com/play-mp3/388"
        ref={wrongSoundRef}
      ></audio>
      <audio
        id="win-sound"
        src="https://www.fesliyanstudios.com/play-mp3/389"
        ref={winSoundRef}
      ></audio>
      <audio
        id="gameover-sound"
        src="https://www.fesliyanstudios.com/play-mp3/390"
        ref={gameoverSoundRef}
      ></audio>
    </div>
  );
}

export default App;
