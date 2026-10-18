# Chords & Tabs

A personal songbook for discoveries, with a comfortable practice view. Part of [Music Center](https://github.com/seansommer/MusicCenter).

Public address after Pages deployment: https://seansommer.github.io/ChordsTabs/

## Included

- A dedicated browse page with separate Artists, Songs, and Saved views; open an artist to see their songs.
- Compact search above the song, showing at most three matching songs and a link to all results.
- Chords aligned above lyrics, plus a separate lyrics-only view.
- Full-page song scrolling: the header and settings move out of view, with practice settings collapsed initially.
- Adjustable automatic scrolling at 2.5–45 px/s (half the original range), with a compact pause/resume/remove bar and synchronized speed controls. Taps and manual swipes keep scrolling active. Existing speed preferences are halved once when migrating to the new range.
- Font sizes from 14 to 36 px.
- Independent semitone transposition and capo controls, with sounding-key and chord-shape-key labels.
- Sharp/flat spelling, slash-bass transposition, and numeric guitar-tab transposition.
- Arrangement notes and original-source links below the chart, with optional embedded YouTube, Vimeo, or Instagram players.
- Device-local saved songs and practice settings, print, song-specific share links, unique share artwork, dark/light themes, and app icons.
- Shared Music Center accounts, musician cards, and private messages, configured for the `music-center-1111` Firebase project.
- Master-only song editor with bracketed chord notation, preview, live publishing, conflict checks, previous-version recovery, JSON export, and new-song creation.

The songbook includes **Every Little Thing — 8lanco**, a capo-3 working accompaniment prepared from the uploaded screen recording, and **Tired — Slow Leaves**, carried over from the uploaded-performance working chart. Approximate chords and uncertain lyric phrases remain marked. **Evening Sketch** is a separate original instrumental exercise for trying the tab controls, not an artist transcription.

Music Center opens the app in a full-viewport player, keeping navigation inside the installed hub. The record icon returns to Music Center. Direct song links and the separate Chords & Tabs home-screen app remain supported. Ordinary browser tabs still have browser-controlled address bars.

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


## Master song manager and play-along

Open your account card → **Master song manager** from Music Center, the reader, or browsing. The separate manager page searches by song/artist and supports Add, Edit, Delete, and Restore. Ordinary accounts cannot publish or delete. Deletion writes a revision-protected marker in the existing `songEdits` record, keeping the latest song in `previousContent`; it hides both repository songs and live additions without letting static data reappear underneath. Deleted IDs remain reserved. The Deleted songs tab restores them. This is deletion from the live songbook, not permanent erasure of GitHub history or backups. No Firebase rule change is required.

Use **Play audio** for a direct audio link or a recording selected from your device. Files are session-local object URLs; they are never uploaded or stored in the database. The master editor has an optional direct HTTPS audio/video file URL (MP3, M4A, MP4, and other supported media formats). File playback depends on the browser's codecs and the source host's availability.

**Repeat song** restarts the recording. With **Scroll with playback** enabled, the chart returns to the top when playback actually resumes, then uses the selected scroll speed. Pauses/buffering stop linked scrolling. Tapping the chart, adjusting speed, changing view or practice settings, and manual swipes keep auto-scroll active. Pause Auto Scroll suspends linked scrolling without stopping the recording; Start Auto Scroll enables it again. Restart can be used manually. This is not chord-level timing synchronization. Keep the app open; playback pauses when the page is hidden, and leaving/switching songs stops it.

YouTube and Vimeo use their official player APIs in a visible player and support repeat/scroll restart when embedding is allowed. YouTube is never hidden or reduced to audio. Instagram embeds remain available in Watch here, but are not used for automatic play/repeat because they do not provide the control/event interface used by this feature. For Instagram practice, choose an audio file or your screen recording. Unsupported, private, or blocked videos show a fallback message. Browser autoplay may require another tap on Play or the embedded player.

Reference APIs: https://developers.google.com/youtube/iframe_api_reference · https://developers.google.com/youtube/terms/developer-policies · https://github.com/vimeo/player.js · https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event

## Compact auto-scroll controls

Starting auto-scroll reveals a slim bottom bar with **Pause Auto Scroll**. When paused, it shows **Start Auto Scroll** and **Remove Auto Scroll**. Remove stops scrolling and hides the bar until scrolling is explicitly activated again. A slider and − / + buttons adjust the saved speed in 0.5 px/s steps; the practice-settings slider stays in sync. Ordinary taps, clicks, and keys do not cancel scrolling. Manual scrolling changes the current position without jumping back. The bar stays out of printed charts, and the visible video player sits above it. Song changes reset the bar; reaching the chart end or hiding the page pauses scrolling.
