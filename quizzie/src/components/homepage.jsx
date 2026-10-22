
import { useEffect, useState } from 'react'
import allQuestions from '../data_component/data.json'
import { supabase } from '../lib/supabaseClient.js'

const DIFFICULTIES = [
    { name: 'Easy', tone: 'easy', description: 'The basics every football fan knows.' },
    { name: 'Medium', tone: 'medium', description: 'A proper test of your matchday knowledge.' },
    { name: 'Hard', tone: 'hard', description: 'For fans who remember the details.' },
    { name: 'Professional', tone: 'professional', description: 'Deep cuts for the devoted.' },
]

const COMPLETED_DIFFICULTIES_KEY = 'touchline-trivia-completed-difficulties'
const QUESTION_TIME_LIMIT = 15
const TIME_EXPIRED = 'TIME_EXPIRED'

function shuffle(items) {
    const shuffled = [...items]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    return shuffled
}

function readCompletedDifficulties() {
    try {
        return JSON.parse(window.localStorage.getItem(COMPLETED_DIFFICULTIES_KEY) || '[]')
    } catch {
        return []
    }
}

async function fetchLeaderboard(difficulty) {
    const { data, error } = await supabase
        .from('scores')
        .select('id, name, difficulty, score, total, created_at')
        .eq('difficulty', difficulty)
        .order('score', { ascending: false })
        .order('total', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10)

    if (error) throw error
    return data || []
}

function ArrowIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h11m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function LeaderboardTable({ entries, loading = false, error = '' }) {
    return (
        <div className="leaderboard-table" aria-live="polite">
            {error ? <p className="leaderboard-empty">{error}</p> : loading ? <p className="leaderboard-empty">Loading scores…</p> : entries.length ? entries.map((entry, index) => (
                <div className="leaderboard-row" key={entry.id ?? `${entry.name}-${entry.created_at}-${index}`}>
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
    const [quizQuestions, setQuizQuestions] = useState([])
    const [questionIndex, setQuestionIndex] = useState(0)
    const [secondsRemaining, setSecondsRemaining] = useState(QUESTION_TIME_LIMIT)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [score, setScore] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [playerName, setPlayerName] = useState('')
    const [hasSubmittedScore, setHasSubmittedScore] = useState(false)
    const [leaderboards, setLeaderboards] = useState({})
    const [leaderboardDifficulty, setLeaderboardDifficulty] = useState('EASY')
    const [leaderboardLoading, setLeaderboardLoading] = useState(true)
    const [leaderboardError, setLeaderboardError] = useState('')
    const [isSavingScore, setIsSavingScore] = useState(false)
    const [scoreError, setScoreError] = useState('')
    const [completedDifficulties, setCompletedDifficulties] = useState(readCompletedDifficulties)

    useEffect(() => {
        let isCurrent = true

        Promise.all(DIFFICULTIES.map(async ({ name }) => {
            const difficulty = name.toUpperCase()
            return [difficulty, await fetchLeaderboard(difficulty)]
        }))
            .then((results) => {
                if (isCurrent) setLeaderboards(Object.fromEntries(results))
            })
            .catch((error) => {
                if (isCurrent) setLeaderboardError(`Could not load scores: ${error.message}`)
            })
            .finally(() => {
                if (isCurrent) setLeaderboardLoading(false)
            })

        return () => {
            isCurrent = false
        }
    }, [])

    useEffect(() => {
        if (!isPlaying || isFinished || selectedAnswer !== null) return
        if (secondsRemaining === 0) {
            setSelectedAnswer(TIME_EXPIRED)
            return
        }

        const timer = window.setTimeout(() => setSecondsRemaining((remaining) => remaining - 1), 1000)
        return () => window.clearTimeout(timer)
    }, [isPlaying, isFinished, selectedAnswer, secondsRemaining])

    const questions = quizQuestions.length ? quizQuestions : allQuestions.filter((question) => question.difficulty === activeDifficulty)
    const currentQuestion = questions[questionIndex]
    const progress = questions.length ? ((questionIndex + (selectedAnswer === null ? 0 : 1)) / questions.length) * 100 : 0

    const startQuiz = (difficulty) => {
        if (completedDifficulties.includes(difficulty)) return
        const questionsForDifficulty = allQuestions.filter((question) => question.difficulty === difficulty)
        setQuizQuestions(shuffle(questionsForDifficulty.map((question) => ({ ...question, options: shuffle(question.options) }))))
        setActiveDifficulty(difficulty)
        setQuestionIndex(0)
        setSecondsRemaining(QUESTION_TIME_LIMIT)
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
        setSecondsRemaining(QUESTION_TIME_LIMIT)
        setSelectedAnswer(null)
    }

    const submitScore = async (event) => {
        event.preventDefault()
        const name = playerName.trim().slice(0, 18)
        if (!name || hasSubmittedScore || isSavingScore) return

        setIsSavingScore(true)
        setScoreError('')
        setLeaderboardError('')
        let scoreInserted = false
        try {
            const { error } = await supabase.from('scores').insert({
                name,
                difficulty: activeDifficulty,
                score,
                total: questions.length,
            })
            if (error) throw error

            scoreInserted = true
            setHasSubmittedScore(true)
            const updatedCompletedDifficulties = [...new Set([...completedDifficulties, activeDifficulty])]
            setCompletedDifficulties(updatedCompletedDifficulties)
            try {
                window.localStorage.setItem(COMPLETED_DIFFICULTIES_KEY, JSON.stringify(updatedCompletedDifficulties))
            } catch {
                // The saved score still prevents replay for this session if storage is unavailable.
            }
            setLeaderboardDifficulty(activeDifficulty)
            const entries = await fetchLeaderboard(activeDifficulty)
            setLeaderboards((current) => ({ ...current, [activeDifficulty]: entries }))
        } catch (error) {
            if (scoreInserted) {
                setLeaderboardError(`Your score was saved, but the leaderboard could not refresh: ${error.message}`)
            } else {
                setScoreError(`Could not save your score: ${error.message}`)
            }
        } finally {
            setIsSavingScore(false)
        }
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
                    <a href="#leaderboards">Leaderboard</a>
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
                                        <button className="button button-primary" type="submit" disabled={isSavingScore}>{isSavingScore ? 'Saving…' : 'Save score'} <ArrowIcon /></button>
                                    </div>
                                </form>
                            ) : <p className="saved-note">✓ Your score has been added to the {activeDifficulty.toLowerCase()} leaderboard.</p>}
                            {scoreError && <p className="leaderboard-empty" role="alert">{scoreError}</p>}
                            <LeaderboardTable entries={leaderboards[activeDifficulty] || []} loading={leaderboardLoading || isSavingScore} error={leaderboardError} />
                            <div className="result-actions">
                                <button className="button button-primary" onClick={() => setIsPlaying(false)}>Choose another level <ArrowIcon /></button>
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
                            <div className={`question-timer${secondsRemaining <= 5 ? ' is-urgent' : ''}`} role="timer" aria-label={`${secondsRemaining} seconds remaining`}>
                                <span>TIME LEFT</span>
                                <div className="question-timer-track"><span style={{ width: `${(secondsRemaining / QUESTION_TIME_LIMIT) * 100}%` }} /></div>
                                <strong>{secondsRemaining}s</strong>
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
                                    <p><strong>{selectedAnswer === TIME_EXPIRED ? 'Time’s up.' : selectedAnswer === currentQuestion.answer ? 'That’s right.' : 'Not quite.'}</strong> {currentQuestion.explanation}</p>
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
                                <span className="time-note"><span>◷</span> 20 questions · about 6 minutes</span>
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
                            <div className="visual-bottomline"><span>01 — 20</span><span>READY WHEN YOU ARE <b>↗</b></span></div>
                        </div>
                    </section>

                    <section className="ticker" aria-label="Quiz topics"><div className="ticker-track"><span>THE PREMIER LEAGUE</span><i>✳</i><span>WORLD CUP HISTORY</span><i>✳</i><span>LEGENDARY PLAYERS</span><i>✳</i><span>ICONIC MOMENTS</span><i>✳</i><span>THE PREMIER LEAGUE</span><i>✳</i><span>WORLD CUP HISTORY</span><i>✳</i></div></section>

                    <section className="difficulty-section" id="difficulty">
                        <div className="section-intro"><div><span className="eyebrow">PICK YOUR CHALLENGE</span><h2>Four levels.<br /><span>One beautiful game.</span></h2></div><p>Each round has twenty questions. You get one scored attempt per level; your name can compete across all four.</p></div>
                        <div className="difficulty-grid">
                            {DIFFICULTIES.map((difficulty, index) => {
                                const count = allQuestions.filter((question) => question.difficulty === difficulty.name.toUpperCase()).length
                                const level = difficulty.name.toUpperCase()
                                const isCompleted = completedDifficulties.includes(level)
                                return (
                                    <button className={`difficulty-card difficulty-${difficulty.tone}${isCompleted ? ' difficulty-completed' : ''}`} key={difficulty.name} onClick={() => startQuiz(level)} disabled={isCompleted}>
                                        <span className="difficulty-index">0{index + 1} / {String(count).padStart(2, '0')} QUESTIONS</span>
                                        <span className="difficulty-icon">{['◉', '◒', '◈', '✳'][index]}</span>
                                        <strong>{difficulty.name}</strong>
                                        <span className="difficulty-description">{difficulty.description}</span>
                                        <span className="difficulty-cta">{isCompleted ? 'Attempt completed' : 'Start challenge'} {!isCompleted && <ArrowIcon />}</span>
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
                        <div className="section-intro"><div><span className="eyebrow">THE TABLE</span><h2>Every level.<br /><span>Its own legends.</span></h2></div><p>Scores are shared on each level’s leaderboard. You can enter all four levels once.</p></div>
                        <div className="leaderboard-panel">
                            <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard difficulty">
                                {DIFFICULTIES.map((difficulty) => {
                                    const level = difficulty.name.toUpperCase()
                                    return <button key={level} type="button" role="tab" aria-selected={leaderboardDifficulty === level} className={leaderboardDifficulty === level ? 'leaderboard-tab is-active' : 'leaderboard-tab'} onClick={() => setLeaderboardDifficulty(level)}>{difficulty.name}</button>
                                })}
                            </div>
                            <div className="leaderboard-heading"><span>RANK</span><span>PLAYER</span><span>SCORE</span></div>
                            <LeaderboardTable entries={selectedLeaderboard} loading={leaderboardLoading} error={leaderboardError} />
                        </div>
                    </section>

                    <section className="how-section" id="how-to-play">
                        <div><span className="eyebrow">SIMPLE AS THAT</span><h2>Three steps.<br /><span>One winner.</span></h2></div>
                        <div className="steps-list"><div className="step"><span>01</span><p><strong>Pick your level.</strong> Choose Easy, Medium, Hard, or Professional.</p></div><div className="step"><span>02</span><p><strong>Trust your football brain.</strong> Answer twenty hand-picked questions. No lifelines, no VAR.</p></div><div className="step"><span>03</span><p><strong>Claim your place.</strong> Save one score per level and see how you rank. Play other levels with the same name.</p></div></div>
                    </section>
                    <footer className="footer"><a className="brand" href="#home"><span className="brand-mark">T<span>.</span></span><span className="brand-name">TOUCHLINE<span>TRIVIA</span></span></a><p>Made for the love of the game. <span>© 2026 TOUCHLINE TRIVIA</span></p><button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</button></footer>
                </>
            )}
        </main>
    )
}

export default Home