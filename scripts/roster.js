// Auto-extracted from the original seed.js — roster, team colors, fallback bios.
// Source of truth for the player set; enriched with live stats by scripts/build-data.js

const PLAYER_LIST = [
  {
    "id": 1,
    "nbaId": 2544,
    "name": "LeBron James",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 23,
    "position": "SF"
  },
  {
    "id": 2,
    "nbaId": 201939,
    "name": "Stephen Curry",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 30,
    "position": "PG"
  },
  {
    "id": 3,
    "nbaId": 201142,
    "name": "Kevin Durant",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 35,
    "position": "SF"
  },
  {
    "id": 4,
    "nbaId": 203507,
    "name": "Giannis Antetokounmpo",
    "team": "Milwaukee Bucks",
    "teamShort": "MIL",
    "jersey": 34,
    "position": "PF"
  },
  {
    "id": 5,
    "nbaId": 203999,
    "name": "Nikola Jokic",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 15,
    "position": "C"
  },
  {
    "id": 6,
    "nbaId": 1629029,
    "name": "Luka Doncic",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 77,
    "position": "PG"
  },
  {
    "id": 7,
    "nbaId": 203954,
    "name": "Joel Embiid",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 21,
    "position": "C"
  },
  {
    "id": 8,
    "nbaId": 1628369,
    "name": "Jayson Tatum",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 9,
    "nbaId": 203081,
    "name": "Damian Lillard",
    "team": "Milwaukee Bucks",
    "teamShort": "MIL",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 10,
    "nbaId": 1628983,
    "name": "Shai Gilgeous-Alexander",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 2,
    "position": "PG"
  },
  {
    "id": 11,
    "nbaId": 203076,
    "name": "Anthony Davis",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 3,
    "position": "C"
  },
  {
    "id": 12,
    "nbaId": 1626164,
    "name": "Devin Booker",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 1,
    "position": "SG"
  },
  {
    "id": 13,
    "nbaId": 1630162,
    "name": "Anthony Edwards",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 5,
    "position": "SG"
  },
  {
    "id": 14,
    "nbaId": 1641705,
    "name": "Victor Wembanyama",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 1,
    "position": "C"
  },
  {
    "id": 15,
    "nbaId": 1629630,
    "name": "Ja Morant",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 12,
    "position": "PG"
  },
  {
    "id": 16,
    "nbaId": 1629027,
    "name": "Trae Young",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 11,
    "position": "PG"
  },
  {
    "id": 17,
    "nbaId": 1626157,
    "name": "Karl-Anthony Towns",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 32,
    "position": "C"
  },
  {
    "id": 18,
    "nbaId": 1629627,
    "name": "Zion Williamson",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 1,
    "position": "PF"
  },
  {
    "id": 19,
    "nbaId": 1627759,
    "name": "Jaylen Brown",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 7,
    "position": "SG"
  },
  {
    "id": 20,
    "nbaId": 1628389,
    "name": "Bam Adebayo",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 13,
    "position": "C"
  },
  {
    "id": 21,
    "nbaId": 1627783,
    "name": "Pascal Siakam",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 43,
    "position": "PF"
  },
  {
    "id": 22,
    "nbaId": 1628368,
    "name": "De'Aaron Fox",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 5,
    "position": "PG"
  },
  {
    "id": 23,
    "nbaId": 1630169,
    "name": "Tyrese Haliburton",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 24,
    "nbaId": 1628378,
    "name": "Donovan Mitchell",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 45,
    "position": "SG"
  },
  {
    "id": 25,
    "nbaId": 202695,
    "name": "Kawhi Leonard",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 2,
    "position": "SF"
  },
  {
    "id": 26,
    "nbaId": 1629636,
    "name": "Darius Garland",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 10,
    "position": "PG"
  },
  {
    "id": 27,
    "nbaId": 1630596,
    "name": "Evan Mobley",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 4,
    "position": "C"
  },
  {
    "id": 28,
    "nbaId": 1630595,
    "name": "Cade Cunningham",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 2,
    "position": "PG"
  },
  {
    "id": 29,
    "nbaId": 1630567,
    "name": "Scottie Barnes",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 4,
    "position": "SF"
  },
  {
    "id": 30,
    "nbaId": 1631114,
    "name": "Jalen Williams",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 8,
    "position": "SG"
  },
  {
    "id": 31,
    "nbaId": 1630163,
    "name": "LaMelo Ball",
    "team": "Charlotte Hornets",
    "teamShort": "CHA",
    "jersey": 1,
    "position": "PG"
  },
  {
    "id": 32,
    "nbaId": 1631094,
    "name": "Paolo Banchero",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 5,
    "position": "PF"
  },
  {
    "id": 33,
    "nbaId": 1630532,
    "name": "Franz Wagner",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 21,
    "position": "SF"
  },
  {
    "id": 34,
    "nbaId": 1627742,
    "name": "Brandon Ingram",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 14,
    "position": "SF"
  },
  {
    "id": 35,
    "nbaId": 1627749,
    "name": "Dejounte Murray",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 5,
    "position": "PG"
  },
  {
    "id": 36,
    "nbaId": 1628384,
    "name": "OG Anunoby",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 8,
    "position": "SF"
  },
  {
    "id": 37,
    "nbaId": 203944,
    "name": "Julius Randle",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 30,
    "position": "PF"
  },
  {
    "id": 38,
    "nbaId": 1626167,
    "name": "Myles Turner",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 33,
    "position": "C"
  },
  {
    "id": 39,
    "nbaId": 1628386,
    "name": "Jarrett Allen",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 31,
    "position": "C"
  },
  {
    "id": 40,
    "nbaId": 203497,
    "name": "Rudy Gobert",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 27,
    "position": "C"
  },
  {
    "id": 41,
    "nbaId": 203200,
    "name": "Jrue Holiday",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 4,
    "position": "PG"
  },
  {
    "id": 42,
    "nbaId": 1630217,
    "name": "Desmond Bane",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 22,
    "position": "SG"
  },
  {
    "id": 43,
    "nbaId": 1628991,
    "name": "Jaren Jackson Jr.",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 13,
    "position": "PF"
  },
  {
    "id": 44,
    "nbaId": 203897,
    "name": "Zach LaVine",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 8,
    "position": "SG"
  },
  {
    "id": 45,
    "nbaId": 202696,
    "name": "Nikola Vucevic",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 9,
    "position": "C"
  },
  {
    "id": 46,
    "nbaId": 202331,
    "name": "Paul George",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 8,
    "position": "SF"
  },
  {
    "id": 47,
    "nbaId": 203110,
    "name": "Draymond Green",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 23,
    "position": "PF"
  },
  {
    "id": 48,
    "nbaId": 202691,
    "name": "Klay Thompson",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 31,
    "position": "SG"
  },
  {
    "id": 49,
    "nbaId": 203952,
    "name": "Andrew Wiggins",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 22,
    "position": "SF"
  },
  {
    "id": 50,
    "nbaId": 1629639,
    "name": "Tyler Herro",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 14,
    "position": "SG"
  },
  {
    "id": 51,
    "nbaId": 1629628,
    "name": "RJ Barrett",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 9,
    "position": "SG"
  },
  {
    "id": 52,
    "nbaId": 1628969,
    "name": "Mikal Bridges",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 7,
    "position": "SF"
  },
  {
    "id": 53,
    "nbaId": 1628970,
    "name": "Miles Bridges",
    "team": "Charlotte Hornets",
    "teamShort": "CHA",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 54,
    "nbaId": 1630581,
    "name": "Josh Giddey",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 3,
    "position": "PG"
  },
  {
    "id": 55,
    "nbaId": 1630193,
    "name": "Immanuel Quickley",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 5,
    "position": "PG"
  },
  {
    "id": 56,
    "nbaId": 1629632,
    "name": "Coby White",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 57,
    "nbaId": 1629673,
    "name": "Jordan Poole",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 13,
    "position": "SG"
  },
  {
    "id": 58,
    "nbaId": 1641706,
    "name": "Scoot Henderson",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 59,
    "nbaId": 1630559,
    "name": "Austin Reaves",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 15,
    "position": "SG"
  },
  {
    "id": 60,
    "nbaId": 203078,
    "name": "Bradley Beal",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 3,
    "position": "SG"
  },
  {
    "id": 61,
    "nbaId": 204001,
    "name": "Kristaps Porzingis",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 8,
    "position": "C"
  },
  {
    "id": 62,
    "nbaId": 1628401,
    "name": "Derrick White",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 9,
    "position": "PG"
  },
  {
    "id": 63,
    "nbaId": 1629675,
    "name": "Naz Reid",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 11,
    "position": "C"
  },
  {
    "id": 64,
    "nbaId": 201572,
    "name": "Brook Lopez",
    "team": "Milwaukee Bucks",
    "teamShort": "MIL",
    "jersey": 11,
    "position": "C"
  },
  {
    "id": 65,
    "nbaId": 203114,
    "name": "Khris Middleton",
    "team": "Milwaukee Bucks",
    "teamShort": "MIL",
    "jersey": 22,
    "position": "SF"
  },
  {
    "id": 66,
    "nbaId": 101108,
    "name": "Chris Paul",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 3,
    "position": "PG"
  },
  {
    "id": 67,
    "nbaId": 1628398,
    "name": "Kyle Kuzma",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 33,
    "position": "PF"
  },
  {
    "id": 68,
    "nbaId": 1629014,
    "name": "Anfernee Simons",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 1,
    "position": "SG"
  },
  {
    "id": 69,
    "nbaId": 1631108,
    "name": "Cam Thomas",
    "team": "Brooklyn Nets",
    "teamShort": "BKN",
    "jersey": 21,
    "position": "SG"
  },
  {
    "id": 70,
    "nbaId": 1629651,
    "name": "Nic Claxton",
    "team": "Brooklyn Nets",
    "teamShort": "BKN",
    "jersey": 33,
    "position": "C"
  },
  {
    "id": 71,
    "nbaId": 203924,
    "name": "Jerami Grant",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 9,
    "position": "SF"
  },
  {
    "id": 72,
    "nbaId": 1630228,
    "name": "Jonathan Kuminga",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 73,
    "nbaId": 1631095,
    "name": "Jabari Smith Jr.",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 10,
    "position": "PF"
  },
  {
    "id": 74,
    "nbaId": 1630578,
    "name": "Alperen Sengun",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 28,
    "position": "C"
  },
  {
    "id": 75,
    "nbaId": 1630224,
    "name": "Jalen Green",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 4,
    "position": "SG"
  },
  {
    "id": 76,
    "nbaId": 1641707,
    "name": "Amen Thompson",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 1,
    "position": "SF"
  },
  {
    "id": 77,
    "nbaId": 1631096,
    "name": "Chet Holmgren",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 7,
    "position": "C"
  },
  {
    "id": 78,
    "nbaId": 1629652,
    "name": "Luguentz Dort",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 5,
    "position": "SG"
  },
  {
    "id": 79,
    "nbaId": 1631100,
    "name": "Jeremy Sochan",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 10,
    "position": "PF"
  },
  {
    "id": 80,
    "nbaId": 1630170,
    "name": "Devin Vassell",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 24,
    "position": "SG"
  },
  {
    "id": 81,
    "nbaId": 1629059,
    "name": "Donte DiVincenzo",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 82,
    "nbaId": 1628404,
    "name": "Josh Hart",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 3,
    "position": "SF"
  },
  {
    "id": 83,
    "nbaId": 202710,
    "name": "Jimmy Butler",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 22,
    "position": "SF"
  },
  {
    "id": 84,
    "nbaId": 201942,
    "name": "DeMar DeRozan",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 10,
    "position": "SG"
  },
  {
    "id": 85,
    "nbaId": 202699,
    "name": "Tobias Harris",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 12,
    "position": "PF"
  },
  {
    "id": 86,
    "nbaId": 201143,
    "name": "Al Horford",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 42,
    "position": "C"
  },
  {
    "id": 87,
    "nbaId": 203935,
    "name": "Marcus Smart",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 36,
    "position": "PG"
  },
  {
    "id": 88,
    "nbaId": 1626156,
    "name": "D'Angelo Russell",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 1,
    "position": "PG"
  },
  {
    "id": 89,
    "nbaId": 204020,
    "name": "Terry Rozier",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 2,
    "position": "PG"
  },
  {
    "id": 90,
    "nbaId": 1627832,
    "name": "Fred VanVleet",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 5,
    "position": "PG"
  },
  {
    "id": 91,
    "nbaId": 1630178,
    "name": "Tyrese Maxey",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 92,
    "nbaId": 1627734,
    "name": "Domantas Sabonis",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 11,
    "position": "C"
  },
  {
    "id": 93,
    "nbaId": 1631121,
    "name": "Scottie Pippen Jr.",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 1,
    "position": "PG"
  },
  {
    "id": 94,
    "nbaId": 1630231,
    "name": "Tre Jones",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 33,
    "position": "PG"
  },
  {
    "id": 95,
    "nbaId": 1628976,
    "name": "Wendell Carter Jr.",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 34,
    "position": "C"
  },
  {
    "id": 96,
    "nbaId": 1630175,
    "name": "Cole Anthony",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 50,
    "position": "PG"
  },
  {
    "id": 97,
    "nbaId": 1629018,
    "name": "Gary Trent Jr.",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 33,
    "position": "SG"
  },
  {
    "id": 98,
    "nbaId": 1630172,
    "name": "Patrick Williams",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 44,
    "position": "SF"
  },
  {
    "id": 99,
    "nbaId": 1628771,
    "name": "Isaiah Stewart",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 28,
    "position": "C"
  },
  {
    "id": 100,
    "nbaId": 1629006,
    "name": "Tyus Jones",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 5,
    "position": "PG"
  },
  {
    "id": 101,
    "nbaId": 1628973,
    "name": "Jalen Brunson",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 102,
    "nbaId": 202681,
    "name": "Kyrie Irving",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 103,
    "nbaId": 1627750,
    "name": "Jamal Murray",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 104,
    "nbaId": 203932,
    "name": "Aaron Gordon",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 105,
    "nbaId": 1629008,
    "name": "Michael Porter Jr.",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 106,
    "nbaId": 201935,
    "name": "James Harden",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 107,
    "nbaId": 1626181,
    "name": "Norman Powell",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 108,
    "nbaId": 1627826,
    "name": "Ivica Zubac",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 109,
    "nbaId": 1629060,
    "name": "Rui Hachimura",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 110,
    "nbaId": 1629028,
    "name": "Deandre Ayton",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 111,
    "nbaId": 1631101,
    "name": "Shaedon Sharpe",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 112,
    "nbaId": 1630166,
    "name": "Deni Avdija",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 113,
    "nbaId": 1628374,
    "name": "Lauri Markkanen",
    "team": "Utah Jazz",
    "teamShort": "UTA",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 114,
    "nbaId": 1631117,
    "name": "Walker Kessler",
    "team": "Utah Jazz",
    "teamShort": "UTA",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 115,
    "nbaId": 1629012,
    "name": "Collin Sexton",
    "team": "Utah Jazz",
    "teamShort": "UTA",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 116,
    "nbaId": 1628370,
    "name": "Malik Monk",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 117,
    "nbaId": 1631099,
    "name": "Keegan Murray",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 118,
    "nbaId": 1630530,
    "name": "Trey Murphy III",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 119,
    "nbaId": 1630529,
    "name": "Herbert Jones",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 120,
    "nbaId": 203468,
    "name": "CJ McCollum",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 121,
    "nbaId": 1631105,
    "name": "Jalen Duren",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 122,
    "nbaId": 1631093,
    "name": "Jaden Ivey",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 123,
    "nbaId": 1641709,
    "name": "Ausar Thompson",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 124,
    "nbaId": 1631097,
    "name": "Bennedict Mathurin",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 125,
    "nbaId": 1629614,
    "name": "Andrew Nembhard",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 126,
    "nbaId": 1630174,
    "name": "Aaron Nesmith",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 127,
    "nbaId": 1630552,
    "name": "Jalen Johnson",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 128,
    "nbaId": 1630168,
    "name": "Onyeka Okongwu",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 129,
    "nbaId": 1630183,
    "name": "Jaden McDaniels",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 130,
    "nbaId": 201144,
    "name": "Mike Conley",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 131,
    "nbaId": 1627741,
    "name": "Buddy Hield",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 132,
    "nbaId": 1641764,
    "name": "Brandin Podziemski",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 133,
    "nbaId": 1628415,
    "name": "Dillon Brooks",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 134,
    "nbaId": 1631106,
    "name": "Tari Eason",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 135,
    "nbaId": 203500,
    "name": "Steven Adams",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 136,
    "nbaId": 1629631,
    "name": "De'Andre Hunter",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 137,
    "nbaId": 1629622,
    "name": "Max Strus",
    "team": "Cleveland Cavaliers",
    "teamShort": "CLE",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 138,
    "nbaId": 1627751,
    "name": "Jakob Poeltl",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 139,
    "nbaId": 1641711,
    "name": "Gradey Dick",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 140,
    "nbaId": 9000140,
    "name": "Brandon Miller",
    "team": "Charlotte Hornets",
    "teamShort": "CHA",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 141,
    "nbaId": 1642258,
    "name": "Zaccharie Risacher",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 0,
    "position": "SF"
  },
  {
    "id": 142,
    "nbaId": 1631128,
    "name": "Christian Braun",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 143,
    "nbaId": 1630591,
    "name": "Jalen Suggs",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "PG"
  },
  {
    "id": 144,
    "nbaId": 1628371,
    "name": "Jonathan Isaac",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 145,
    "nbaId": 203484,
    "name": "Kentavious Caldwell-Pope",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 146,
    "nbaId": 1629023,
    "name": "P.J. Washington",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "PF"
  },
  {
    "id": 147,
    "nbaId": 1629655,
    "name": "Daniel Gafford",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 148,
    "nbaId": 1641726,
    "name": "Dereck Lively II",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 149,
    "nbaId": 1629638,
    "name": "Nickeil Alexander-Walker",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 0,
    "position": "SG"
  },
  {
    "id": 150,
    "nbaId": 1641744,
    "name": "Zach Edey",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 0,
    "position": "C"
  },
  {
    "id": 151,
    "nbaId": 1642843,
    "name": "Cooper Flagg",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 152,
    "nbaId": 1642844,
    "name": "Dylan Harper",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 153,
    "nbaId": 1642845,
    "name": "VJ Edgecombe",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 154,
    "nbaId": 1642846,
    "name": "Ace Bailey",
    "team": "Utah Jazz",
    "teamShort": "UTA",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 155,
    "nbaId": 1642851,
    "name": "Kon Knueppel",
    "team": "Charlotte Hornets",
    "teamShort": "CHA",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 156,
    "nbaId": 1642848,
    "name": "Tre Johnson",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 157,
    "nbaId": 1642264,
    "name": "Stephon Castle",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 158,
    "nbaId": 1642263,
    "name": "Reed Sheppard",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 159,
    "nbaId": 1642259,
    "name": "Alexandre Sarr",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 160,
    "nbaId": 1642272,
    "name": "Jared McCain",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 161,
    "nbaId": 1642270,
    "name": "Donovan Clingan",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 162,
    "nbaId": 1641824,
    "name": "Matas Buzelis",
    "team": "Chicago Bulls",
    "teamShort": "CHI",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 163,
    "nbaId": 1642267,
    "name": "Carlton Carrington",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 164,
    "nbaId": 1642274,
    "name": "Yves Missi",
    "team": "New Orleans Pelicans",
    "teamShort": "NOP",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 165,
    "nbaId": 1642261,
    "name": "Dalton Knecht",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 166,
    "nbaId": 1641731,
    "name": "Bilal Coulibaly",
    "team": "Washington Wizards",
    "teamShort": "WAS",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 167,
    "nbaId": 1642377,
    "name": "Jaylen Wells",
    "team": "Memphis Grizzlies",
    "teamShort": "MEM",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 168,
    "nbaId": 1630700,
    "name": "Dyson Daniels",
    "team": "Atlanta Hawks",
    "teamShort": "ATL",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 169,
    "nbaId": 1641739,
    "name": "Toumani Camara",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "PF",
    "legend": false
  },
  {
    "id": 170,
    "nbaId": 1630560,
    "name": "Cam Thomas",
    "team": "Brooklyn Nets",
    "teamShort": "BKN",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 171,
    "nbaId": 1630202,
    "name": "Payton Pritchard",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 172,
    "nbaId": 1629656,
    "name": "Quentin Grimes",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 173,
    "nbaId": 1629661,
    "name": "Cameron Johnson",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 174,
    "nbaId": 203992,
    "name": "Bogdan Bogdanovic",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 175,
    "nbaId": 1627736,
    "name": "Malik Beasley",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 176,
    "nbaId": 1630182,
    "name": "Josh Green",
    "team": "Charlotte Hornets",
    "teamShort": "CHA",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 177,
    "nbaId": 1628392,
    "name": "Isaiah Hartenstein",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 178,
    "nbaId": 202685,
    "name": "Jonas Valanciunas",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 179,
    "nbaId": 203991,
    "name": "Clint Capela",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 180,
    "nbaId": 1626171,
    "name": "Bobby Portis",
    "team": "Milwaukee Bucks",
    "teamShort": "MIL",
    "jersey": 0,
    "position": "PF",
    "legend": false
  },
  {
    "id": 181,
    "nbaId": 1629011,
    "name": "Mitchell Robinson",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 182,
    "nbaId": 1630208,
    "name": "Nick Richards",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 183,
    "nbaId": 1629048,
    "name": "Goga Bitadze",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 184,
    "nbaId": 1629057,
    "name": "Robert Williams III",
    "team": "Portland Trail Blazers",
    "teamShort": "POR",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 185,
    "nbaId": 203083,
    "name": "Andre Drummond",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "C",
    "legend": false
  },
  {
    "id": 186,
    "nbaId": 203471,
    "name": "Dennis Schroder",
    "team": "Sacramento Kings",
    "teamShort": "SAC",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 187,
    "nbaId": 1628971,
    "name": "Bruce Brown",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 188,
    "nbaId": 203501,
    "name": "Tim Hardaway Jr.",
    "team": "Denver Nuggets",
    "teamShort": "DEN",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 189,
    "nbaId": 1627747,
    "name": "Caris LeVert",
    "team": "Detroit Pistons",
    "teamShort": "DET",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 190,
    "nbaId": 1626162,
    "name": "Kelly Oubre Jr.",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 191,
    "nbaId": 203903,
    "name": "Jordan Clarkson",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 192,
    "nbaId": 1628960,
    "name": "Grayson Allen",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 193,
    "nbaId": 1627780,
    "name": "Gary Payton II",
    "team": "Golden State Warriors",
    "teamShort": "GSW",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 194,
    "nbaId": 1630167,
    "name": "Obi Toppin",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "PF",
    "legend": false
  },
  {
    "id": 195,
    "nbaId": 204456,
    "name": "T.J. McConnell",
    "team": "Indiana Pacers",
    "teamShort": "IND",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 196,
    "nbaId": 1630598,
    "name": "Aaron Wiggins",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 197,
    "nbaId": 1641717,
    "name": "Cason Wallace",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 0,
    "position": "PG",
    "legend": false
  },
  {
    "id": 198,
    "nbaId": 1630198,
    "name": "Isaiah Joe",
    "team": "Oklahoma City Thunder",
    "teamShort": "OKC",
    "jersey": 0,
    "position": "SG",
    "legend": false
  },
  {
    "id": 199,
    "nbaId": 1630573,
    "name": "Sam Hauser",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "SF",
    "legend": false
  },
  {
    "id": 200,
    "nbaId": 1630173,
    "name": "Precious Achiuwa",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "PF",
    "legend": false
  },
  {
    "id": 201,
    "nbaId": 977,
    "name": "Kobe Bryant",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 0,
    "position": "SG",
    "legend": true
  },
  {
    "id": 202,
    "nbaId": 406,
    "name": "Shaquille O'Neal",
    "team": "Los Angeles Lakers",
    "teamShort": "LAL",
    "jersey": 0,
    "position": "C",
    "legend": true
  },
  {
    "id": 203,
    "nbaId": 1495,
    "name": "Tim Duncan",
    "team": "San Antonio Spurs",
    "teamShort": "SAS",
    "jersey": 0,
    "position": "PF",
    "legend": true
  },
  {
    "id": 204,
    "nbaId": 1717,
    "name": "Dirk Nowitzki",
    "team": "Dallas Mavericks",
    "teamShort": "DAL",
    "jersey": 0,
    "position": "PF",
    "legend": true
  },
  {
    "id": 205,
    "nbaId": 947,
    "name": "Allen Iverson",
    "team": "Philadelphia 76ers",
    "teamShort": "PHI",
    "jersey": 0,
    "position": "PG",
    "legend": true
  },
  {
    "id": 206,
    "nbaId": 708,
    "name": "Kevin Garnett",
    "team": "Minnesota Timberwolves",
    "teamShort": "MIN",
    "jersey": 0,
    "position": "PF",
    "legend": true
  },
  {
    "id": 207,
    "nbaId": 2548,
    "name": "Dwyane Wade",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 0,
    "position": "SG",
    "legend": true
  },
  {
    "id": 208,
    "nbaId": 959,
    "name": "Steve Nash",
    "team": "Phoenix Suns",
    "teamShort": "PHX",
    "jersey": 0,
    "position": "PG",
    "legend": true
  },
  {
    "id": 209,
    "nbaId": 1713,
    "name": "Vince Carter",
    "team": "Toronto Raptors",
    "teamShort": "TOR",
    "jersey": 0,
    "position": "SG",
    "legend": true
  },
  {
    "id": 210,
    "nbaId": 951,
    "name": "Ray Allen",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "SG",
    "legend": true
  },
  {
    "id": 211,
    "nbaId": 1718,
    "name": "Paul Pierce",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "SF",
    "legend": true
  },
  {
    "id": 212,
    "nbaId": 1503,
    "name": "Tracy McGrady",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "SF",
    "legend": true
  },
  {
    "id": 213,
    "nbaId": 2730,
    "name": "Dwight Howard",
    "team": "Orlando Magic",
    "teamShort": "ORL",
    "jersey": 0,
    "position": "C",
    "legend": true
  },
  {
    "id": 214,
    "nbaId": 2546,
    "name": "Carmelo Anthony",
    "team": "New York Knicks",
    "teamShort": "NYK",
    "jersey": 0,
    "position": "SF",
    "legend": true
  },
  {
    "id": 215,
    "nbaId": 2547,
    "name": "Chris Bosh",
    "team": "Miami Heat",
    "teamShort": "MIA",
    "jersey": 0,
    "position": "PF",
    "legend": true
  },
  {
    "id": 216,
    "nbaId": 201933,
    "name": "Blake Griffin",
    "team": "Los Angeles Clippers",
    "teamShort": "LAC",
    "jersey": 0,
    "position": "PF",
    "legend": true
  },
  {
    "id": 217,
    "nbaId": 200765,
    "name": "Rajon Rondo",
    "team": "Boston Celtics",
    "teamShort": "BOS",
    "jersey": 0,
    "position": "PG",
    "legend": true
  },
  {
    "id": 218,
    "nbaId": 2397,
    "name": "Yao Ming",
    "team": "Houston Rockets",
    "teamShort": "HOU",
    "jersey": 0,
    "position": "C",
    "legend": true
  }
];

const TEAM_COLORS = {
  "LAL": {
    "primary": "#552583",
    "secondary": "#FDB927"
  },
  "GSW": {
    "primary": "#1D428A",
    "secondary": "#FFC72C"
  },
  "PHX": {
    "primary": "#1D1160",
    "secondary": "#E56020"
  },
  "MIL": {
    "primary": "#00471B",
    "secondary": "#EEE1C6"
  },
  "DEN": {
    "primary": "#0E2240",
    "secondary": "#FEC524"
  },
  "DAL": {
    "primary": "#00538C",
    "secondary": "#002B5E"
  },
  "PHI": {
    "primary": "#006BB6",
    "secondary": "#ED174C"
  },
  "BOS": {
    "primary": "#007A33",
    "secondary": "#BA9653"
  },
  "OKC": {
    "primary": "#007AC1",
    "secondary": "#EF3B24"
  },
  "MEM": {
    "primary": "#12173F",
    "secondary": "#5D76A9"
  },
  "ATL": {
    "primary": "#E03A3E",
    "secondary": "#C1D32F"
  },
  "NYK": {
    "primary": "#006BB6",
    "secondary": "#F58426"
  },
  "NOP": {
    "primary": "#0C2340",
    "secondary": "#C8102E"
  },
  "MIA": {
    "primary": "#98002E",
    "secondary": "#F9A01B"
  },
  "IND": {
    "primary": "#002D62",
    "secondary": "#FDBB30"
  },
  "SAC": {
    "primary": "#5A2D81",
    "secondary": "#63727A"
  },
  "CLE": {
    "primary": "#860038",
    "secondary": "#FDBB30"
  },
  "LAC": {
    "primary": "#C8102E",
    "secondary": "#1D428A"
  },
  "DET": {
    "primary": "#C8102E",
    "secondary": "#1D42BA"
  },
  "TOR": {
    "primary": "#CE1141",
    "secondary": "#000000"
  },
  "CHA": {
    "primary": "#1D1160",
    "secondary": "#00788C"
  },
  "ORL": {
    "primary": "#0077C0",
    "secondary": "#C4CED4"
  },
  "MIN": {
    "primary": "#0C2340",
    "secondary": "#236192"
  },
  "CHI": {
    "primary": "#CE1141",
    "secondary": "#000000"
  },
  "POR": {
    "primary": "#E03A3E",
    "secondary": "#000000"
  },
  "SAS": {
    "primary": "#000000",
    "secondary": "#C4CED4"
  },
  "WAS": {
    "primary": "#002B5C",
    "secondary": "#E31837"
  },
  "BKN": {
    "primary": "#000000",
    "secondary": "#AAAAAA"
  },
  "HOU": {
    "primary": "#CE1141",
    "secondary": "#C4CED4"
  },
  "UTA": {
    "primary": "#002B5C",
    "secondary": "#00471B"
  }
};

const BIO_FALLBACK = {
  "2544": {
    "height": "6'9\"",
    "weight": "250 lbs",
    "born": "December 30, 1984",
    "birthplace": "Akron, OH",
    "college": "None (Prep-to-Pro)",
    "draft": "2003 NBA Draft, Round 1, Pick 1 (Cleveland)",
    "bio": "LeBron James is widely regarded as one of the greatest players in NBA history. A four-time champion and four-time Finals MVP, he became the NBA all-time scoring leader in 2023 and continues to excel in his 22nd season at the highest level."
  },
  "201142": {
    "height": "6'10\"",
    "weight": "240 lbs",
    "born": "September 29, 1988",
    "birthplace": "Washington, DC",
    "college": "University of Texas",
    "draft": "2007 NBA Draft, Round 1, Pick 2 (Seattle)",
    "bio": "Kevin Durant is one of the most gifted scorers in NBA history. A two-time champion, two-time Finals MVP, and 14-time All-Star, his combination of length and touch makes him virtually unguardable at any position."
  },
  "201939": {
    "height": "6'2\"",
    "weight": "185 lbs",
    "born": "March 14, 1988",
    "birthplace": "Charlotte, NC",
    "college": "Davidson College",
    "draft": "2009 NBA Draft, Round 1, Pick 7 (Golden State)",
    "bio": "Stephen Curry revolutionized basketball with his unprecedented three-point shooting. A two-time MVP, four-time champion, and the greatest shooter in NBA history, his release and range have permanently changed how the game is played."
  },
  "203076": {
    "height": "6'10\"",
    "weight": "253 lbs",
    "born": "March 11, 1993",
    "birthplace": "Westchester, CA",
    "college": "University of Kentucky",
    "draft": "2012 NBA Draft, Round 1, Pick 1 (New Orleans)",
    "bio": "Anthony Davis is one of the most physically imposing centers in NBA history. A 2020 NBA Champion and Finals MVP, his combination of inside dominance, shot-blocking, and perimeter scoring makes him virtually unguardable."
  },
  "203081": {
    "height": "6'2\"",
    "weight": "195 lbs",
    "born": "July 15, 1990",
    "birthplace": "Oakland, CA",
    "college": "Weber State University",
    "draft": "2012 NBA Draft, Round 1, Pick 6 (Cleveland)",
    "bio": "Damian Lillard is one of the clutchest players and best free-throw shooters in NBA history. A six-time All-Star and 2023 NBA Champion, Dame Time is a constant threat from well beyond the arc at any moment."
  },
  "203507": {
    "height": "6'11\"",
    "weight": "243 lbs",
    "born": "December 6, 1994",
    "birthplace": "Athens, Greece",
    "college": "None (International)",
    "draft": "2013 NBA Draft, Round 1, Pick 15 (Milwaukee)",
    "bio": "Giannis Antetokounmpo — \"The Greek Freak\" — is a two-time MVP and 2021 NBA Champion. His combination of size, speed, and skill is virtually unprecedented in league history, making him one of the most dominant players of his generation."
  },
  "203954": {
    "height": "7'0\"",
    "weight": "280 lbs",
    "born": "March 16, 1994",
    "birthplace": "Thiaroye, Senegal",
    "college": "None (International)",
    "draft": "2014 NBA Draft, Round 1, Pick 3 (Philadelphia)",
    "bio": "Joel Embiid is a three-time scoring champion and the 2023 NBA MVP. One of the most skilled big men the league has ever seen, his footwork, face-up game, and post moves are elite, as is his ability to draw fouls."
  },
  "203999": {
    "height": "6'11\"",
    "weight": "284 lbs",
    "born": "February 19, 1995",
    "birthplace": "Sombor, Serbia",
    "college": "None (International)",
    "draft": "2014 NBA Draft, Round 2, Pick 41 (Denver)",
    "bio": "Nikola Jokic is a three-time MVP and two-time champion who has redefined the center position. His basketball IQ, passing vision, and scoring versatility are unmatched in NBA history for a big man."
  },
  "1626157": {
    "height": "7'0\"",
    "weight": "270 lbs",
    "born": "November 15, 1995",
    "birthplace": "Santo Domingo, DR",
    "college": "None (International)",
    "draft": "2015 NBA Draft, Round 1, Pick 1 (Minnesota)",
    "bio": "Karl-Anthony Towns is a versatile big man with elite scoring ability from all three levels. A three-time All-Star and 2024 All-Star MVP, KAT joined the Knicks and immediately became one of their most impactful players."
  },
  "1626164": {
    "height": "6'5\"",
    "weight": "206 lbs",
    "born": "October 30, 1996",
    "birthplace": "Boston, MA",
    "college": "University of Kentucky",
    "draft": "2015 NBA Draft, Round 1, Pick 13 (Phoenix)",
    "bio": "Devin Booker is an elite scorer and a cornerstone of the Phoenix Suns. A five-time All-Star known for his shooting touch and late-game clutch performances, Booker is one of the premier shooting guards in the league."
  },
  "1627759": {
    "height": "6'6\"",
    "weight": "223 lbs",
    "born": "October 24, 1996",
    "birthplace": "Ames, IA",
    "college": "University of California",
    "draft": "2016 NBA Draft, Round 1, Pick 3 (Boston)",
    "bio": "Jaylen Brown is a two-way star and 2024 NBA Champion and Finals MVP. A relentless competitor, Brown's physicality, athleticism, and scoring versatility make him one of the best wings in the Western Conference."
  },
  "1628369": {
    "height": "6'8\"",
    "weight": "210 lbs",
    "born": "March 3, 1998",
    "birthplace": "Millbrook, AL",
    "college": "Duke University",
    "draft": "2017 NBA Draft, Round 1, Pick 3 (Boston)",
    "bio": "Jayson Tatum is a four-time All-Star and 2024 NBA Champion who led the Celtics to their 18th title. One of the premier two-way wings in the NBA, Tatum continues to add dimensions to his game each season."
  },
  "1628389": {
    "height": "6'9\"",
    "weight": "255 lbs",
    "born": "July 18, 1997",
    "birthplace": "Newark, NJ",
    "college": "University of Kentucky",
    "draft": "2017 NBA Draft, Round 1, Pick 14 (Miami)",
    "bio": "Bam Adebayo is one of the best two-way big men in the NBA. A three-time All-Star and 2020 All-Defensive Team selection, his defense, passing, and versatility anchor Miami's identity as a gritty, defensive-minded team."
  },
  "1628983": {
    "height": "6'6\"",
    "weight": "195 lbs",
    "born": "July 12, 2001",
    "birthplace": "Toronto, Canada",
    "college": "University of Kentucky",
    "draft": "2018 NBA Draft, Round 1, Pick 11 (LA Clippers)",
    "bio": "Shai Gilgeous-Alexander is the 2024-25 NBA scoring champion and MVP, averaging a staggering 32.7 points per game. His footwork, mid-range brilliance, and elite two-way play make him the face of the Oklahoma City dynasty."
  },
  "1629011": {
    "height": "6'3\"",
    "weight": "174 lbs",
    "born": "August 10, 1999",
    "birthplace": "Dalzell, SC",
    "college": "Murray State University",
    "draft": "2019 NBA Draft, Round 1, Pick 12 (Memphis)",
    "bio": "Ja Morant is one of the most electrifying athletes in NBA history. Known for his jaw-dropping dunks and explosive drives, the two-time Dunk Contest champion is a highlight machine who controls the pace of any game."
  },
  "1629027": {
    "height": "6'1\"",
    "weight": "164 lbs",
    "born": "September 19, 2001",
    "birthplace": "Lubbock, TX",
    "college": "University of Oklahoma",
    "draft": "2018 NBA Draft, Round 1, Pick 5 (Dallas)",
    "bio": "Trae Young is one of the most prolific scorers and passers in the NBA. The 2022-23 assists leader and four-time All-Star, Young's deep shooting range and elite playmaking have established him as the face of the Atlanta Hawks."
  },
  "1629029": {
    "height": "6'7\"",
    "weight": "230 lbs",
    "born": "February 28, 1999",
    "birthplace": "Ljubljana, Slovenia",
    "college": "None (International)",
    "draft": "2018 NBA Draft, Round 1, Pick 3 (Atlanta)",
    "bio": "Luka Doncic became one of the most dominant offensive players in the NBA by just his mid-20s. A perennial MVP candidate, he led the Mavericks to the 2024 Finals and brings elite passing, shooting, and playmaking to every game."
  },
  "1629627": {
    "height": "6'6\"",
    "weight": "284 lbs",
    "born": "July 6, 2000",
    "birthplace": "Baltimore, MD",
    "college": "Duke University",
    "draft": "2019 NBA Draft, Round 1, Pick 1 (New Orleans)",
    "bio": "Zion Williamson is a physical force unlike any player in recent memory. When healthy, his combination of explosive athleticism, strength, and scoring touch at 285 pounds is truly unique in NBA history."
  },
  "1630162": {
    "height": "6'4\"",
    "weight": "225 lbs",
    "born": "August 5, 2001",
    "birthplace": "Atlanta, GA",
    "college": "University of Georgia",
    "draft": "2020 NBA Draft, Round 1, Pick 1 (Minnesota)",
    "bio": "Anthony Edwards burst onto the scene as the No. 1 pick in 2020 and has quickly become one of the most electrifying players in the NBA. His explosive athleticism, fearless scoring, and growing defensive intensity make him a superstar."
  },
  "1641705": {
    "height": "7'4\"",
    "weight": "210 lbs",
    "born": "January 4, 2004",
    "birthplace": "Le Chesnay, France",
    "college": "None (International)",
    "draft": "2023 NBA Draft, Round 1, Pick 1 (San Antonio)",
    "bio": "Victor Wembanyama is a generational talent unlike anything the NBA has ever seen. Standing 7'4\" with 8-foot wingspan, his combination of shot-blocking, three-point shooting, and ball-handling at his size is unprecedented."
  }
};

module.exports = { PLAYER_LIST, TEAM_COLORS, BIO_FALLBACK };
