import { useEffect, useRef } from 'react'

export const RELEASE_NOTES_VERSION = 'gameplay-updates-1'

const updates = [
    {
        title: 'A timer for every question',
        description: 'You have 15 seconds to answer. If time runs out, the correct answer and explanation appear before you continue.',
    },
    {
        title: 'More questions in every level',
        description: 'Each difficulty now offers a 20-question challenge, with the question count shown on its level card.',
    },
]

function ReleaseNotes({ onClose }) {
    const dialogRef = useRef(null)

    useEffect(() => {
        const dialog = dialogRef.current
        if (dialog && !dialog.open) dialog.showModal()
    }, [])

    const closeDialog = () => dialogRef.current?.close()

    return (
        <dialog
            className="release-notes-dialog"
            ref={dialogRef}
            aria-labelledby="release-notes-title"
            onClose={() => onClose()}
            onClick={(event) => {
                if (event.target === dialogRef.current) closeDialog()
            }}
        >
            <div className="release-notes-heading">
                <div>
                    <span className="eyebrow"><span className="live-dot" /> THE LATEST</span>
                    <h2 id="release-notes-title">What’s <span>new?</span></h2>
                </div>
                <button className="release-notes-close" type="button" onClick={closeDialog} aria-label="Close release notes">×</button>
            </div>
            <p className="release-notes-intro">A couple of updates to make your next matchday challenge even better.</p>
            <ol className="release-notes-list">
                {updates.map((update, index) => (
                    <li key={update.title}>
                        <span className="release-notes-index">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                            <h3>{update.title}</h3>
                            <p>{update.description}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </dialog>
    )
}

export default ReleaseNotes