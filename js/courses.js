/**
 * courses.js
 * Course requirement data for Laser2Uni.
 * Owner: data person
 *
 * Structure: COURSE_REQUIREMENTS[schoolId][major] = { sections: [...] }
 * Each section: { title, courses: [{ key, label, note }] }
 *
 * IMPORTANT: This file is placeholder data. The data person should
 * replace labels, keys, and notes with verified ASSIST.org articulation
 * data. The structure must stay identical so only this file needs updating.
 *
 * Keys must be globally unique strings  -  used as primary keys in Supabase.
 * Convention: [schoolid]_[major_short]_[area]_[index]
 */

const COURSE_REQUIREMENTS = {

  /* ════════════════════════════════════════════
     UC IRVINE
  ════════════════════════════════════════════ */
  uci: {
    'Computer Science': {
      sections: [
        {
          title: 'Programming',
          courses: [
            { key: 'uci_cs_prog_1', label: 'CS 1  -  Intro to Programming (Python)',    note: 'Articulates to I&C SCI 31 at UCI' },
            { key: 'uci_cs_prog_2', label: 'CS 2  -  Data Structures',                  note: 'Articulates to I&C SCI 32 at UCI' },
            { key: 'uci_cs_prog_3', label: 'CS 3  -  Advanced Programming',             note: 'Articulates to I&C SCI 33 at UCI' }
          ]
        },
        {
          title: 'Calculus',
          courses: [
            { key: 'uci_cs_calc_1', label: 'MATH 2A  -  Single Variable Calculus I',   note: 'Articulates to MATH 2A at UCI' },
            { key: 'uci_cs_calc_2', label: 'MATH 2B  -  Single Variable Calculus II',  note: 'Articulates to MATH 2B at UCI' }
          ]
        },
        {
          title: 'Additional Math & CS',
          courses: [
            { key: 'uci_cs_ds',  label: 'CS 10  -  Discrete Structures',                note: 'Articulates to I&C SCI 6B/6D at UCI' },
            { key: 'uci_cs_la',  label: 'MATH 26  -  Linear Algebra',                   note: 'Articulates to MATH 3A / I&C SCI 6N at UCI' }
          ]
        }
      ]
    },
    'Business Administration': {
      sections: [
        {
          title: 'Math',
          courses: [
            { key: 'uci_bus_calc_1', label: 'MATH 2A  -  Single Variable Calculus I',   note: 'Articulates to MATH 2A at UCI' },
            { key: 'uci_bus_calc_2', label: 'MATH 2B  -  Single Variable Calculus II',  note: 'Articulates to MATH 2B at UCI' }
          ]
        },
        {
          title: 'Economics',
          courses: [
            { key: 'uci_bus_econ_1', label: 'ECON 1  -  Microeconomics',               note: 'Articulates to ECON 1 at UCI' },
            { key: 'uci_bus_econ_2', label: 'ECON 2  -  Macroeconomics',               note: 'Articulates to ECON 2 at UCI' }
          ]
        },
        {
          title: 'Statistics',
          courses: [
            { key: 'uci_bus_stat',   label: 'STAT C1000  -  Statistics',               note: 'Articulates to MGMT 7 / ECON 10 at UCI' }
          ]
        },
        {
          title: 'Accounting',
          courses: [
            { key: 'uci_bus_acct_1', label: 'ACCT 1A  -  Financial Accounting',        note: 'Articulates to ACCT 1A at UCI' },
            { key: 'uci_bus_acct_2', label: 'ACCT 1B  -  Managerial Accounting',       note: 'Articulates to ACCT 1B at UCI' }
          ]
        }
      ]
    },
    'Nursing / Pre-Nursing': {
      sections: [
        {
          title: 'Biology',
          courses: [
            { key: 'uci_nurs_bio_1', label: 'BIO 81  -  Human Anatomy',                note: 'Foundational biology requirement at UCI' },
            { key: 'uci_nurs_bio_2', label: 'BIO 82  -  Human Physiology',             note: 'Physiology requirement at UCI' },
            { key: 'uci_nurs_bio_3', label: 'BIO 72  -  Genetics',                     note: 'Articulates to BIO SCI 97 at UCI' }
          ]
        },
        {
          title: 'Chemistry',
          courses: [
            { key: 'uci_nurs_chem_1', label: 'CHEM 1A  -  General Chemistry I',        note: 'Articulates to CHEM 1A at UCI' },
            { key: 'uci_nurs_chem_2', label: 'CHEM 1B  -  General Chemistry II',       note: 'Articulates to CHEM 1B at UCI' }
          ]
        },
        {
          title: 'Statistics & Psychology',
          courses: [
            { key: 'uci_nurs_stat',   label: 'STAT C1000  -  Statistics',             note: 'Statistics requirement at UCI' },
            { key: 'uci_nurs_psyc',   label: 'PSYC C1000  -  General Psychology',     note: 'Psychology requirement at UCI' }
          ]
        }
      ]
    },
    'Mechanical Engineering': {
      sections: [
        {
          title: 'Calculus & Physics',
          courses: [
            { key: 'uci_me_calc_1', label: 'MATH 2A  -  Single Variable Calculus I',   note: 'Articulates to MATH 2A at UCI' },
            { key: 'uci_me_calc_2', label: 'MATH 2B  -  Single Variable Calculus II',  note: 'Articulates to MATH 2B at UCI' },
            { key: 'uci_me_phys_1', label: 'PHYS 2A  -  Physics: Mechanics',           note: 'Articulates to PHYS 2A at UCI' },
            { key: 'uci_me_phys_2', label: 'PHYS 2B  -  Physics: Waves & Thermo',      note: 'Articulates to PHYS 2B at UCI' }
          ]
        },
        {
          title: 'Chemistry',
          courses: [
            { key: 'uci_me_chem', label: 'CHEM 1A  -  General Chemistry I',            note: 'Chemistry requirement at UCI' }
          ]
        }
      ]
    },
    'Psychology': {
      sections: [
        {
          title: 'Core Psychology',
          courses: [
            { key: 'uci_psyc_1',    label: 'PSYC C1000  -  General Psychology',       note: 'Foundation requirement at UCI' },
            { key: 'uci_psyc_stat', label: 'PSYC 10  -  Statistics for Psychology',   note: 'Statistics requirement at UCI' },
            { key: 'uci_psyc_bio',  label: 'BIO 1  -  General Biology',               note: 'Biology requirement at UCI' }
          ]
        }
      ]
    },
    'Biology': {
      sections: [
        {
          title: 'Biology Sequence',
          courses: [
            { key: 'uci_bio_1', label: 'BIO 1  -  General Biology I',                  note: 'Articulates to BIO SCI 93 at UCI' },
            { key: 'uci_bio_2', label: 'BIO 2  -  General Biology II',                 note: 'Articulates to BIO SCI 94 at UCI' }
          ]
        },
        {
          title: 'Chemistry Sequence',
          courses: [
            { key: 'uci_bio_chem_1', label: 'CHEM 1A  -  General Chemistry I',        note: 'Articulates to CHEM 1A at UCI' },
            { key: 'uci_bio_chem_2', label: 'CHEM 1B  -  General Chemistry II',       note: 'Articulates to CHEM 1B at UCI' }
          ]
        },
        {
          title: 'Math',
          courses: [
            { key: 'uci_bio_math', label: 'MATH 2A  -  Calculus (or STAT C1000)',     note: 'Math requirement at UCI' }
          ]
        }
      ]
    },
    'History': {
      sections: [
        {
          title: 'Core Requirements',
          courses: [
            { key: 'uci_hist_1',   label: 'HIST 1  -  World History I',               note: 'Lower-division history prep' },
            { key: 'uci_hist_2',   label: 'HIST 2  -  World History II',              note: 'Lower-division history prep' },
            { key: 'uci_hist_eng', label: 'ENGLISH C1000  -  English Composition',    note: 'Writing requirement' }
          ]
        }
      ]
    },
    'Accounting': {
      sections: [
        {
          title: 'Accounting Core',
          courses: [
            { key: 'uci_acct_1', label: 'ACCT 1A  -  Financial Accounting',           note: 'Articulates to ACCT 1A at UCI' },
            { key: 'uci_acct_2', label: 'ACCT 1B  -  Managerial Accounting',          note: 'Articulates to ACCT 1B at UCI' }
          ]
        },
        {
          title: 'Math & Economics',
          courses: [
            { key: 'uci_acct_calc',   label: 'MATH 2A  -  Calculus',                  note: 'Math requirement' },
            { key: 'uci_acct_econ_1', label: 'ECON 1  -  Microeconomics',             note: 'Economics requirement' },
            { key: 'uci_acct_econ_2', label: 'ECON 2  -  Macroeconomics',             note: 'Economics requirement' }
          ]
        }
      ]
    },
    'Communication': {
      sections: [
        {
          title: 'Core',
          courses: [
            { key: 'uci_comm_1',   label: 'COMM C1000  -  Public Speaking',           note: 'Lower-division communication prep' },
            { key: 'uci_comm_eng', label: 'ENGLISH C1000  -  English Composition',    note: 'Writing requirement' },
            { key: 'uci_comm_soc', label: 'SOCIOL 1  -  Introduction to Sociology',   note: 'Social science requirement' }
          ]
        }
      ]
    },
    'Education': {
      sections: [
        {
          title: 'Core',
          courses: [
            { key: 'uci_edu_psyc', label: 'PSYC C1000  -  General Psychology',       note: 'Foundation for education studies' },
            { key: 'uci_edu_eng',  label: 'ENGLISH C1000  -  English Composition',   note: 'Writing requirement' },
            { key: 'uci_edu_soc',  label: 'SOCIOL 1  -  Introduction to Sociology',  note: 'Social foundation requirement' }
          ]
        }
      ]
    }
  }
};

// ── Placeholder generator for all other schools ──────────────────
// Generates placeholder entries for schools that haven't been
// filled in with real ASSIST.org data yet.
(function buildPlaceholders() {
  const otherSchools = [
    'ucb', 'ucla', 'ucsd', 'ucsb', 'ucd', 'ucsc', 'ucr', 'ucm',
    'csuf', 'csulb', 'cpslo', 'sdsu', 'cpp', 'sjsu',
    'usc', 'lmu', 'oc', 'chapman'
  ];

  const majors = [
    'Computer Science', 'Business Administration', 'Nursing / Pre-Nursing',
    'Mechanical Engineering', 'Psychology', 'Biology',
    'History', 'Accounting', 'Communication', 'Education'
  ];

  const placeholder = (schoolId, majorKey) => ({
    sections: [
      {
        title: 'Requirements (Placeholder)',
        courses: [
          {
            key:   `${schoolId}_${majorKey}_placeholder_1`,
            label: 'Placeholder  -  verify on assist.org',
            note:  'Your data teammate will fill this in with verified articulation data from assist.org'
          },
          {
            key:   `${schoolId}_${majorKey}_placeholder_2`,
            label: 'Placeholder  -  verify on assist.org',
            note:  'Check the school\'s transfer admissions page for major-specific requirements'
          }
        ]
      }
    ]
  });

  otherSchools.forEach(schoolId => {
    COURSE_REQUIREMENTS[schoolId] = {};
    majors.forEach(major => {
      const majorKey = major.toLowerCase().replace(/[^a-z]/g, '_').slice(0, 12);
      COURSE_REQUIREMENTS[schoolId][major] = placeholder(schoolId, majorKey);
    });
  });
})();
