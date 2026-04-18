---

name: webaudio-burst-schedule-melody-with-raf-playhead
description: Play a pre-computed note list by scheduling every oscillator upfront on the AudioContext clock, while JS only drives a requestAnimationFrame playhead.
category: frontend
triggers:
  - webaudio burst schedule melody with raf playhead
tags: [frontend, webaudio, burst, schedule, melody, raf]
version: 1.0.0
---

# webaudio-burst-schedule-melody-with-raf-playhead

When previewing a sequence of notes in the browser, schedule all of them on the AudioContext timeline in one pass — never chain `setTimeout` or rAF for timing. WebAudio's sample-accurate scheduler handles drift; JS only renders the visual cursor. Each note gets its own `OscillatorNode` + short `GainNode` envelope (exp-ramp up, exp-ramp down to avoid clicks), connected at `now + n.start` and stopped at `now + n.start + n.dur + 0.05`. A single rAF loop re-draws the piano roll and advances the playhead based on `performance.now() - playStart`; when elapsed > total duration, clear `state.playing` and stop the loop.

```js
const now = ctx.currentTime + 0.05;
notes.forEach(n => {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((n.pitch - 69) / 12);
  g.gain.setValueAtTime(0.0001, now + n.start);
  g.gain.exponentialRampToValueAtTime(0.15, now + n.start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(now + n.start); osc.stop(now + n.start + n.dur + 0.05);
});
state.playStart = performance.now(); state.playing = true;
const frame = () => {
  if (!state.playing) return;
  drawRoll(notes, total);
  if ((performance.now() - state.playStart) / 1000 > total + 0.1) { state.playing = false; return; }
  requestAnimationFrame(frame);
};
frame();
```

Never try to schedule via a JS timer walking the list — even a 10ms drift is audible. Lazy-construct the `AudioContext` on the first user gesture (autoplay policy), keep it on `state.ctxA` and reuse. Use `exponentialRampToValueAtTime` with a tiny floor (`0.0001`) rather than zero — `exponentialRamp` to 0 is a no-op. One oscillator per note is fine up to a few hundred notes; for larger scores, batch into sample buffers instead.
