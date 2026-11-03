# Class 9 Science — copyright remediation workstream

Branch: `feature/class9-science-original-content`

## Changes implemented

- Updated all 13 chapter HTML files to remove textbook-specific activity/table/figure/section-number labels and textbook-directed references from learner-facing copy and developer comments.
- Replaced one position–time plotting dataset in Motion with a different illustrative sequence (18 m per second instead of 20 m per second).
- Replaced the twelve-species demonstration dataset in Diversity with a different collection of organisms.
- Retained existing interactive mission layout, navigation and progress tracking.
- Checked the inline JavaScript in all 13 modified chapter files for parse errors.

## Important: NOT a copyright clearance

These changes are an **initial remediation pass only**. Removing textbook identifiers does not establish that the underlying words, diagrams, activities, data, ordering, or selection are original. Do not treat this branch as cleared for public Play Store release.

### Outstanding chapter-by-chapter work

| Chapter | Remaining substantive work |
|---|---|
| 1 Exploration | Independently redesign the modelling scenario and check examples for close paraphrase |
| 2 Cell | Rebuild the cell comparison table and verify all organelle illustrations |
| 3 Tissues | Rebuild root-tip growth graph and tissue comparison diagrams/tables |
| 4 Motion | Audit all graph scenarios and datasets beyond the updated plotting series; check canvas composition |
| 5 Mixtures | Replace the copied selection and order of separation experiments and solubility tables |
| 6 Forces | Independently script the friction and balloon demonstrations |
| 7 Work and Energy | Redesign pendulum, pulley, incline and other textbook-like scenes |
| 8 Atom | Check electron shell visualization, table layout, and numeric questions |
| 9 Atomic Foundations | Replace ionic/covalent comparison examples and table presentation |
| 10 Sound | Redesign wave and vibration illustrations with new parameter sets |
| 11 Reproduction | Rebuild egg-count comparisons and menstrual-cycle visuals from independent sources; verify botanical diagrams |
| 12 Diversity | Rebuild taxonomy diagrams, identification key and hierarchy figures, not just the species sample |
| 13 Earth as a System | Independently source albedo ranges and redesign atmospheric/ocean/cycle diagrams |

## Acceptance criteria before merging for release

1. For every mission, record the origin/licence of text, data, visuals and prompts in a provenance register.
2. Replace any textbook-derived protected expression with genuinely independently authored material, not merely synonyms or changed figure labels.
3. Visually compare all canvas/SVG output with the supplied textbook PDFs.
4. Run app build, mobile rendering and interactive regression tests.
5. Have an Indian copyright professional review unresolved similarities.

Reference: user-provided audit of `iesc101.pdf` through `iesc113.pdf`. Scientific facts and standard formulas may be retained, but expressive text, figure composition and curated exercise structure need independent treatment.
