
import { useState } from 'react'
import allQuestions from '../data_component/data.json'

const DIFFICULTIES = [
    { name: 'Easy', tone: 'easy', description: 'The basics every football fan knows.' },
    { name: 'Medium', tone: 'medium', description: 'A proper test of your matchday knowledge.' },
    { name: 'Hard', tone: 'hard', description: 'For fans who remember the details.' },
    { name: 'Professional', tone: 'professional', description: 'Deep cuts for the devoted.' },
]

const LEADERBOARD_KEY = 'touchline-trivia-leaderboards'

function readLeaderboards() {
    try {
        return JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) || '{}')
    } catch {
        return {}
    }
}

function ArrowIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h11m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function LeaderboardTable({ entries }) {
    return (
        <div className="leaderboard-table" aria-live="polite">
            {entries.length ? entries.map((entry, index) => (
                <div className="leaderboard-row" key={`${entry.name}-${entry.date}-${index}`}>
                    <span className="leaderboard-rank">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{entry.name}</strong>
                    <span>{entry.score}<i> / {entry.total}</i></span>
                </div>
            )) : <p className="leaderboard-empty">No scores yet. Be the first on the board.</p>}
        </div>
    )
}

function Home() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [activeDifficulty, setActiveDifficulty] = useState('EASY')
    const [questionIndex, setQuestionIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [score, setScore] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [playerName, setPlayerName] = useState('')
    const [hasSubmittedScore, setHasSubmittedScore] = useState(false)
    const [leaderboards, setLeaderboards] = useState(readLeaderboards)
    const [leaderboardDifficulty, setLeaderboardDifficulty] = useState('EASY')

    const questions = allQuestions.filter((question) => question.difficulty === activeDifficulty)
    const currentQuestion = questions[questionIndex]
    const progress = questions.length ? ((questionIndex + (selectedAnswer === null ? 0 : 1)) / questions.length) * 100 : 0

    const startQuiz = (difficulty) => {
        setActiveDifficulty(difficulty)
        setQuestionIndex(0)
        setSelectedAnswer(null)
        setScore(0)
        setIsFinished(false)
        setHasSubmittedScore(false)
        setIsPlaying(true)
    }

    const chooseAnswer = (answer) => {
        if (selectedAnswer !== null || !currentQuestion) return
        setSelectedAnswer(answer)
        if (answer === currentQuestion.answer) setScore((currentScore) => currentScore + 1)
    }

    const moveToNextQuestion = () => {
        if (questionIndex === questions.length - 1) {
            setIsFinished(true)
            return
        }
        setQuestionIndex((currentIndex) => currentIndex + 1)
        setSelectedAnswer(null)
    }

    const submitScore = (event) => {
        event.preventDefault()
        const name = playerName.trim().slice(0, 18)
        if (!name || hasSubmittedScore) return

        const nextLeaderboards = {
            ...leaderboards,
            [activeDifficulty]: [
                ...(leaderboards[activeDifficulty] || []),
                { name, score, total: questions.length, date: new Date().toISOString() },
            ].sort((first, second) => second.score - first.score || second.total - first.total).slice(0, 10),
        }
        window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(nextLeaderboards))
        setLeaderboards(nextLeaderboards)
        setLeaderboardDifficulty(activeDifficulty)
        setHasSubmittedScore(true)
    }

    const selectedLeaderboard = leaderboards[leaderboardDifficulty] || []

    return (
        <main className="site-shell">
            <header className="topbar">
                <a className="brand" href="#home" aria-label="Touchline home">
                    <span className="brand-mark">T<span>.</span></span>
                    <span className="brand-name">TOUCHLINE<span>TRIVIA</span></span>
                </a>
                <nav className="main-nav" aria-label="Main navigation">
                    <a href="#categories">The quiz</a>
                    <a href="#how-to-play">How to play</a>
                </nav>
                <a className="nav-cta" href="#difficulty">Choose a level <ArrowIcon /></a>
            </header>

            {isPlaying ? (
                <section className="quiz-screen" id="play" aria-live="polite">
                    <div className="quiz-heading">
                        <span className="eyebrow"><span className="live-dot" /> {activeDifficulty} MATCHDAY CHALLENGE</span>
                    <button className="text-button" onClick={() => setIsPlaying(false)}>← Back to home</button>
                    </div>
                    {isFinished ? (
                        <div className="result-card">
                            <span className="result-icon">{score === questions.length ? '★' : '⚽'}</span>
                            <p className="eyebrow">{activeDifficulty} · FULL TIME</p>
                            <h1>{score === questions.length ? 'A perfect performance.' : 'That’s the final whistle.'}</h1>
                            <p className="result-score">You scored <strong>{score}</strong> out of <strong>{questions.length}</strong></p>
                            <p className="result-copy">{score === questions.length ? 'A flawless run. Put your name on the board.' : 'Your score is in. See where you rank against other fans.'}</p>
                            {!hasSubmittedScore ? (
                                <form className="score-entry" onSubmit={submitScore}>
                                    <label htmlFor="player-name">Add your name to the {activeDifficulty.toLowerCase()} leaderboard</label>
                                    <div className="score-entry-controls">
                                        <input id="player-name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength="18" placeholder="Your name" required />
                                        <button className="button button-primary" type="submit">Save score <ArrowIcon /></button>
                                    </div>
                                </form>
                            ) : <p className="saved-note">✓ Your score has been added to the {activeDifficulty.toLowerCase()} leaderboard.</p>}
                            <LeaderboardTable entries={leaderboards[activeDifficulty] || []} />
                            <div className="result-actions">
                                <button className="button button-primary" onClick={() => startQuiz(activeDifficulty)}>Play again <ArrowIcon /></button>
                                <button className="text-button" onClick={() => setIsPlaying(false)}>Back to home</button>
                            </div>
                        </div>
                    ) : (
                        <article className="question-card">
                            <div className="question-meta">
                                <span>{currentQuestion.category} · {activeDifficulty}</span>
                                <span>QUESTION {String(questionIndex + 1).padStart(2, '0')} <i>/ {String(questions.length).padStart(2, '0')}</i></span>
                            </div>
                            <div className="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
                                <span style={{ width: `${progress}%` }} />
                            </div>
                            <h1>{currentQuestion.question}</h1>
                            <div className="answer-list">
                                {currentQuestion.options.map((option, index) => {
                                    const isCorrect = option === currentQuestion.answer
                                    const answerClass = selectedAnswer === null ? '' : isCorrect ? ' answer-correct' : option === selectedAnswer ? ' answer-wrong' : ' answer-muted'
                                    return (
                                        <button className={`answer-option${answerClass}`} key={option} onClick={() => chooseAnswer(option)} disabled={selectedAnswer !== null}>
                                            <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                                            <span>{option}</span>
                                            {selectedAnswer !== null && isCorrect && <span className="answer-status">✓</span>}
                                            {selectedAnswer === option && !isCorrect && <span className="answer-status">×</span>}
                                        </button>
                                    )
                                })}
                            </div>
                            {selectedAnswer !== null && (
                                <div className="answer-feedback">
                                    <p><strong>{selectedAnswer === currentQuestion.answer ? 'That’s right.' : 'Not quite.'}</strong> {currentQuestion.explanation}</p>
                                    <button className="button button-primary" onClick={moveToNextQuestion}>
                                        {questionIndex === questions.length - 1 ? 'See results' : 'Next question'} <ArrowIcon />
                                    </button>
                                </div>
                            )}
                        </article>
                    )}
                </section>
            ) : (
                <>
                    <section className="hero" id="home">
                        <div className="hero-copy">
                            <span className="eyebrow"><span className="live-dot" /> YOUR NEXT FOOTBALL FIX</span>
                            <h1>How well do<br />you <span>know the game?</span></h1>
                            <p className="hero-description">Big moments. Cult heroes. The details only real fans remember. Step up to the spot and prove you know your football.</p>
                            <div className="hero-actions">
                                <a className="button button-primary" href="#difficulty">Choose your level <ArrowIcon /></a>
                                <span className="time-note"><span>◷</span> 5 questions · about 2 minutes</span>
                            </div>
                            <div className="hero-proof">
                                <div className="avatar-stack" aria-hidden="true"><span>⚽</span><span>🏆</span><span>⚡</span></div>
                                <p><strong>Four levels. Your call.</strong><br />No VAR. Just bragging rights.</p>
                            </div>
                        </div>
                        <div className="hero-visual" aria-label="Illustration of a football pitch under stadium lights">
                            <div className="visual-topline"><span>THE BEAUTIFUL GAME</span><span>EST. 90 MIN</span></div>
                            <div className="pitch-scene">
                                <div className="stadium-glow" />
                                <div className="pitch-lines"><span className="center-circle" /><span className="center-line" /><span className="penalty-box penalty-left" /><span className="penalty-box penalty-right" /></div>
                                <div className="football">⚽</div>
                                <div className="floating-card"><span className="floating-label">THE DAILY CHALLENGE</span><strong>One question<br />at a time.</strong><span className="floating-arrow"><ArrowIcon /></span></div>
                            </div>
                            <div className="visual-bottomline"><span>01 — 10</span><span>READY WHEN YOU ARE <b>↗</b></span></div>
                        </div>
                    </section>

                    <section className="ticker" aria-label="Quiz topics"><div className="ticker-track"><span>THE PREMIER LEAGUE</span><i>✳</i><span>WORLD CUP HISTORY</span><i>✳</i><span>LEGENDARY PLAYERS</span><i>✳</i><span>ICONIC MOMENTS</span><i>✳</i><span>THE PREMIER LEAGUE</span><i>✳</i><span>WORLD CUP HISTORY</span><i>✳</i></div></section>

                    <section className="difficulty-section" id="difficulty">
                        <div className="section-intro"><div><span className="eyebrow">PICK YOUR CHALLENGE</span><h2>Four levels.<br /><span>One beautiful game.</span></h2></div><p>Each round has five questions. Your score joins that level’s leaderboard.</p></div>
                        <div className="difficulty-grid">
                            {DIFFICULTIES.map((difficulty, index) => {
                                const count = allQuestions.filter((question) => question.difficulty === difficulty.name.toUpperCase()).length
                                return (
                                    <button className={`difficulty-card difficulty-${difficulty.tone}`} key={difficulty.name} onClick={() => startQuiz(difficulty.name.toUpperCase())}>
                                        <span className="difficulty-index">0{index + 1} / {String(count).padStart(2, '0')} QUESTIONS</span>
                                        <span className="difficulty-icon">{['◉', '◒', '◈', '✳'][index]}</span>
                                        <strong>{difficulty.name}</strong>
                                        <span className="difficulty-description">{difficulty.description}</span>
                                        <span className="difficulty-cta">Start challenge <ArrowIcon /></span>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className="details-section" id="categories">
                        <div className="section-intro"><span className="eyebrow">A LITTLE BIT OF EVERYTHING</span><h2>For the fans who<br />watch <span>every minute.</span></h2></div>
                        <div className="topic-grid">
                            <article className="topic-card topic-card-dark"><span className="topic-number">01 / HISTORY</span><span className="topic-icon">⌁</span><h3>Where legends<br />are made.</h3><p>Relive the goals, finals, and unforgettable turns that shaped the game.</p><span className="topic-count">WORLD CUP · CLUB FOOTBALL</span></article>
                            <article className="topic-card topic-card-green"><span className="topic-number">02 / THE PLAYERS</span><span className="topic-icon">✳</span><h3>Names you’ll<br />never forget.</h3><p>From record-breakers to cult heroes, how well do you know the greats?</p><span className="topic-count">LEGENDS · RECORDS · NUMBERS</span></article>
                            <article className="topic-card topic-card-outline"><span className="topic-number">03 / THE DETAILS</span><span className="topic-icon">↗</span><h3>It’s in the<br />little things.</h3><p>Test your touch on rules, rivalries, and moments from every era.</p><span className="topic-count">RULES · RIVALRIES · MORE</span></article>
                        </div>
                    </section>

                    <section className="leaderboard-section" id="leaderboards">
                        <div className="section-intro"><div><span className="eyebrow">THE TABLE</span><h2>Every level.<br /><span>Its own legends.</span></h2></div><p>Scores are saved in this browser, ready for your next matchday.</p></div>
                        <div className="leaderboard-panel">
                            <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard difficulty">
                                {DIFFICULTIES.map((difficulty) => {
                                    const level = difficulty.name.toUpperCase()
                                    return <button key={level} type="button" role="tab" aria-selected={leaderboardDifficulty === level} className={leaderboardDifficulty === level ? 'leaderboard-tab is-active' : 'leaderboard-tab'} onClick={() => setLeaderboardDifficulty(level)}>{difficulty.name}</button>
                                })}
                            </div>
                            <div className="leaderboard-heading"><span>RANK</span><span>PLAYER</span><span>SCORE</span></div>
                            <LeaderboardTable entries={selectedLeaderboard} />
                        </div>
                    </section>

                    <section className="how-section" id="how-to-play">
                        <div><span className="eyebrow">SIMPLE AS THAT</span><h2>Three steps.<br /><span>One winner.</span></h2></div>
                        <div className="steps-list"><div className="step"><span>01</span><p><strong>Pick your level.</strong> Choose Easy, Medium, Hard, or Professional.</p></div><div className="step"><span>02</span><p><strong>Trust your football brain.</strong> Answer five hand-picked questions. No lifelines, no VAR.</p></div><div className="step"><span>03</span><p><strong>Claim your place.</strong> Save your score and see how you rank in that level.</p></div></div>
                    </section>
                    <footer className="footer"><a className="brand" href="#home"><span className="brand-mark">T<span>.</span></span><span className="brand-name">TOUCHLINE<span>TRIVIA</span></span></a><p>Made for the love of the game. <span>© 2026 TOUCHLINE TRIVIA</span></p><button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</button></footer>
                </>
            )}
        </main>
    )
}

export default Home