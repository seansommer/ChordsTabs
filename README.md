# Chords & Tabs

A personal songbook for discoveries, with a comfortable practice view. Part of [Music Center](https://github.com/seansommer/MusicCenter).

Public address after Pages deployment: https://seansommer.github.io/ChordsTabs/

## Included

- Browse and sort by artist or song; search both at once.
- Chords aligned above lyrics, plus a separate lyrics-only view.
- Adjustable automatic scrolling with pause, speed, manual-scroll interruption, and return to top.
- Font sizes from 14 to 36 px.
- Independent semitone transposition and capo controls, with sounding-key and chord-shape-key labels.
- Sharp/flat spelling, slash-bass transposition, and numeric guitar-tab transposition.
- Original-source links and optional embedded YouTube, Vimeo, or Instagram players, with a visible fallback link.
- Device-local saved songs and practice settings, print, song-specific share links, unique share artwork, dark/light themes, and app icons.
- Shared Music Center accounts, musician cards, and private messages, configured for the `music-center-1111` Firebase project.
- Master-only song editor with bracketed chord notation, preview, live publishing, conflict checks, previous-version recovery, JSON export, and new-song creation.

The first song is **Tired — Slow Leaves**, carried over from the uploaded-performance working chart. Approximate chords and both uncertain lyric phrases remain marked. **Evening Sketch** is a separate original instrumental exercise for trying the tab controls, not an artist transcription.

## Launch and accounts

Select **Settings → Pages → Source → GitHub Actions**, then run the **Verify and deploy** workflow. The static songbook works without sign-in.

For accounts, messaging, and master editing, finish [Music Center’s Firebase setup](https://github.com/seansommer/MusicCenter/blob/main/docs/FIREBASE_SETUP.md). Both repositories already contain the same public web configuration. Enable Email/Password authentication, publish the supplied database rules, and grant your own account UID master access in the Firebase console.

## Use the Master Editor

Sign in as the UID-authorized master and choose **Edit song**. Write chords directly before their change points:

```text
# Verse 1
[C]Your lyric line [G]continues here

# Chorus
[F]Another line [C/E]with a slash chord
```

This example is format guidance, not a song transcription. Lyrics in brackets that are not valid chord symbols (such as uncertainty markers) are preserved. The editor also exposes structured tab sections separately; they appear after lyric sections when saved from this editor.

**Preview** does not publish. **Publish changes** updates the public live songbook. If another session changed the same song, the publish operation stops so you can reconcile your draft. **Load previous version** loads the prior chart into the editor for review; it does not publish until you choose to.

Live edits are stored in Firebase and override repository song files. **Export song JSON** makes a copy for GitHub; the browser never stores a GitHub token. When asking for future changes in chat, tell us if you have also edited that song live so both versions can be reconciled.

## Add songs with our chat workflow

Upload a recording and provide its artist, title, and original song/video link. Ask for a working chord-and-lyric arrangement, then review any uncertain words or chords. Once approved, ask to add it to **ChordsTabs**. We add a JSON file in `data/songs/` and its catalog entry in `data/catalog.json`, or you can paste the arrangement into **+ Add song** as master. There is no automated transcription API or upload-to-transcribe feature inside this first version.

Keep each chart’s source, status, and review notes. Do not turn approximate chord guesses into claims of an official transcription.

## Musical behavior

`key` is the **original sounding key**; `capo` is the **capo used by the stored arrangement**. Chord labels in the source file describe its written shapes. The displayed shape shift is:

`requested semitone shift + original capo − selected capo`

For example, an original C arrangement with no capo, kept at key shift 0 and played with capo 5, displays G-family shapes and still sounds in C.

Numeric tabs keep each note on its original string. Frets are relative to the selected capo. If a shift would require a negative fret or exceed the remaining 24-fret range, the tab is marked unplayable for that setting instead of silently showing wrong notes. This does not attempt to refinger a passage onto different strings. Standard tuning is the initial supported arrangement.

## Development

Requires Node 22 or later, with no runtime build dependencies:

```sh
npm test
npm run build
```

The tests cover transposition, capo behavior, tab limits, search, safe embed URLs, editor round-trips, uncertainty preservation, and invalid chart rejection. Shared identity tests also run here. Firebase rule tests are in Music Center.

The shared account files are copied from Music Center. Keep `src/config.js`, `identity.js`, `community.js`, `ui.js`, and `theme-boot.js` synchronized between repositories when changing the shared contract.

Created by Sean.
