# Asteroid Alley

A small portrait arcade game: one thumb, endless orbit. Built with plain JavaScript, Canvas, CSS and Web Audio. No build step, dependencies, accounts, analytics or backend.

## Play

Drag anywhere in the playfield to steer; the ship follows your movement without jumping underneath your thumb. Shots fire automatically. On desktop, use arrow keys or WASD. Space or Escape pauses/resumes. Tap **Fly again** for an instant fresh run.

Large asteroids split into two smaller pieces. Difficulty increases as you survive. Collect ✦ for a 10-second spread shot, ◇ for a shield that absorbs one collision, and ◷ for 5 seconds of slow-time. Score rewards survival and destroyed asteroids. Your best and sound preference are stored only in your browser when local storage is available.

The sound toggle enables synthesized audio after interaction. Switching tabs or backgrounding the browser pauses the game; resume explicitly when you return.

## Run locally

Serve this directory with any static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`.

GitHub Pages publishes the root of the `main` branch. All game assets are original procedural graphics and synthesized sounds.
