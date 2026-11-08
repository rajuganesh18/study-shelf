# Class 9 Science — copyright remediation workstream

Branch: `feature/class9-science-original-content`

## Changes implemented

- Updated all 13 chapter HTML files to remove textbook-specific activity/table/figure/section-number labels and textbook-directed references from learner-facing copy and developer comments.
- Replaced one position–time plotting dataset in Motion with a different illustrative sequence (18 m per second instead of 20 m per second).
- Replaced the twelve-species demonstration dataset in Diversity with a different collection of organisms.
- Replaced the textbook-like Reproduction egg-count graph and unsupported numerical comparisons with an original qualitative fertilisation-strategy explorer; removed unsourced survival rankings.
- Reworked Diversity's taxonomy-rank visual to remove unsupported species-count estimates and focus on rank relationships.
- Rechecked inline JavaScript syntax in both modified chapters.
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
| 11 Reproduction | Egg-count chart replaced; still review menstrual-cycle visuals and botanical diagrams against source PDFs |
| 12 Diversity | Taxonomy counts removed and species sample changed; still review identification key and other figures |
| 13 Earth as a System | Independently source albedo ranges and redesign atmospheric/ocean/cycle diagrams |

## Acceptance criteria before merging for release

1. For every mission, record the origin/licence of text, data, visuals and prompts in a provenance register.
2. Replace any textbook-derived protected expression with genuinely independently authored material, not merely synonyms or changed figure labels.
3. Visually compare all canvas/SVG output with the supplied textbook PDFs.
4. Run app build, mobile rendering and interactive regression tests.
5. Have an Indian copyright professional review unresolved similarities.

Reference: user-provided audit of `iesc101.pdf` through `iesc113.pdf`. Scientific facts and standard formulas may be retained, but expressive text, figure composition and curated exercise structure need independent treatment.

## High-priority review pass — 2026-11-08

Changes made on this branch:
- **Tissues:** revised the root-tip growth chart to use a clearly identified hypothetical model and independent numerical series; updated the learner-facing description.
- **Motion:** explicitly identified the position–time plotting sequence as an illustrative constant-speed journey.
- **Mixtures:** replaced the four named-salt solubility curves and their textbook-like numerical series with four *fictional samples*, independently chosen practice values, and a clear warning that they are not measured chemical reference data. Other chemical examples and quiz values still require review for accuracy and provenance.
- **Reproduction:** replaced the egg-count and implied survival-ranking chart with a qualitative comparison of reproductive strategies; removed unsupported quantitative claims.
- **Diversity:** changed the species sample and removed unsupported species counts from the taxonomic-rank figure.
- **Earth as a System:** identified albedo visualisation as an illustrative model and removed a categorical snow-albedo superlative. The numerical ranges still need independently documented sources.
- **Atom:** inspected electron arrangement logic; no substantive change in this pass. Standard atomic shell capacities and scientific models are not automatically protected expression, but the particular presentation must still be compared visually.

**Verification performed:** parsed inline JavaScript for all seven high-priority chapters with JavaScript's Function constructor; all passed syntax parsing. **Not performed:** Android build, Playwright or device interaction tests, rendered diagram side-by-side comparison with NCERT PDFs, full line-by-line literary similarity review, external source verification, or legal clearance.

**Remaining high-priority work:** complete independent visual review of Tissues, Motion, Mixtures, Atom, Reproduction, Diversity and Earth; rewrite any still-copied diagrams, passages, activity prompts or question wording; check scientific correctness of fictionalised exercises and remaining chemical/albedo numbers; run functional and mobile regression tests. Do not merge or declare Play Store copyright readiness based solely on this pass.
