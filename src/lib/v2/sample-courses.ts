// The sample courses behind "Try a sample course" (docs/COURSES.md). They were built ahead of time
// by /api/v2/courses/analyze from two of our own test decks, test-data/photosynthesis.pdf and
// test-data/ww2-origins.pdf, then read through and tightened by hand: fewer ideas per part, one point
// per core, and every part of the history course on the dominoes or the table layout, which were both
// drawn and checked (docs/V2.md, "Board layouts"). Loading one needs no upload and no call to Claude,
// so a demo never waits on the network.

import { CourseSchema, type Course } from "./courses";

const RAW: unknown[] = [
  {
    "id": "sample-photosynthesis",
    "title": "Photosynthesis",
    "createdAt": 1794700800000,
    "files": [
      {
        "name": "photosynthesis.pdf",
        "pages": 22
      }
    ],
    "sample": true,
    "parts": [
      {
        "id": "what-photosynthesis-is",
        "origin": "course",
        "title": "What photosynthesis is",
        "blurb": "What goes in, what comes out, and where.",
        "about": "what photosynthesis is",
        "firstMessage": "Hi, I'm Milo! I don't know anything about what photosynthesis is. Can you explain it to me? I'll draw what you say.",
        "keywords": [
          "photosynthesis",
          "autotrophs",
          "glucose",
          "stomata",
          "xylem",
          "chlorophyll",
          "cellulose",
          "by-product"
        ],
        "layout": "process",
        "keyIdeas": [
          {
            "id": "definition",
            "idea": "Photosynthesis is the process by which plants, algae and some bacteria use light energy to make sugars from carbon dioxide and water, converting light energy into chemical energy stored in glucose.",
            "core": "Plants use light energy to make sugar from carbon dioxide and water.",
            "term": "photosynthesis",
            "gapLabel": "What plants do with light"
          },
          {
            "id": "inputs",
            "idea": "Carbon dioxide diffuses in from the air through the stomata, water is taken up by the roots and carried in the xylem, and light is absorbed by chlorophyll in the chloroplasts.",
            "core": "Carbon dioxide and water go in, with light. How each gets in is a bonus.",
            "term": "carbon dioxide",
            "gapLabel": "What the plant needs to take in"
          },
          {
            "id": "outputs",
            "idea": "Glucose and oxygen are made: 6CO2 + 6H2O → C6H12O6 + 6O2, using light energy and chlorophyll.",
            "core": "Glucose and oxygen come out. The balanced equation is a bonus.",
            "term": "glucose",
            "gapLabel": "What gets made at the end"
          },
          {
            "id": "oxygen-source",
            "idea": "The oxygen released is a by-product and comes from the water, not from the carbon dioxide; it diffuses out through the stomata, and the plant uses some in respiration.",
            "core": "The oxygen given off comes from the water, not from the carbon dioxide.",
            "term": "",
            "gapLabel": "Where the released gas comes from"
          },
          {
            "id": "glucose-uses",
            "idea": "Glucose is used in respiration, stored as starch, or built into cellulose for cell walls.",
            "core": "The plant uses the glucose for energy or stores it as starch. Cellulose is a bonus.",
            "term": "starch",
            "gapLabel": "What the plant does with its sugar"
          }
        ]
      },
      {
        "id": "the-chloroplast",
        "origin": "course",
        "title": "Inside a chloroplast",
        "blurb": "Its parts, and which job each one does.",
        "about": "what is inside a chloroplast",
        "firstMessage": "Hi, I'm Milo! I don't know anything about what is inside a chloroplast. Can you explain it to me? I'll draw what you say.",
        "keywords": [
          "chloroplast",
          "envelope",
          "thylakoid",
          "granum",
          "grana",
          "stroma",
          "rubisco",
          "chlorophyll",
          "carotenoids",
          "photosystems"
        ],
        "layout": "structure",
        "keyIdeas": [
          {
            "id": "envelope",
            "idea": "The envelope is a double membrane (outer and inner) around the whole organelle.",
            "core": "A double membrane, the envelope, wraps the whole chloroplast.",
            "term": "envelope",
            "gapLabel": "What wraps around the outside"
          },
          {
            "id": "thylakoids",
            "idea": "Thylakoids are flattened membrane sacs whose membranes hold chlorophyll and the proteins of the light-dependent reactions.",
            "core": "Thylakoids are flat sacs whose membranes hold the chlorophyll.",
            "term": "thylakoids",
            "gapLabel": "Where the light gets caught"
          },
          {
            "id": "grana",
            "idea": "Grana are stacks of thylakoids; stacking gives a large membrane surface for absorbing light.",
            "core": "The sacs are stacked into grana, which gives a big surface to absorb light.",
            "term": "grana",
            "gapLabel": "Why the sacs are piled up"
          },
          {
            "id": "stroma",
            "idea": "The stroma is the fluid around the thylakoids; it holds the enzymes of the Calvin cycle, including rubisco.",
            "core": "The stroma is the fluid inside, where the Calvin cycle happens. Rubisco is a bonus.",
            "term": "stroma",
            "gapLabel": "What fills the space inside"
          },
          {
            "id": "chlorophyll",
            "idea": "Chlorophyll a and b absorb mostly red and blue-violet light and reflect green, so leaves look green; carotenoids absorb other wavelengths; pigments and proteins form photosystems in the thylakoid membrane.",
            "core": "Chlorophyll absorbs red and blue light and reflects green. Carotenoids are a bonus.",
            "term": "chlorophyll",
            "gapLabel": "Why leaves look green"
          }
        ]
      },
      {
        "id": "light-dependent-reactions",
        "origin": "course",
        "title": "The light-dependent reactions",
        "blurb": "How light energy becomes ATP and NADPH.",
        "about": "the light-dependent reactions of photosynthesis",
        "firstMessage": "Hi, I'm Milo! I don't know anything about the light-dependent reactions of photosynthesis. Can you explain it to me? I'll draw what you say.",
        "keywords": [
          "thylakoid",
          "photosystem II",
          "photosystem I",
          "electron transport chain",
          "photolysis",
          "ATP synthase",
          "ATP",
          "NADPH",
          "NADP+"
        ],
        "layout": "process",
        "keyIdeas": [
          {
            "id": "absorbing-light",
            "idea": "In the thylakoid membranes, light is absorbed by chlorophyll in photosystem II and photosystem I, lifting electrons to a higher energy level.",
            "core": "Chlorophyll absorbs the light, which gives its electrons extra energy. Photosystems are a bonus.",
            "term": "chlorophyll",
            "gapLabel": "What the light does first"
          },
          {
            "id": "electron-chain",
            "idea": "The excited electrons leave the chlorophyll and pass along an electron transport chain.",
            "core": "The energised electrons are passed along a chain of proteins.",
            "term": "electron transport chain",
            "gapLabel": "Where the energised electrons go"
          },
          {
            "id": "photolysis",
            "idea": "Water is split (photolysis) to replace the lost electrons: 2H2O → 4H+ + 4e− + O2, and the oxygen is released as a by-product.",
            "core": "Water is split to replace the lost electrons, which releases oxygen.",
            "term": "photolysis",
            "gapLabel": "How the lost electrons get replaced"
          },
          {
            "id": "making-atp",
            "idea": "Energy from the moving electrons pumps H+ ions into the thylakoid space; they flow back out through ATP synthase, which makes ATP from ADP and phosphate.",
            "core": "The electrons' energy is used to make ATP. Hydrogen ions and ATP synthase are a bonus.",
            "term": "ATP",
            "gapLabel": "How the energy gets stored"
          },
          {
            "id": "making-nadph",
            "idea": "At the end of the chain, electrons and H+ reduce NADP+ to NADPH; ATP and NADPH pass into the stroma for the Calvin cycle.",
            "core": "At the end NADPH is made, and it goes on to the next stage with the ATP.",
            "term": "NADPH",
            "gapLabel": "What carries the hydrogen onward"
          }
        ]
      },
      {
        "id": "the-calvin-cycle",
        "origin": "course",
        "title": "The Calvin cycle",
        "blurb": "How carbon dioxide gets built into sugar.",
        "about": "the Calvin cycle",
        "firstMessage": "Hi, I'm Milo! I don't know anything about the Calvin cycle. Can you explain it to me? I'll draw what you say.",
        "keywords": [
          "Calvin cycle",
          "stroma",
          "RuBP",
          "ribulose bisphosphate",
          "rubisco",
          "GP",
          "glycerate 3-phosphate",
          "triose phosphate",
          "NADPH",
          "carbon fixation"
        ],
        "layout": "process",
        "keyIdeas": [
          {
            "id": "where-and-fuel",
            "idea": "The Calvin cycle runs in the stroma; it does not use light directly but depends on ATP and NADPH from the light-dependent reactions, so it stops soon after dark.",
            "core": "It runs on the ATP and NADPH from the light stage, not on light directly. The stroma is a bonus.",
            "term": "",
            "gapLabel": "What this stage runs on"
          },
          {
            "id": "carbon-fixation",
            "idea": "Rubisco joins CO2 to the 5-carbon sugar RuBP; the unstable 6-carbon product splits at once into two 3-carbon GP molecules. This is carbon fixation.",
            "core": "The enzyme rubisco joins carbon dioxide onto a sugar called RuBP. The carbon counts are a bonus.",
            "term": "rubisco",
            "gapLabel": "How the carbon gets captured"
          },
          {
            "id": "reduction",
            "idea": "GP is reduced to triose phosphate, a 3-carbon sugar, using energy from ATP and hydrogen from NADPH.",
            "core": "The product is turned into a small sugar, triose phosphate, using ATP and NADPH.",
            "term": "triose phosphate",
            "gapLabel": "How the first product becomes sugar"
          },
          {
            "id": "regeneration",
            "idea": "Five out of every six triose phosphates are used to regenerate RuBP, which needs more ATP.",
            "core": "Most of that sugar is used to remake RuBP, so the cycle can go round again.",
            "term": "RuBP",
            "gapLabel": "How the loop keeps going"
          },
          {
            "id": "output",
            "idea": "One in six triose phosphates leaves the cycle to build glucose and other molecules (starch, cellulose, lipids, amino acids); six turns fix six CO2 for one glucose, costing 18 ATP and 12 NADPH.",
            "core": "Some of that sugar leaves the cycle to build glucose. The numbers are a bonus.",
            "term": "glucose",
            "gapLabel": "What leaves the loop"
          }
        ]
      },
      {
        "id": "limiting-factors",
        "origin": "course",
        "title": "What limits photosynthesis",
        "blurb": "Light, carbon dioxide and temperature.",
        "about": "what limits the rate of photosynthesis",
        "firstMessage": "Hi, I'm Milo! I don't know anything about what limits the rate of photosynthesis. Can you explain it to me? I'll draw what you say.",
        "keywords": [
          "limiting factor",
          "light intensity",
          "carbon dioxide concentration",
          "optimum",
          "denature",
          "enzymes",
          "glasshouses"
        ],
        "layout": "structure",
        "keyIdeas": [
          {
            "id": "limiting-factor",
            "idea": "The rate of photosynthesis is set by whichever needed factor is in shortest supply: the limiting factor.",
            "core": "The rate is held back by whichever needed thing is in shortest supply.",
            "term": "limiting factor",
            "gapLabel": "What decides how fast it goes"
          },
          {
            "id": "light-intensity",
            "idea": "More light gives a faster rate until another factor (CO2 or temperature) runs short and the curve levels off.",
            "core": "More light speeds it up, until something else runs short and the rate levels off.",
            "term": "light intensity",
            "gapLabel": "What happens with more and more light"
          },
          {
            "id": "carbon-dioxide",
            "idea": "Carbon dioxide concentration follows the same pattern; air is only about 0.04% CO2, so it is often limiting on a bright day.",
            "core": "Carbon dioxide can run short, because there is so little of it in air. 0.04% is a bonus.",
            "term": "carbon dioxide",
            "gapLabel": "Why a bright day may not be enough"
          },
          {
            "id": "temperature",
            "idea": "Enzymes work faster as it warms, up to an optimum; above that they denature and the rate falls sharply.",
            "core": "Warmth speeds the enzymes up to a best point, then they denature and the rate drops.",
            "term": "denature",
            "gapLabel": "What too much heat does"
          },
          {
            "id": "glasshouses",
            "idea": "Growers add extra light, heat and CO2 in glasshouses to raise yield; crop yields depend on photosynthesis.",
            "core": "Growers add light, heat and carbon dioxide in glasshouses.",
            "term": "glasshouse",
            "gapLabel": "How growers get bigger harvests"
          }
        ]
      }
    ],
    "skipped": [
      "Deadlines, office hours and exam dates",
      "The reading list and the tutorial sheet",
      "Why photosynthesis matters: a short list of facts, kept in the outline"
    ],
    "outline": [
      {
        "heading": "What is photosynthesis",
        "facts": [
          "Plants, algae and some bacteria use light to make sugars from CO2 and water",
          "Light energy becomes chemical energy in glucose",
          "Photosynthesisers are autotrophs (producers)",
          "Oxygen released as a by-product",
          "Mainly in leaves, in cells with chloroplasts"
        ]
      },
      {
        "heading": "Overall equation",
        "facts": [
          "6CO2 + 6H2O → C6H12O6 + 6O2, with light energy and chlorophyll",
          "A summary of many steps in two stages",
          "Energy is taken in",
          "Released oxygen comes from water, not CO2"
        ]
      },
      {
        "heading": "Inputs and outputs",
        "facts": [
          "CO2 diffuses in through stomata",
          "Water taken up by roots, carried in xylem",
          "Light absorbed by chlorophyll",
          "Glucose used in respiration, stored as starch, built into cellulose",
          "Oxygen diffuses out through stomata; some used in respiration"
        ]
      },
      {
        "heading": "Chloroplast structure",
        "facts": [
          "Envelope: double membrane",
          "Thylakoids: flattened sacs holding chlorophyll and light-reaction proteins",
          "Grana: thylakoid stacks giving large surface for light",
          "Stroma: fluid with Calvin cycle enzymes incl. rubisco",
          "Own DNA, ribosomes, often starch grains"
        ]
      },
      {
        "heading": "Chlorophyll and light",
        "facts": [
          "Chlorophyll a and b absorb red and blue-violet light",
          "Green reflected or transmitted, so leaves look green",
          "Carotenoids absorb other wavelengths and pass energy on",
          "Pigments and proteins form photosystems in thylakoid membrane",
          "Absorbed light lifts electrons to higher energy"
        ]
      },
      {
        "heading": "Two stages",
        "facts": [
          "Light-dependent reactions in thylakoid membranes make ATP and NADPH",
          "Calvin cycle in stroma spends them to build sugar",
          "ADP, Pi and NADP+ return to the light stage"
        ]
      },
      {
        "heading": "Light-dependent reactions: capturing light",
        "facts": [
          "Need light; in thylakoid membranes",
          "Light absorbed in photosystem II and photosystem I",
          "Excited electrons pass along electron transport chain",
          "Photolysis: 2H2O → 4H+ + 4e− + O2 replaces electrons",
          "Oxygen released"
        ]
      },
      {
        "heading": "Light-dependent reactions: ATP and NADPH",
        "facts": [
          "Electron energy pumps H+ into thylakoid space",
          "H+ flows out through ATP synthase, making ATP",
          "Electrons and H+ reduce NADP+ to NADPH",
          "Products: ATP, NADPH, oxygen",
          "ATP and NADPH go to the stroma"
        ]
      },
      {
        "heading": "Calvin cycle: carbon fixation",
        "facts": [
          "In stroma; not directly light-driven but needs ATP and NADPH",
          "Rubisco joins CO2 to 5-carbon RuBP",
          "Unstable 6-carbon product splits into two 3-carbon GP",
          "Carbon fixation: gas carbon becomes organic molecule"
        ]
      },
      {
        "heading": "Calvin cycle: building sugar",
        "facts": [
          "GP reduced to triose phosphate using ATP and NADPH",
          "5 of 6 triose phosphates regenerate RuBP, using ATP",
          "1 of 6 leaves to make glucose, starch, cellulose, lipids, amino acids",
          "Six turns fix six CO2: one glucose",
          "One glucose costs 18 ATP and 12 NADPH"
        ]
      },
      {
        "heading": "Two stages compared",
        "facts": [
          "Where: thylakoid membranes vs stroma",
          "Needs: light, water, ADP, NADP+ vs CO2, ATP, NADPH",
          "Makes: ATP, NADPH, O2 vs triose phosphate then glucose",
          "Key event: water split vs CO2 fixed by rubisco",
          "Light: needed directly vs not directly, stops soon after dark"
        ]
      },
      {
        "heading": "Limiting factors",
        "facts": [
          "Rate set by factor in shortest supply",
          "Light intensity: rate rises then levels off",
          "CO2: same pattern; air about 0.04% CO2",
          "Temperature: rises to optimum, then enzymes denature, rate falls sharply",
          "Glasshouses add light, heat and CO2 to raise yield"
        ]
      },
      {
        "heading": "Limiting factor graphs",
        "facts": [
          "Light curve rises, then plateaus when CO2 or temperature limits",
          "Temperature curve rises, peaks at optimum, drops steeply"
        ]
      },
      {
        "heading": "Why photosynthesis matters",
        "facts": [
          "Entry point for energy into almost every food chain",
          "Produced and maintains atmospheric oxygen",
          "Removes CO2 from air; part of the carbon cycle",
          "Coal, oil and gas come from ancient photosynthesisers",
          "Crop yields depend on it"
        ]
      }
    ]
  },
  {
    "id": "sample-ww2-origins",
    "title": "The origins of the Second World War",
    "createdAt": 1794700800000,
    "files": [
      {
        "name": "ww2-origins.pdf",
        "pages": 27
      }
    ],
    "sample": true,
    "parts": [
      {
        "id": "treaty-of-versailles",
        "origin": "course",
        "title": "The Treaty of Versailles",
        "blurb": "Its main terms, and why Germans resented it.",
        "about": "the Treaty of Versailles and why Germans resented it",
        "firstMessage": "Hi, I'm Milo! I don't know anything about the Treaty of Versailles and why Germans resented it. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "Versailles",
          "Article 231",
          "reparations",
          "Diktat",
          "Rhineland",
          "demilitarised",
          "Alsace-Lorraine",
          "Polish Corridor",
          "hyperinflation",
          "conscription"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "dictated-peace",
            "idea": "The treaty was signed on 28 June 1919; Germany was not allowed to take part in the negotiations and had to accept the terms, so Germans called it a dictated peace (Diktat).",
            "core": "Germany had no say in the treaty and was forced to accept it. The date is a bonus.",
            "term": "Diktat",
            "gapLabel": "Who got a say in the peace"
          },
          {
            "id": "war-guilt",
            "idea": "Under the war guilt clause (Article 231) Germany had to accept responsibility for the loss and damage of the war, which Germans felt as a national humiliation.",
            "core": "Germany had to accept the blame for the war. Article 231 is a bonus.",
            "term": "war guilt",
            "gapLabel": "Who was blamed for the war"
          },
          {
            "id": "reparations",
            "idea": "Germany had to pay reparations for the damage, fixed in 1921 at 132 billion gold marks (about £6.6 billion), and they were blamed for hardship, especially the hyperinflation of 1923.",
            "core": "Germany had to pay for the war damage. The sum and the 1923 hyperinflation are a bonus.",
            "term": "reparations",
            "gapLabel": "Who paid for the damage"
          },
          {
            "id": "lost-land",
            "idea": "Germany lost about 13% of its European territory and a tenth of its population, plus all colonies (e.g. Alsace-Lorraine to France, the Polish Corridor to Poland); union with Austria was forbidden and millions of German speakers were left outside its borders.",
            "core": "Germany lost land and all its colonies. The percentages and the examples are a bonus.",
            "term": "",
            "gapLabel": "What happened to Germany's borders"
          },
          {
            "id": "armed-forces",
            "idea": "The army was cut to 100,000 volunteers with no conscription, tanks, air force or submarines, and the Rhineland was demilitarised, leaving Germans feeling defenceless.",
            "core": "Germany's army was cut to a tiny size. The 100,000 figure and the Rhineland are a bonus.",
            "term": "",
            "gapLabel": "How big Germany's army could be"
          }
        ]
      },
      {
        "id": "depression-to-hitler",
        "origin": "course",
        "title": "From the Depression to Hitler",
        "blurb": "How an economic crash brought the Nazis to power.",
        "about": "how the Great Depression brought Hitler to power",
        "firstMessage": "Hi, I'm Milo! I don't know anything about how the Great Depression brought Hitler to power. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "Wall Street Crash",
          "Great Depression",
          "Reichstag",
          "Chancellor",
          "Enabling Act",
          "Nazis",
          "Communists",
          "unemployment"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "crash",
            "idea": "In October 1929 share prices on the New York stock exchange collapsed in the Wall Street Crash.",
            "core": "Share prices in New York collapsed, which started the Depression. October 1929 is a bonus.",
            "term": "Wall Street Crash",
            "gapLabel": "What went wrong in New York"
          },
          {
            "id": "loans",
            "idea": "Germany's 1920s recovery depended on American loans, and American banks now called them in.",
            "core": "Germany depended on American loans, and the banks demanded them back.",
            "term": "",
            "gapLabel": "Why Germany was hit so hard"
          },
          {
            "id": "unemployment",
            "idea": "German firms closed and banks failed; world trade more than halved 1929–1933, and unemployment rose from 1.4 million in 1928 to about 6 million in early 1932, one worker in three.",
            "core": "Millions of Germans lost their jobs. About 6 million, one in three, is a bonus.",
            "term": "unemployment",
            "gapLabel": "What happened to German workers"
          },
          {
            "id": "extremes",
            "idea": "Voters turned to extreme parties: the Nazi vote rose from 2.6% (1928) to 18.3% (1930) to 37.3% in July 1932, making them the largest party; the Communists rose from 11% to 17%.",
            "core": "Desperate voters turned to extreme parties, and the Nazis became the largest party. The percentages are a bonus.",
            "term": "Nazis",
            "gapLabel": "Who people started voting for"
          },
          {
            "id": "hitler-chancellor",
            "idea": "Hitler was appointed Chancellor on 30 January 1933, and by the Enabling Act of March 1933 Germany became a one-party dictatorship.",
            "core": "Hitler was made Chancellor and quickly turned Germany into a dictatorship. The dates are a bonus.",
            "term": "Chancellor",
            "gapLabel": "How German democracy ended"
          }
        ]
      },
      {
        "id": "breaking-the-treaty",
        "origin": "course",
        "title": "How Hitler broke the treaty",
        "blurb": "Rearmament, the Rhineland and Austria, step by step.",
        "about": "how Hitler broke the Treaty of Versailles",
        "firstMessage": "Hi, I'm Milo! I don't know anything about how Hitler broke the Treaty of Versailles. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "Rhineland",
          "Anschluss",
          "Locarno",
          "conscription",
          "Luftwaffe",
          "Austria",
          "Czechoslovakia",
          "League of Nations",
          "living space"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "aims",
            "idea": "Hitler's foreign aims were to overturn Versailles, unite all German speakers in one state and take living space in eastern Europe, all meaning border changes by force if needed; Germany left the League in October 1933.",
            "core": "Hitler wanted to overturn the treaty and take land in the east. Uniting German speakers is a bonus.",
            "term": "",
            "gapLabel": "What Hitler wanted abroad"
          },
          {
            "id": "rearmament",
            "idea": "Germany rearmed secretly from 1933 and in March 1935 openly announced conscription and an air force; there were only protests, and in June 1935 Britain even signed a naval agreement with Germany.",
            "core": "Germany rebuilt its armed forces, which the treaty forbade. The 1935 dates are a bonus.",
            "term": "rearmament",
            "gapLabel": "How Germany rebuilt its forces"
          },
          {
            "id": "rhineland",
            "idea": "On 7 March 1936 a small German force, ordered to pull back if resisted, entered the demilitarised Rhineland; France had a caretaker government and would not act without Britain, many Britons saw it as Germany's own territory, and the League was busy with Abyssinia.",
            "core": "German troops marched into the Rhineland, where none were allowed, and nobody stopped them.",
            "term": "Rhineland",
            "gapLabel": "Where the troops marched first"
          },
          {
            "id": "anschluss",
            "idea": "After pressuring Austria and blocking its independence vote, German troops entered on 12 March 1938 without resistance and Austria was absorbed; a Nazi-run vote claimed 99%, and Czechoslovakia was surrounded on three sides.",
            "core": "Germany took over Austria in 1938, although union was forbidden.",
            "term": "Anschluss",
            "gapLabel": "How two countries became one"
          },
          {
            "id": "bolder",
            "idea": "Each step met only protests, so Hitler's confidence and popularity grew, Germany fortified its western border and France's eastern allies doubted its support.",
            "core": "Each step that went unpunished made Hitler bolder.",
            "term": "",
            "gapLabel": "What happened when nobody pushed back"
          }
        ]
      },
      {
        "id": "league-of-nations",
        "origin": "course",
        "title": "Why the League of Nations failed",
        "blurb": "Its weaknesses, and two tests it failed.",
        "about": "why the League of Nations failed",
        "firstMessage": "Hi, I'm Milo! I don't know anything about why the League of Nations failed. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "League of Nations",
          "collective security",
          "sanctions",
          "Manchuria",
          "Abyssinia",
          "Ethiopia",
          "Suez Canal",
          "unanimous"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "collective-security",
            "idea": "The League was set up in 1920 to settle disputes by discussion and keep peace through collective security: members acting together against an aggressor.",
            "core": "Members were meant to act together against any country that attacked another.",
            "term": "collective security",
            "gapLabel": "How the League meant to keep peace"
          },
          {
            "id": "missing-members",
            "idea": "The United States never joined, Germany and the Soviet Union were left out at first, and the League had no armed forces of its own.",
            "core": "The United States never joined, and the League had no army of its own.",
            "term": "",
            "gapLabel": "What the League was missing"
          },
          {
            "id": "manchuria",
            "idea": "In September 1931 Japan occupied Manchuria after staging a railway explosion; the League's inquiry took a year, it condemned Japan in February 1933, and Japan left the League and kept Manchuria with no sanctions.",
            "core": "Japan seized Manchuria and the League did nothing that stopped it. The dates are a bonus.",
            "term": "Manchuria",
            "gapLabel": "What happened when Japan invaded"
          },
          {
            "id": "abyssinia",
            "idea": "In October 1935 Italy invaded Abyssinia, a League member; sanctions left out oil and kept the Suez Canal open, Britain and France secretly offered Italy much of the country, and Italy completed the conquest in May 1936; sanctions were lifted in July.",
            "core": "Italy invaded Abyssinia and the League's sanctions were too weak to stop it. Oil and the secret deal are a bonus.",
            "term": "Abyssinia",
            "gapLabel": "What happened when Italy invaded"
          },
          {
            "id": "lesson",
            "idea": "Berlin, Rome and Tokyo concluded that the League would not stop a determined great power.",
            "core": "Aggressive countries learned that the League would not stop them.",
            "term": "",
            "gapLabel": "What the aggressors learned"
          }
        ]
      },
      {
        "id": "appeasement-and-munich",
        "origin": "course",
        "title": "Appeasement and the Munich Agreement",
        "blurb": "Why Britain gave way, and the Sudetenland deal.",
        "about": "appeasement and the Munich Agreement",
        "firstMessage": "Hi, I'm Milo! I don't know anything about appeasement and the Munich Agreement. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "appeasement",
          "Neville Chamberlain",
          "Munich Agreement",
          "Sudetenland",
          "Czechoslovakia",
          "peace for our time",
          "Dominions"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "what-appeasement",
            "idea": "Appeasement was the policy of avoiding war by negotiating with Germany and accepting some of its demands, linked with British Prime Minister Neville Chamberlain (1937–1940); France followed Britain's lead.",
            "core": "Britain tried to avoid war by giving Germany some of what it demanded.",
            "term": "appeasement",
            "gapLabel": "How Britain hoped to avoid war"
          },
          {
            "id": "why-appease",
            "idea": "It was followed because of memories of 1914–1918 and public desire for peace, a view that Versailles was too harsh, the Depression and unreadiness for war, fear of communism, and no certainty of US support.",
            "core": "People feared another great war. Other reasons, such as not being ready, are a bonus.",
            "term": "",
            "gapLabel": "Why Britain chose to give way"
          },
          {
            "id": "sudetenland",
            "idea": "About 3 million German speakers lived in the Sudetenland, Czechoslovakia's border regions holding its frontier defences; in 1938 Hitler demanded it and threatened war.",
            "core": "Hitler demanded a German-speaking border region of Czechoslovakia and threatened war.",
            "term": "Sudetenland",
            "gapLabel": "What Hitler demanded next"
          },
          {
            "id": "munich",
            "idea": "After Chamberlain flew to Germany three times, the Munich Agreement of 29–30 September 1938 between Britain, France, Italy and Germany gave Germany the Sudetenland; Czechoslovakia and the Soviet Union were not invited.",
            "core": "At Munich, Britain and France agreed Germany could have it, without Czechoslovakia in the room.",
            "term": "Munich Agreement",
            "gapLabel": "Who decided, and who was left out"
          },
          {
            "id": "march-1939",
            "idea": "In March 1939 Germany occupied the rest of the Czech lands, its first non-German-speaking conquest, and Britain and France then promised to defend Poland.",
            "core": "Months later Hitler took the rest of the Czech lands, breaking his promise.",
            "term": "",
            "gapLabel": "Whether Hitler kept his word"
          }
        ]
      },
      {
        "id": "appeasement-debate",
        "origin": "course",
        "title": "Was appeasement right or wrong",
        "blurb": "The arguments for and against giving way.",
        "about": "the arguments for and against appeasement",
        "firstMessage": "Hi, I'm Milo! I don't know anything about the arguments for and against appeasement. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "appeasement",
          "Sudetenland",
          "Czechoslovakia",
          "Dominions",
          "Munich",
          "Soviet Union"
        ],
        "layout": "comparison",
        "keyIdeas": [
          {
            "id": "time-to-rearm",
            "idea": "In its defence: Britain and France were not ready for war in 1938, and the extra year was used to rearm, above all in air defence.",
            "core": "For: Britain was not ready in 1938 and used the extra year to rearm.",
            "term": "",
            "gapLabel": "What the extra year was good for"
          },
          {
            "id": "public-opinion",
            "idea": "In its defence: public opinion in Britain and the Dominions would not have supported a war over the Sudetenland.",
            "core": "For: people at home would not have backed a war over the Sudetenland.",
            "term": "",
            "gapLabel": "Whether people would back a war"
          },
          {
            "id": "proved-untrustworthy",
            "idea": "In its defence: it showed beyond doubt that Hitler could not be trusted, which united opinion in 1939.",
            "core": "For: it proved Hitler could not be trusted, so people were united in 1939.",
            "term": "",
            "gapLabel": "What it proved about Hitler"
          },
          {
            "id": "bolder",
            "idea": "Against it: each concession made Hitler bolder and convinced him that Britain and France would not fight.",
            "core": "Against: every concession made Hitler bolder.",
            "term": "",
            "gapLabel": "How giving way changed Hitler"
          },
          {
            "id": "czechoslovakia-abandoned",
            "idea": "Against it: Czechoslovakia, a democracy with a strong army and defences, was abandoned, and Germany also gained time, territory and resources.",
            "core": "Against: Czechoslovakia, a strong democratic ally, was abandoned.",
            "term": "",
            "gapLabel": "What was given away"
          },
          {
            "id": "soviet-distrust",
            "idea": "Against it: the Soviet Union, left out at Munich, concluded that it could not rely on Britain and France.",
            "core": "Against: the Soviet Union decided it could not trust Britain and France.",
            "term": "",
            "gapLabel": "What Moscow concluded"
          }
        ]
      },
      {
        "id": "outbreak-of-war-1939",
        "origin": "course",
        "title": "The road to war in 1939",
        "blurb": "The Nazi-Soviet Pact, Poland and the declarations of war.",
        "about": "how the war started in 1939",
        "firstMessage": "Hi, I'm Milo! I don't know anything about how the war started in 1939. Can you explain it to me? I'll draw what you say.",
        "tone": "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
        "keywords": [
          "Nazi–Soviet Pact",
          "non-aggression pact",
          "Stalin",
          "Danzig",
          "Polish Corridor",
          "East Prussia",
          "Poland",
          "two fronts"
        ],
        "layout": "causes",
        "keyIdeas": [
          {
            "id": "guarantee",
            "idea": "After March 1939 Britain and France promised to defend Poland if attacked, but their alliance talks with the Soviet Union dragged on all summer without result.",
            "core": "Britain and France promised to defend Poland if it was attacked.",
            "term": "",
            "gapLabel": "Who promised to protect Poland"
          },
          {
            "id": "pact",
            "idea": "On 23 August 1939 Germany and the Soviet Union signed a non-aggression pact, each promising not to attack the other; it shocked the world because they were bitter enemies.",
            "core": "Germany and the Soviet Union, bitter enemies, agreed not to attack each other. The date is a bonus.",
            "term": "Nazi-Soviet Pact",
            "gapLabel": "What deal shocked the world"
          },
          {
            "id": "secret-part",
            "idea": "A secret part divided Poland and other parts of eastern Europe between them; Hitler avoided a two-front war, Stalin gained time and territory, and Poland was left isolated.",
            "core": "They secretly agreed to split Poland, so Hitler would not have to fight on two fronts.",
            "term": "",
            "gapLabel": "What the deal did for Hitler"
          },
          {
            "id": "invasion",
            "idea": "Hitler demanded Danzig and a route across the Polish Corridor to East Prussia; Poland refused, and on 1 September 1939 Germany invaded.",
            "core": "Germany invaded Poland on 1 September 1939. Danzig and the Corridor are a bonus.",
            "term": "invasion of Poland",
            "gapLabel": "How the fighting began"
          },
          {
            "id": "declarations",
            "idea": "Britain and France demanded German withdrawal, got no reply, and on 3 September 1939 Britain declared war at 11:00, France that afternoon.",
            "core": "Britain and France declared war on Germany two days later.",
            "term": "",
            "gapLabel": "How Britain and France answered"
          }
        ]
      }
    ],
    "skipped": [
      "Course notices: the essay deadline, rooms and reading week",
      "The reading list and office hours",
      "The timeline and summary slides, which repeat the rest"
    ],
    "outline": [
      {
        "heading": "The question",
        "facts": [
          "First World War ended November 1918; second war began September 1939.",
          "Long-term cause: the 1919 peace settlement and resentment.",
          "Turning point: Great Depression destroyed German democracy, brought Hitler to power.",
          "Failure to stop aggression: League could not, Britain and France chose not to.",
          "Short-term triggers: Nazi–Soviet Pact and invasion of Poland."
        ]
      },
      {
        "heading": "Timeline 1919 to 1939",
        "facts": [
          "1919 Versailles; 1929 Wall Street Crash; 1931 Japan occupies Manchuria.",
          "1933 Hitler Chancellor; 1935 rearmament announced, Italy invades Abyssinia.",
          "1936 Rhineland; 1938 Austria annexed, Munich Agreement.",
          "1939 Nazi–Soviet Pact, invasion of Poland, war.",
          "Periods: 1919–29 uneasy peace; Depression; 1933–39 treaty broken."
        ]
      },
      {
        "heading": "Treaty of Versailles terms",
        "facts": [
          "Signed 28 June 1919; Germany excluded from negotiations.",
          "Article 231 war guilt clause.",
          "Reparations fixed 1921 at 132 billion gold marks (about £6.6 billion).",
          "Lost 13% of European territory, a tenth of population, all colonies.",
          "Army 100,000 volunteers; no conscription, tanks, air force, submarines."
        ]
      },
      {
        "heading": "Land lost by Germany",
        "facts": [
          "Alsace-Lorraine to France; Eupen-Malmedy to Belgium.",
          "Saar run by League 15 years, coal to France.",
          "North Schleswig to Denmark after 1920 vote.",
          "West Prussia and Posen to Poland: the Polish Corridor.",
          "Danzig a free city under the League."
        ]
      },
      {
        "heading": "German resentment",
        "facts": [
          "Treaty called a Diktat: dictated peace.",
          "War guilt felt as national humiliation.",
          "Reparations blamed for hardship, especially 1923 hyperinflation.",
          "Millions of German speakers outside borders; army left Germany feeling defenceless.",
          "Every government wanted revision; extreme right promised to tear it up."
        ]
      },
      {
        "heading": "Great Depression from 1929",
        "facts": [
          "Wall Street Crash October 1929.",
          "American loans to Germany called in.",
          "Firms closed, banks failed; world trade more than halved 1929–1933.",
          "German unemployment 1.4 million (1928) to about 6 million early 1932.",
          "Spending and benefit cuts deepened hardship; faith in democracy lost."
        ]
      },
      {
        "heading": "Unemployment and the vote",
        "facts": [
          "1928: 1.4 million unemployed, Nazis 2.6%.",
          "1930: 3.1 million, Nazis 18.3%.",
          "1932: 5.6 million average, Nazis 37.3% July, largest party.",
          "Communists rose from about 11% to 17% by November 1932."
        ]
      },
      {
        "heading": "Hitler takes power 1933",
        "facts": [
          "Appointed Chancellor 30 January 1933.",
          "Enabling Act March 1933: one-party dictatorship.",
          "October 1933 left League and disarmament conference.",
          "Aims: overturn Versailles, unite German speakers, living space in the east."
        ]
      },
      {
        "heading": "Breaking the treaty step by step",
        "facts": [
          "1933–35 secret rearmament; March 1935 conscription and air force announced.",
          "June 1935 Anglo-German naval agreement.",
          "March 1936 Rhineland; March 1938 Anschluss: protests only.",
          "September 1938 Sudetenland demanded; agreed at Munich.",
          "March 1939 rest of Czech lands; Britain and France guarantee Poland."
        ]
      },
      {
        "heading": "Rhineland 1936",
        "facts": [
          "Germany had freely confirmed demilitarisation at Locarno 1925.",
          "7 March 1936 small force sent, ordered to retreat if resisted.",
          "France had caretaker government, would not act without Britain.",
          "Britain felt Germany was moving into its own territory; League busy with Abyssinia.",
          "Result: Hitler more confident, western border fortified, France's eastern allies doubtful."
        ]
      },
      {
        "heading": "Anschluss 1938",
        "facts": [
          "Union forbidden by peace treaties.",
          "Pressure to give Austrian Nazis power; Austrian Chancellor's vote cancelled on Hitler's demand.",
          "12 March 1938 troops crossed unopposed; absorbed next day.",
          "April vote under Nazi control reported 99%.",
          "Czechoslovakia surrounded on three sides."
        ]
      },
      {
        "heading": "League of Nations",
        "facts": [
          "Set up 1920; collective security.",
          "US never joined; Germany and USSR left out at first.",
          "No armed forces; relied on condemnation and economic sanctions.",
          "Unanimous decisions made action slow.",
          "Depended on Britain and France, who put own interests first."
        ]
      },
      {
        "heading": "Manchuria 1931",
        "facts": [
          "Japan occupied Manchuria after staging railway explosion, September 1931.",
          "Inquiry report took a year.",
          "League condemned Japan February 1933.",
          "Japan left League, kept Manchuria; no sanctions."
        ]
      },
      {
        "heading": "Abyssinia 1935",
        "facts": [
          "Italy invaded Abyssinia, a League member, October 1935.",
          "Sanctions excluded oil; Suez Canal kept open.",
          "Secret British-French plan to give Italy land leaked and dropped.",
          "Conquest complete May 1936; sanctions lifted July.",
          "Lesson: League would not stop a determined great power."
        ]
      },
      {
        "heading": "Appeasement",
        "facts": [
          "Avoiding war by negotiating and accepting some German demands.",
          "Linked with Neville Chamberlain, PM 1937–1940; France followed.",
          "Reasons: WWI memories, Versailles too harsh, Depression, fear of communism, no US support."
        ]
      },
      {
        "heading": "Munich and the Sudetenland",
        "facts": [
          "About 3 million German speakers; held Czech frontier defences.",
          "Chamberlain flew to Germany three times, September 1938.",
          "Munich Agreement 29–30 September 1938: Britain, France, Italy, Germany.",
          "Czechoslovakia and USSR not invited.",
          "\"Peace for our time\"; Hitler's 'last territorial demand'."
        ]
      },
      {
        "heading": "Appeasement arguments",
        "facts": [
          "For: extra year to rearm, especially air defence.",
          "For: public and Dominions would not back war; proved Hitler untrustworthy.",
          "Against: concessions made Hitler bolder.",
          "Against: Czechoslovakia abandoned; Germany gained territory and resources.",
          "Against: USSR concluded it could not rely on Britain and France."
        ]
      },
      {
        "heading": "Nazi–Soviet Pact",
        "facts": [
          "Britain–France–USSR alliance talks failed in summer 1939.",
          "23 August 1939 non-aggression pact.",
          "Secret part divided Poland and eastern Europe.",
          "Hitler avoided two-front war; Stalin gained time and territory.",
          "Shocked world; left Poland isolated."
        ]
      },
      {
        "heading": "Invasion of Poland and war",
        "facts": [
          "Hitler demanded Danzig and route across Polish Corridor; Poland refused.",
          "Germany invaded 1 September 1939.",
          "Britain declared war 3 September at 11:00; France that afternoon.",
          "Soviet Union invaded from the east 17 September.",
          "Became a world war over the next two years."
        ]
      },
      {
        "heading": "How the causes fit together",
        "facts": [
          "Long-term 1919–29: Versailles resentment, disputed borders.",
          "Turning point 1929–33: Depression, Hitler in power.",
          "1931–38: League fails, appeasement.",
          "1939 triggers: Nazi–Soviet Pact, invasion of Poland."
        ]
      }
    ]
  }
];

/** Checked against the course shape like any stored course. One that no longer fits is left out. */
export const SAMPLE_COURSES: Course[] = RAW.flatMap((entry) => {
  const parsed = CourseSchema.safeParse(entry);
  return parsed.success ? [parsed.data] : [];
});
