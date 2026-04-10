/**
 * schools.js
 * Source-of-truth school data for Laser2Uni.
 * Owner: data person
 *
 * Fields:
 *   id        – unique slug, used as key in AI response and Supabase
 *   name      – full official name
 *   short     – abbreviation for compact UI
 *   loc       – "City, ST"
 *   type      – "UC" | "CSU" | "Private" | "OOS"
 *   emoji     – decorative card emoji
 *   size      – "Large" | "Medium" | "Small"
 *   minGPA    – minimum GPA for competitive consideration
 *   tagline   – one-line card hook
 *   tags      – array of feature strings used in scoring
 *   regions   – array matching student region pill values
 *   strengths – array matching industry pill values
 *   ivcPerks  – (optional) IVC-specific pathway note shown on swipe card
 */

const SCHOOLS = [
  {
    id: 'uci',
    name: 'UC Irvine',
    short: 'UCI',
    loc: 'Irvine, CA',
    type: 'UC',
    emoji: '🔵',
    size: 'Large',
    minGPA: 3.4,
    tagline: 'Top STEM + business',
    tags: ['TAG Eligible', 'IVC Honors→UCI', 'Research'],
    regions: ['SoCal'],
    strengths: ['Tech / Software', 'Engineering / Hardware', 'Research / Academia', 'Healthcare / Medicine'],
    ivcPerks: 'IVC has a direct Honors-to-Honors articulation with UCI. TAG guarantees admission if you meet the GPA threshold for your major. Being 10 minutes away means a strong transfer community.'
  },
  {
    id: 'ucla',
    name: 'UC Los Angeles',
    short: 'UCLA',
    loc: 'Los Angeles, CA',
    type: 'UC',
    emoji: '🟡',
    size: 'Large',
    minGPA: 3.7,
    tagline: 'Prestige + massive network',
    tags: ['Highly Selective', 'Research', 'Top Ranked'],
    regions: ['SoCal'],
    strengths: ['Tech / Software', 'Business / Finance', 'Research / Academia', 'Creative / Media', 'Startups / Entrepreneurship']
  },
  {
    id: 'ucsd',
    name: 'UC San Diego',
    short: 'UCSD',
    loc: 'La Jolla, CA',
    type: 'UC',
    emoji: '🌊',
    size: 'Large',
    minGPA: 3.5,
    tagline: 'Top biotech + CS',
    tags: ['TAG Eligible', 'Biotech', 'Research-Heavy'],
    regions: ['SoCal'],
    strengths: ['Engineering / Hardware', 'Healthcare / Medicine', 'Research / Academia', 'Tech / Software'],
    ivcPerks: 'TAG eligible for most majors. Strong SoCal CC pipeline. World-class biotech and engineering programs.'
  },
  {
    id: 'ucsb',
    name: 'UC Santa Barbara',
    short: 'UCSB',
    loc: 'Santa Barbara, CA',
    type: 'UC',
    emoji: '🏖',
    size: 'Large',
    minGPA: 3.4,
    tagline: 'Research + beautiful campus',
    tags: ['TAG Eligible', 'Research', 'Social Scene'],
    regions: ['SoCal', 'NorCal / Bay Area'],
    strengths: ['Research / Academia', 'Tech / Software', 'Engineering / Hardware'],
    ivcPerks: 'TAG eligible. Strong transfer acceptance culture and excellent transfer support services.'
  },
  {
    id: 'ucd',
    name: 'UC Davis',
    short: 'UCD',
    loc: 'Davis, CA',
    type: 'UC',
    emoji: '🐄',
    size: 'Large',
    minGPA: 3.2,
    tagline: 'Strong STEM + pre-med',
    tags: ['TAG Eligible', 'Pre-Med', 'Collaborative'],
    regions: ['NorCal / Bay Area'],
    strengths: ['Healthcare / Medicine', 'Research / Academia', 'Engineering / Hardware'],
    ivcPerks: 'TAG eligible. Excellent TAG acceptance rate for transfers from SoCal CCs.'
  },
  {
    id: 'ucsc',
    name: 'UC Santa Cruz',
    short: 'UCSC',
    loc: 'Santa Cruz, CA',
    type: 'UC',
    emoji: '🌲',
    size: 'Medium',
    minGPA: 3.0,
    tagline: 'CS powerhouse, tech ties',
    tags: ['TAG Eligible', 'CS-Strong', 'Nature Campus'],
    regions: ['NorCal / Bay Area'],
    strengths: ['Tech / Software', 'Research / Academia', 'Engineering / Hardware'],
    ivcPerks: 'TAG eligible. Very transfer-friendly. CS department has strong Silicon Valley recruiting pipelines.'
  },
  {
    id: 'ucr',
    name: 'UC Riverside',
    short: 'UCR',
    loc: 'Riverside, CA',
    type: 'UC',
    emoji: '🏜',
    size: 'Medium',
    minGPA: 2.8,
    tagline: 'Accessible UC, growing fast',
    tags: ['TAG Eligible', 'Pre-Med Friendly', 'Accessible'],
    regions: ['SoCal'],
    strengths: ['Healthcare / Medicine', 'Research / Academia', 'Engineering / Hardware'],
    ivcPerks: 'One of the most transfer-friendly UCs. Very high TAG acceptance rate. Close to IVC — strong local community.'
  },
  {
    id: 'ucm',
    name: 'UC Merced',
    short: 'UCM',
    loc: 'Merced, CA',
    type: 'UC',
    emoji: '☀️',
    size: 'Small',
    minGPA: 2.4,
    tagline: 'Newest UC, small classes',
    tags: ['TAG Eligible', 'Scholarships', 'Small Classes'],
    regions: ['NorCal / Bay Area'],
    strengths: ['Research / Academia', 'Engineering / Hardware'],
    ivcPerks: 'Highest TAG acceptance rate of all UCs. Strong merit scholarships specifically for CC transfers.'
  },
  {
    id: 'csuf',
    name: 'Cal State Fullerton',
    short: 'CSUF',
    loc: 'Fullerton, CA',
    type: 'CSU',
    emoji: '🟠',
    size: 'Large',
    minGPA: 2.5,
    tagline: 'Top business + film in OC',
    tags: ['Transfer-Friendly', 'Business', 'Film/Media'],
    regions: ['SoCal'],
    strengths: ['Business / Finance', 'Creative / Media', 'Government / Policy']
  },
  {
    id: 'csulb',
    name: 'Cal State Long Beach',
    short: 'CSULB',
    loc: 'Long Beach, CA',
    type: 'CSU',
    emoji: '⚓',
    size: 'Large',
    minGPA: 2.7,
    tagline: 'Strong engineering + nursing',
    tags: ['Transfer-Friendly', 'Engineering', 'Diverse'],
    regions: ['SoCal'],
    strengths: ['Engineering / Hardware', 'Healthcare / Medicine', 'Business / Finance']
  },
  {
    id: 'cpslo',
    name: 'Cal Poly SLO',
    short: 'Cal Poly',
    loc: 'San Luis Obispo, CA',
    type: 'CSU',
    emoji: '🏔',
    size: 'Medium',
    minGPA: 3.3,
    tagline: '"Learn by doing" — hands-on',
    tags: ['Hands-On', 'Competitive CSU', 'Engineering'],
    regions: ['SoCal', 'NorCal / Bay Area'],
    strengths: ['Engineering / Hardware', 'Tech / Software', 'Startups / Entrepreneurship']
  },
  {
    id: 'sdsu',
    name: 'San Diego State',
    short: 'SDSU',
    loc: 'San Diego, CA',
    type: 'CSU',
    emoji: '🌴',
    size: 'Large',
    minGPA: 3.0,
    tagline: 'Strong business + campus life',
    tags: ['Transfer-Friendly', 'Business', 'Active Campus', 'Social Scene'],
    regions: ['SoCal'],
    strengths: ['Business / Finance', 'Creative / Media', 'Government / Policy']
  },
  {
    id: 'cpp',
    name: 'Cal Poly Pomona',
    short: 'CPP',
    loc: 'Pomona, CA',
    type: 'CSU',
    emoji: '🌿',
    size: 'Large',
    minGPA: 2.6,
    tagline: 'Practical, industry-ready',
    tags: ['Transfer-Friendly', 'Engineering', 'Hands-On'],
    regions: ['SoCal'],
    strengths: ['Engineering / Hardware', 'Tech / Software', 'Business / Finance']
  },
  {
    id: 'sjsu',
    name: 'San Jose State',
    short: 'SJSU',
    loc: 'San Jose, CA',
    type: 'CSU',
    emoji: '💻',
    size: 'Large',
    minGPA: 3.0,
    tagline: 'Silicon Valley campus',
    tags: ['Transfer-Friendly', 'Tech', 'Silicon Valley'],
    regions: ['NorCal / Bay Area'],
    strengths: ['Tech / Software', 'Engineering / Hardware', 'Business / Finance']
  },
  {
    id: 'usc',
    name: 'USC',
    short: 'USC',
    loc: 'Los Angeles, CA',
    type: 'Private',
    emoji: '⚔️',
    size: 'Large',
    minGPA: 3.8,
    tagline: 'Elite private, huge network',
    tags: ['Prestigious', 'Trojan Network', 'Selective'],
    regions: ['SoCal'],
    strengths: ['Business / Finance', 'Creative / Media', 'Engineering / Hardware', 'Tech / Software', 'Startups / Entrepreneurship']
  },
  {
    id: 'lmu',
    name: 'Loyola Marymount',
    short: 'LMU',
    loc: 'Los Angeles, CA',
    type: 'Private',
    emoji: '✨',
    size: 'Medium',
    minGPA: 3.2,
    tagline: 'Strong transfer + film + biz',
    tags: ['Transfer-Friendly', 'Private', 'Film/Business'],
    regions: ['SoCal'],
    strengths: ['Business / Finance', 'Creative / Media', 'Government / Policy']
  },
  {
    id: 'oc',
    name: 'Occidental College',
    short: 'Oxy',
    loc: 'Los Angeles, CA',
    type: 'Private',
    emoji: '🏛',
    size: 'Small',
    minGPA: 3.5,
    tagline: 'Liberal arts, small & elite',
    tags: ['Small Classes', 'Liberal Arts', 'Private'],
    regions: ['SoCal'],
    strengths: ['Research / Academia', 'Government / Policy', 'Creative / Media']
  },
  {
    id: 'asu',
    name: 'Arizona State',
    short: 'ASU',
    loc: 'Tempe, AZ',
    type: 'OOS',
    emoji: '🌵',
    size: 'Large',
    minGPA: 3.0,
    tagline: 'Massive research + merit aid',
    tags: ['Merit Scholarships', 'Large Campus', 'Out-of-State'],
    regions: ['Out of State'],
    strengths: ['Tech / Software', 'Engineering / Hardware', 'Business / Finance', 'Startups / Entrepreneurship']
  },
  {
    id: 'uw',
    name: 'Univ. of Washington',
    short: 'UW',
    loc: 'Seattle, WA',
    type: 'OOS',
    emoji: '🌧',
    size: 'Large',
    minGPA: 3.5,
    tagline: 'Top CS + engineering in PNW',
    tags: ['Research', 'CS-Strong', 'Out-of-State'],
    regions: ['Out of State'],
    strengths: ['Tech / Software', 'Engineering / Hardware', 'Research / Academia']
  },
  {
    id: 'uoregon',
    name: 'Univ. of Oregon',
    short: 'U of O',
    loc: 'Eugene, OR',
    type: 'OOS',
    emoji: '🦆',
    size: 'Large',
    minGPA: 3.0,
    tagline: 'Strong journalism + business',
    tags: ['Transfer-Friendly', 'Out-of-State', 'Creative'],
    regions: ['Out of State'],
    strengths: ['Business / Finance', 'Creative / Media', 'Government / Policy']
  }
];
