/* The one list. Adding a chapter means editing this file and nothing else —
   before this existed, a new chapter had to be added to four separate
   harnesses, and forgetting one meant it silently went untested. */
module.exports = [
  { slug:'exploration',  id:'9-science-1',  n:1,  title:'The Practice of Science' },
  { slug:'cell',         id:'9-science-2',  n:2,  title:'The Cell' },
  { slug:'tissues',      id:'9-science-3',  n:3,  title:'Tissues' },
  { slug:'motion',       id:'9-science-4',  n:4,  title:'Motion',
    /* m8 completes when seven points have been placed by clicking the
       canvas itself, which the prodder has no way to do. */
    skipReach:['m8'] },
  { slug:'mixtures',     id:'9-science-5',  n:5,  title:'Mixtures' },
  { slug:'forces',       id:'9-science-6',  n:6,  title:'Forces and Laws of Motion' },
  { slug:'energy',       id:'9-science-7',  n:7,  title:'Work and Energy' },
  { slug:'atom',         id:'9-science-8',  n:8,  title:'Journey Inside the Atom' },
  { slug:'bonding',      id:'9-science-9',  n:9,  title:'Atomic Foundations of Matter' },
  { slug:'sound',        id:'9-science-10', n:10, title:'Sound Waves' },
  { slug:'reproduction', id:'9-science-11', n:11, title:'Reproduction' },
  { slug:'diversity',    id:'9-science-12', n:12, title:'Diversity and Classification',
    /* m6 is the dichotomous key: completing it needs three organisms carried
       through a chain of yes/no questions, which the generic prodder cannot
       do. test/chapters/diversity.js drives it properly instead. */
    skipReach:['m6'] },
  { slug:'earth-system', id:'9-science-13', n:13, title:'Earth as a System' },

  /* Maths. A different subject, so a different chapter-list page — verify's
     back-link check reads cls and sub straight out of the id. */
  { slug:'coordinates',  id:'9-maths-1',   n:1,  title:'Orienting Yourself: The Use of Coordinates',
    /* m2 is aiming, not prodding: the pin has to land on one of nine named
       corners of Reiaan's room and be placed there, three times. The prodder
       parks a slider at its minimum, maximum and middle and nowhere else, so it
       can reach two of the nine by luck and never a third.
       test/chapters/coordinates.js drives it to each corner properly. */
    skipReach:['m2'] },
  { slug:'linear',       id:'9-maths-2',   n:2,  title:'Introduction to Linear Polynomials' },
  { slug:'numbers',      id:'9-maths-3',   n:3,  title:'The World of Numbers' },
  { slug:'identities',   id:'9-maths-4',   n:4,  title:'Exploring Algebraic Identities' },
  { slug:'circles',      id:'9-maths-5',   n:5,  title:"I'm Up and Down, and Round and Round" },
  { slug:'perimeter',    id:'9-maths-6',   n:6,  title:'Measuring Space: Perimeter and Area' },
  { slug:'probability',  id:'9-maths-7',   n:7,  title:'The Mathematics of Maybe: Introduction to Probability' },
  { slug:'sequences',    id:'9-maths-8',   n:8,  title:'Predicting What Comes Next: Exploring Sequences and Progressions' },

  /* Social Science. One integrated book — Understanding Society: India and
     Beyond — rather than the four separate ones Class 10 still uses. */
  { slug:'society',      id:'9-social-1',  n:1,  title:'Understanding Social Science' }
];

module.exports.file = c => c.slug + '-chapter.html';
