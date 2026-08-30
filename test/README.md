# Test suite

    npm run build && npm test

The suite starts its own static server for `www/`, so nothing needs to be
running first. It needs Playwright (`npm install`) and a Chromium binary; it
looks for `/opt/pw-browsers/chromium` and otherwise uses Playwright's own.

    npm test                 every stage
    npm test -- verify       just the named stages
    npm run test:list        what stages exist

## Adding a chapter

Edit **`test/chapters.js`** and nothing else. Before that list existed, a new
chapter had to be added to four separate harnesses, and missing one meant it
silently went untested.

## What each stage is for

| Stage | Asks |
|---|---|
| `audit-ids` | Does every `getElementById` resolve, and does every `Q.*` call pass the right number of ids? Static, so it reaches branches a click-through never does. |
| `verify` | Does each chapter load clean, award nothing for being opened, draw every mission, keep every control on a 390px screen, still count real input, and link back to its own chapter list? Then the shelf's navigation. |
| `reach` | Can each bench actually be completed? |
| `state` | Does an old save migrate without losing XP, are outcomes recorded, does a finished mission still persist? |
| `quests` | Does "try 3 interactive controls" mean three distinct controls rather than three events from one drag? |
| `test/chapters/*` | Does the science agree with the book? |

## Why these particular checks exist

Each one was written after something got through.

- **`audit-ids`** — chapter 6 shipped `Q.match('g4','g4s',[…])`: two ids where
  three are required, so the score div was read as the pairs array and the
  whole chapter script died on load. It also flags classes with no CSS rule,
  which caught the same chapter's `matchA`/`matchB`.
- **`verify`** — chapters were paying out a daily quest the instant they
  opened, because the benches call their own `sync()` at startup. The lesson
  is in the shape of the check: it asserts on what was *persisted*, not on
  what the screen shows.
- **`reach`** — asks the question none of the others do, and has found seven
  missions that could never be completed at all. Two distinct causes:

  Five (forces m1, m9, m12, m15 and atom m2) simply never called `complete()`:
  the bench reached its threshold, updated its explanatory note, and stopped.

  Two more (energy m9 and m10) are subtler and were missed by the static scan
  that caught the first five, because they *do* call `complete()`. Both benches
  play themselves once on open via `auto()`. `AUTORUN` correctly withholds the
  payout for a bench playing itself — but the bench had already consumed its
  own one-shot progress flag (`landed`, and a `seen` set filled with all three
  pendulum positions), so the reader's own run found nothing left to record and
  the mission could never be earned. `autoplaying()` in the engine exists for
  exactly this: a bench must not bank its flags while it is playing itself.

  All seven pass the id audit, throw no errors, award explore credit normally,
  and look perfectly fine on screen.
- **`verify`, off-screen controls** — `.qrow` was a non-wrapping flex row and
  chips do not shrink, so a mission offering six kingdoms showed three and put
  the other three past the right edge of a 390px screen. One of the hidden ones
  was *None of them*, the answer the mission's entire closing paragraph is
  about. Four chapters were affected. Nothing caught it for months because both
  `reach` and the chapter tests click chips by DOM index, and an invisible
  button clicks perfectly well — the check has to measure geometry, not
  behaviour. Squeezing the columns instead only moves the damage inside a
  `<select>`, where "8 and 16" renders as "8 and 1", a different answer; so
  value tables keep the width their options need and scroll, and say so.
  Content inside a horizontal scroller is reachable and does not fail.
- **`state`** — a debounced `save()` was being re-armed 30 times a second by
  a redraw loop, so chapters stopped persisting entirely. Nothing on screen
  changed; only the stored state showed it.
- **`quests`** — one slider drag produced 21 explore events, so five of eight
  chapters finished a three-control quest by touching one control.
- **`test/chapters/*`** — the physics, the biology and the maths. The tables
  come from the textbook, not from the page, so a bench that disagrees with the
  book fails rather than agreeing with itself.

## A note on tests that only sometimes fail

The dichotomous key in chapter 12 failed about one run in seven, on the check
that a wrong answer is corrected rather than silently accepted. It would have
been easy to call that a flake and re-run.

It was a real bug. `answer()` marks the run finished as soon as the last needed
question is answered, and the note chose its wording by testing *finished*
before testing *wrong*. Monera is reached in a single question, so for
Bacterium and Cyanobacteria a wrong first answer was also the last answer: the
reader was handed the kingdom with no hint they had the question backwards. Two
organisms in fourteen, drawn at random — hence one run in seven.

The lesson is in the fix to the test, not just to the chapter: it now drives a
one-question organism and a multi-question one **deliberately**, instead of
hoping the random draw covers both. **A test that fails intermittently is
usually a test that samples something the suite should be choosing on purpose.**

## Testing a chapter that is genuinely random

Chapter 7's benches roll real dice, so its test cannot assert what they will
say. It splits the difference: every **theoretical** value is asserted exactly,
as a reduced fraction, because those are the answers being taught and nothing
about them is uncertain; every **experimental** value is asserted only through
invariants (a count never exceeds its opportunities, the stated gap matches the
stated probability) and through convergence windows scaled to the evidence.

The window has to be scaled, not guessed. A flat ±0.06 looks generous, and for
6000 die rolls it is ten standard deviations — but the same number applied to a
rate measured from the ~110 runs of three sixes that turn up in 24,000 rolls is
1.7 sigma, which fails about one run in eleven. That was written, caught and
fixed here before it ever ran in anger; the tolerance is now `5 × √(p(1−p)/n)`.
**A test that fails one run in fifty is worse than no test**, because it teaches
you to ignore it.

## Writing a new chapter test

Put it in `test/chapters/<slug>.js`, export an async `run()` returning a
failure count, and add it to `STAGES` in `run.js`. Take the expected values
**from the textbook**, not by reading them off the running page — a test that
copies the implementation only proves the implementation is self-consistent.

## Known limits, and how `reach` learned them

`reach` drives sliders, `button.act` anywhere in the mission, and a bench's own
chip rows. It skips missions whose completion belongs to a graded activity
(anything with `g1`, `g2`, … elements) because clicking blindly cannot pass a
quiz, and it skips buttons matching `reset|clear` because pressing Reset right
after Go cancels the animation whose completion sets the flag.

Every one of those rules is there because the probe reported a mission as
unreachable when it was not:

| It flagged | The probe was actually |
|---|---|
| forces m5 | pressing Reset immediately after Go, cancelling the run |
| cell m13 | blind to buttons that are not inside a `.row` |
| motion m3, cell m5 | judging a mission that a graded activity completes |
| cell m13 | waiting a fixed 1.3 s for a 3 s animation |
| cell m13 | pressing two run buttons 90 ms apart, so the second aborted the first |
| energy m7 | always parking a slider at its maximum, so a bench wanting three different heights only ever saw two |
| exploration m1 | never touching a bench's own chip row |
| energy m4 | probing with all thirteen missions open, so thirteen canvases at 30fps starved the six-second animation it was timing |
| atom m3 | pressing each control once, when the gold foil wants 1500 α-particles — six volleys of the same button |
| bonding m13 | walking two chip rows separately, when the formula depends on the cation and anion *together* |
| bonding m13 | holding chip handles across clicks, when the bench rebuilds both rows on every pick and detaches them |

A false "this can never be completed" is worse than no check at all, so when
this probe fails, **confirm against the chapter source before believing it**.
Three genuine limits remain, listed as `skipReach` in `chapters.js` with the
reason: motion m8 needs seven points placed by clicking a canvas, chapter 12's
dichotomous key needs three organisms carried through a chain of yes/no
questions, and coordinates m2 asks for nine *named* corners of a room, which is
aiming rather than prodding. Each has a chapter test that drives it properly.
Prefer teaching the probe over adding a skip — the circles, perimeter and
probability chapters' thirty-six benches between them all completed on the first sweep,
which is what a probe that has been taught properly looks like.

One design rule falls out of this and is worth stating: **do not gate a mission
on an exact slider value.** `reach` sweeps a slider in about forty steps from
its minimum, so it lands on 10, 19, 28 … and never on 90 or 180. Chapter 6's
arc bench wants exactly those three angles, so it offers them as buttons —
which is better for a reader with a thumb as well.
