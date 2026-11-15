/* Chapter 1 lessons as data. Every quote, meaning and pop-up comes from Gurudev's text
   (Knowledge Base/chapter1_quote_bank.md). [[key]] or [[key|label]] makes a pop-up from the lesson's tips. */
(()=>{const U=YS.U;
const sun='<rect width="320" height="180" fill="#ffe3bd"/>'+U('sun',250,6,62,62);
const grass=y=>'<rect x="0" y="'+y+'" width="320" height="'+(180-y)+'" fill="#8cc2b2"/><rect x="0" y="'+y+'" width="320" height="3" fill="#a8d8c9"/>';
const lake=y=>'<rect x="0" y="'+y+'" width="320" height="'+(180-y)+'" fill="#0f5c5e"/><rect x="0" y="'+y+'" width="320" height="3" fill="#5fa9a3"/>';
const S1='Atha yoganushashanam. Gurudev: “Now, we will look into the discipline of Yoga.”';

window.LESSONS=[
/* ================= Lesson 2 · Atha ================= */
{id:'atha',num:2,module:1,title:'Catch the Now',topic:'Atha',sutra:'1.1',
 tips:{sutra:S1,Atha:'Gurudev: “Patanjali yoga sutras begins. Atha yoganushashanam. Now, we will look into the discipline of Yoga.”'},
 cards:[
  {type:'choice',scene:'custom',svg:sun+grass(150)+'<rect x="128" y="40" width="150" height="80" rx="10" fill="#e9c98e" stroke="#b8691a" stroke-width="2"/><text x="203" y="96" text-anchor="middle" font-family="Tiro Devanagari Sanskrit" font-size="46" fill="#7a3a12">अथ</text>'+U('seeker',40,40,72,112)+U('lotus',250,118,46,32),
   title:'When is the right time to start Yoga?',options:[{t:'When life is calm and sorted',icon:'sun'},{t:'When I have more free time',icon:'q'},{t:'Right now',icon:'lotus'}],
   quote:'Now, when now? When things are not clear. When your heart is not in the right place.',source:'explaining Patanjali’s first word, [[Atha]]',after:'Patanjali opens the Yoga Sutras with this word: Now.'},
  {type:'flips',scene:'lake',title:'Now is not a dot',lead:'Tap each one to see [[Gurudev]]’s words.',
   tiles:[{f:'Say “now!”',icon:'q',b:'“The moment you have said now, then again you have lost the now.”'},{f:'Not a dot',icon:'eye',b:'“It’s not just a point, just a dot. It’s infinity.”'},{f:'Deep and vast',icon:'lotus',b:'“The now is not just linear, the now is very deep & vast.”'}],
   payoff:{q:'Practice is the stability in that moment.',note:'[[Gurudev]], on Sutra 1.14'}},
  {type:'tap',scene:'lake',title:'Is this thought about now?',lead:'Read it and decide.',statement:'“My feet are on the floor.”',button:'Yes, that’s now!',
   after:'In the game, thoughts rise through the lake. Tap only the thoughts about this very moment.',note:'Up to 50 [[Prana]].'}
 ],
 steps:[
  {type:'catch',title:'Catch the Now',lead:'Tap only the thoughts about this moment. Let thoughts of the past and future float away.',points:30,
   intro:'Thoughts will rise through the lake. <b>Tap only the thoughts about this very moment.</b>',meter:'Lake stillness',target:'now',labels:{now:'Now',past:'Past',future:'Future'},take:{now:7,past:4,future:4},
   pools:{now:['The breath flowing out','My feet on the floor','A bird singing right now','The warm cup in my hands','My heartbeat','Cool air on my skin','My hands resting','The sounds in this room','My belly rising and falling','The light on this screen'],
    past:['That argument last week','I should have said something else','Remember that holiday?','Why did I eat so much yesterday?','My old school days','That email I sent this morning'],
    future:['What if I fail the exam?','What’s for dinner tonight?','Next week’s big meeting','I’ll be happy once I get that job','Must reply to that message later','What will they think of me?']},
   why:['[[Gurudev]]: “This effort to be established steadily in the now… Practice is the stability in that moment.”']},
  {type:'hold',title:'Arrive in the Now',lead:'[[Gurudev]]’s own practice. Press and hold the lotus, and follow each line.',points:20,seconds:32,settle:5,art:'lotusArt',
   prompts:['Become aware of the pair of eyes that are looking.','Become aware of the mind that through those eyes is looking.','Close your eyes. Become aware of your whole body, your heart.','The very center core of your existence. Rest & relax there.'],
   settleText:'Rest & relax there.',after:'Open your eyes slowly.',
   why:['[[Gurudev]]: “Retrieve your mind from all the five senses to the core of your heart or your existence.”']}
 ],
 badge:{name:'Now-Keeper',text:'You caught the now and rested in it.',miss:'Score 70% or more to earn it.',need:.7},
 endLines:['[[Gurudev]]: “It’s infinity. It’s all-dimensional, from all sides, directions, that is now.”']},

/* ================= Lesson 3 · Anushasana ================= */
{id:'anushasana',num:3,module:1,title:'Whose Rule Is It?',topic:'Anushasana vs Shasana',sutra:'1.1',
 tips:{sutra:S1,Shasana:'Gurudev: “Shashana is the rules & regulations that the king or society imposes on you.”',Anushasana:'Gurudev: “Anushashana is the rule that you make on yourself, impose on your Self.”'},
 cards:[
  {type:'choice',scene:'custom',svg:sun+grass(150)+'<rect x="22" y="70" width="78" height="80" fill="#e7b46a"/><path d="M22 70 L61 42 L100 70Z" fill="#7d2e49"/>'+U('king',104,48,62,102)+U('seeker',214,40,74,112),
   title:'Who made the rules you follow every day?',options:[{t:'Mostly other people',icon:'crown'},{t:'Mostly me',icon:'lotus'},{t:'A mix of both',icon:'q'}],
   quote:'Shashana is the rules & regulations that the king or society imposes on you. Anushashana is the rule that you make on yourself.',source:'on [[sutra|Sutra 1.1]]'},
  {type:'flips',scene:'custom',svg:sun+grass(150)+U('mother',30,52,62,100)+U('kid',86,78,50,80)+U('seeker',210,36,76,116),title:'The toothbrush that became yours',lead:'Tap both to compare.',
   tiles:[{f:'As a child',icon:'crown',h:'Mother’s rule',b:'“May be when you were a kid, mother had to impose it on you.”'},{f:'Grown up',icon:'lotus',h:'Your rule',b:'“Once it became a habit & when you understood it is good for you & then it is no more mothers’ rule. It’s now your rule.”'}],
   payoff:{q:'Keeping yourself clean, hygiene, exercising, meditating, being kind, considerate, not being rude, all these rules you have imposed on yourself are disciplines.'}},
  {type:'pick',scene:'lake',title:'Where is discipline needed?',lead:'Pick [[Gurudev]]’s answer.',options:[['For drinking water when you are thirsty',0],['Where something is not very charming to begin with, but its fruit is very good',1]],
   quote:'Discipline arises where something is not very charming to begin with.',note:'[[Gurudev]]: “Discipline for sattvic happiness.” Next: sort 5 rules.'}
 ],
 steps:[
  {type:'sort',title:'Sort the rules',lead:'Swipe each card: [[Shasana]] (from outside) or [[Anushasana]] (your own).',points:30,count:5,
   bins:[{t:'Shasana',sub:'a rule put on you from outside',icon:'crown'},{t:'Anushasana',sub:'a rule you place on yourself',icon:'lotus'}],
   cards:[
    {who:'king',label:'The King',t:'The King orders every shop to close at sunset.',bin:0,why:['The King imposes it. It comes from outside.']},
    {who:'king',label:'The King',t:'A new law says everyone must pay tax by the full moon.',bin:0,why:['A rule from the ruler, followed because you must.']},
    {who:'mother',label:'Mother',t:'Age 5: Mother insists the Seeker brushes before bed.',bin:0,why:['[[Gurudev]]: “When you were a kid, mother had to impose it on you.”']},
    {who:'king',label:'The school',t:'The school says every student must wear the uniform on Mondays.',bin:0,why:['Society imposes it, from outside.']},
    {who:'seeker',label:'The Seeker',t:'Grown up: the Seeker brushes every night without any reminder.',bin:1,why:['[[Gurudev]]: “It is no more mothers’ rule. It’s now your rule.”']},
    {who:'seeker',label:'The Seeker',t:'The Seeker wakes early to meditate, though nobody asked.',bin:1,why:['Meditating is on [[Gurudev]]’s list of rules you impose on yourself.']},
    {who:'seeker',label:'The Seeker',t:'Irritated, the Seeker still chooses not to be rude.',bin:1,why:['[[Gurudev]]: being kind, considerate, not being rude are disciplines you impose on yourself.']},
    {who:'seeker',label:'The Seeker',t:'Practice feels dull today, but the Seeker sits anyway.',bin:1,why:['[[Gurudev]]: “To bear that is uncomfortable is discipline.”']}
   ]}
 ],
 badge:{name:'Self-Ruler',text:'You can tell a rule from outside apart from a rule you chose.',miss:'Sort 4 of 5 correctly to earn it.',need:.8},
 endLines:['[[Gurudev]]: “So it is nobodys imposition, it is self-imposed.”']},

/* ================= Module 1 boss · The Lake Guardian ================= */
{id:'guardian',num:'B1',module:1,title:'The Lake Guardian',topic:'Module 1 boss',sutra:'1.1–1.4',stepWord:'Challenge',
 mode:{boss:{lives:3,label:'Mist on the lake'}},resultScene:'mist',doneLabel:'The mist has cleared',lostLabel:'The mist remains',scoreLabel:'challenges cleared without a slip',
 tips:{sutra:'Sutras 1.1 to 1.4: Atha yoganushashanam · Yogah chitta vritti nirodhah · Tada drushte swarupe awasthanam · Vritti saarupya mitaratya.'},
 cards:[
  {type:'choice',scene:'mist',title:'Ready to face the Lake Guardian?',options:[{t:'I remember the lessons well',icon:'lotus'},{t:'A little nervous',icon:'q'},{t:'Let’s go!',icon:'sun'}],
   quote:'Yoga is making you whole.',source:'on Sutras 1.1–1.4',after:'A wise old tortoise guards the lake. Six right answers clear the mist.'},
  {type:'flips',scene:'mist',title:'What the Guardian will ask about',tiles:[
    {f:'Atha',icon:'sun',b:'“Now, we will look into the discipline of Yoga.”'},{f:'Anushasana',icon:'lotus',b:'“The rule that you make on yourself.”'},{f:'Chitta',icon:'eye',b:'“You call mind or consciousness or chitta – it’s all the same.”'},
    {f:'The Seer',icon:'heart',b:'“In the form of the Seer, abiding there is Yoga.”'},{f:'Vritti',icon:'q',b:'“Your consciousness assumes the form of that movie of that vritti.”'}],
   payoff:{q:'Whole purpose of Yoga is to be onto oneself, to bring integrity in you, to make you a whole.'}},
  {type:'tap',scene:'mist',title:'How the challenge works',lead:'Read the rules.',statement:'Three lotuses. Six challenges. A challenge with a slip costs one lotus.',button:'I’m ready',after:'Each challenge answered without a slip earns 20 [[Prana]].'}
 ],
 steps:[
  {type:'choose',visual:'card',title:'Atha',lead:'“First, Seeker: when does Yoga begin?”',items:[{text:'Patanjali opens with Atha, “Now”. Explaining it, [[Gurudev]] asks: “now, when now?” What is his answer?',a:'b',
   options:[{k:'a',t:'Once life is calm and sorted'},{k:'b',t:'When things are not clear. When your heart is not in the right place.'},{k:'c',t:'After many years of study'}],
   why:['[[Gurudev]]: “That is why Patanjali begins. He says – now, when now? When things are not clear. When your heart is not in the right place.”']}]},
  {type:'sort',title:'Anushasana',lead:'“Whose rule is it? Sort these three.”',count:3,bins:[{t:'Shasana',sub:'from outside',icon:'crown'},{t:'Anushasana',sub:'your own',icon:'lotus'}],
   cards:[{who:'king',label:'The King',t:'The King orders every shop to close at sunset.',bin:0,why:['Imposed by the king, from outside.']},{who:'seeker',label:'The Seeker',t:'Grown up: the Seeker brushes every night without any reminder.',bin:1,why:['“It’s now your rule.”']},{who:'seeker',label:'The Seeker',t:'Practice feels dull today, but the Seeker sits anyway.',bin:1,why:['“To bear that is uncomfortable is discipline.”']}]},
  {type:'order',title:'Sutra 1.2',lead:'“Rebuild my favourite sutra.”',q:'Tap the four words in order.',words:[{d:'योगः',r:'yogah'},{d:'चित्त',r:'chitta'},{d:'वृत्ति',r:'vritti'},{d:'निरोधः',r:'nirodhah'}],why:['Yogah chitta vritti nirodhah.']},
  {type:'match',title:'The key words',lead:'“Now tell me what each word means.” Every meaning is in [[Gurudev]]’s words.',
   pairs:[['Yoga','“Yoga is making you whole.”'],['Chitta','“You call mind or consciousness or chitta – it’s all the same.”'],['Vritti','“Pramana - 1st Activity of the mind.” A vritti is an activity of the mind.'],['Nirodha','“The activities are subdued, subduing these activities.”']],
   why:['All four are from [[Gurudev]]’s commentary.']},
  {type:'choose',visual:'card',title:'The Seer',lead:'“When the lake is still, who is there?”',items:[{text:'[[Gurudev]] says that whenever you experience joy, ecstasy, bliss, happiness in life, knowingly or unknowingly you are…',a:'b',
   options:[{k:'a',t:'Lost in the senses'},{k:'b',t:'Abiding in the form of the Seer'},{k:'c',t:'Asleep'}],
   why:['[[Gurudev]]: “Whenever you experience joy, ecstasy, bliss, happiness in life, knowingly or unknowingly you are abiding in the form of the Seer.”']}]},
  {type:'choose',visual:'card',title:'Vritti saarupya',lead:'“Last one. Think of the drama in India.”',items:[{text:'Watching a drama, a gentleman was so mad at the villain that he threw his slippers at him. What happened to his consciousness?',a:'c',
   options:[{k:'a',t:'It rested in the Seer'},{k:'b',t:'It practised Anushasana'},{k:'c',t:'It assumed the form of the drama'}],
   why:['[[Gurudev]]: “Your consciousness assumes the form of that movie of that vritti.”','“That Villain really took that slipper as a sign of honor.”']}]}
 ],
 badge:{name:'Guardian’s Friend',text:'The mist has cleared and the Lakeshore is open.',miss:'Review the lessons and face the Guardian again.',need:0},
 endLines:['[[Gurudev]]: “Yoga is making you whole.”']},

/* ================= Lesson 10 · Viparyaya ================= */
{id:'viparyaya',num:10,module:2,title:'Spot the Soup',topic:'Viparyaya',sutra:'1.8',
 tips:{sutra:'Viparyayo mithyagyanamatadupratistham.',Viparyaya:'Gurudev: “You will think things the way they are not.”'},
 cards:[
  {type:'choice',scene:'custom',svg:sun+grass(150)+U('seeker',40,34,74,116)+U('friend',204,36,72,114),title:'Has someone ever seemed rude to you for no reason?',options:[{t:'Yes, often',icon:'q'},{t:'Sometimes',icon:'eye'},{t:'Not really',icon:'lotus'}],
   quote:'Most of the time you impose your own views & ideas & feelings on others and you think that is how they are.',source:'on [[sutra|Sutra 1.8]]',after:'[[Gurudev]]: “This activity of mind is called viparyaya.”'},
  {type:'flips',scene:'meadow',title:'Three examples from [[Gurudev]]',tiles:[
    {f:'Arrogant?',icon:'crown',b:'“You have an inferiority complex and you suddenly see someone else behavior very arrogant.”'},
    {f:'Their own soup',icon:'q',b:'“They are cooking in their own mind, their own soup.”'},
    {f:'Not loved?',icon:'heart',b:'“Their children suddenly feel that the parents don’t love them.”'}],
   payoff:{q:'All Logic fails, what stands is the wrong knowledge.'}},
  {type:'tap',scene:'meadow',title:'Spot the soup',lead:'One part of this thought is a fact. One part is soup.',statement:'“She walked past without smiling. She must think she is better than me.”',button:'The second part is soup!',
   after:'In the game, find the thought that is soup, not fact.',note:'Up to 30 [[Prana]].'}
 ],
 steps:[
  {type:'choose',visual:'scene',retry:true,showLabels:true,title:'Which thought is soup?',lead:'Read what happened. Tap the thought that is soup, not fact.',points:30,rightTitle:'Spotted!',okTitle:'Spotted',
   hint:'This thought adds no feeling of its own. Try another.',
   items:[
    {svg:U('seeker',40,38,70,110)+U('friend',210,40,68,108),text:'A colleague walks past the Seeker without smiling.',a:'soup',options:[{k:'fact',t:'She walked past without smiling.',lab:'What happened'},{k:'soup',t:'She is so arrogant. She thinks she is better than me.',lab:'Soup'},{k:'maybe',t:'Maybe she is in a hurry today.',lab:'An open possibility'}],why:['[[Gurudev]]: “You have an inferiority complex and you suddenly see someone else behavior very arrogant. They are not arrogant.”']},
    {svg:U('seeker',30,38,70,110)+U('friend',130,44,62,102)+U('friend',220,44,62,102),text:'At a meeting, the team picks another plan instead of the Seeker’s idea.',a:'soup',options:[{k:'fact',t:'My idea was not chosen this time.',lab:'What happened'},{k:'soup',t:'Nobody here respects me.',lab:'Soup'},{k:'maybe',t:'I can share it again next time.',lab:'An open possibility'}],why:['[[Gurudev]]: “You have not been respected because you don’t respect yourself, and you think other don’t respect you.”']},
    {svg:U('mother',40,36,70,112)+U('kid',150,58,56,92),text:'Mother asks the child to finish homework before playing games.',a:'soup',options:[{k:'fact',t:'Mother wants homework done first.',lab:'What happened'},{k:'soup',t:'Mother doesn’t love me.',lab:'Soup'},{k:'maybe',t:'I can play once it is done.',lab:'An open possibility'}],why:['[[Gurudev]]: “Their children suddenly feel that the parents don’t love them.”']},
    {svg:U('seeker',40,38,70,110)+'<g transform="translate(150 36)"><rect width="70" height="104" rx="10" fill="#1d2b2b"/><rect x="6" y="10" width="58" height="80" rx="4" fill="#e3f1ef"/><rect x="12" y="20" width="40" height="14" rx="7" fill="#f2a33a"/></g>'+U('friend',240,52,56,92),text:'The Seeker sent a friend a message two hours ago. No reply yet.',a:'soup',options:[{k:'fact',t:'There is no reply yet.',lab:'What happened'},{k:'soup',t:'He is ignoring me. He doesn’t care about me.',lab:'Soup'},{k:'maybe',t:'He may be busy right now.',lab:'An open possibility'}],why:['[[Gurudev]]: “You will think things the way they are not.”']},
    {svg:U('mother',70,36,70,112)+U('kid',150,58,56,92)+'<text x="250" y="70" text-anchor="middle" font-family="Mukta" font-weight="700" font-size="13" fill="#b23f66">“I love you”</text>',text:'Mother hugs the child and says, “I love you.”',a:'soup',options:[{k:'fact',t:'Mother gave me a hug.',lab:'What happened'},{k:'soup',t:'She is only saying that. She doesn’t really love me.',lab:'Soup'},{k:'maybe',t:'That felt nice.',lab:'An open possibility'}],why:['[[Gurudev]]: “Proof does not stand once Viparyaya comes.”']}
   ]}
 ],
 badge:{name:'Soup Spotter',text:'You can tell what happened from what the mind cooked up.',miss:'Spot 4 of 5 on the first try to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Not because they are bad or anything just because of the activity of the chita, of mind is coming up.”']},

/* ================= Lesson 11 · Vikalpa ================= */
{id:'vikalpa',num:11,module:2,title:'Cloud Breaker',topic:'Vikalpa',sutra:'1.9',
 tips:{sutra:'Vikalpa: the third modulation of chitta. Gurudev: “Fantasies are vikalpas.”',Pramana:'Gurudev: “Pramana - 1st Activity of the mind. Your mind is engaged in wanting a proof.”',Smriti:'Gurudev: “Remembering the past experiences i.e smruti.”'},
 cards:[
  {type:'choice',scene:'custom',svg:sun+lake(124)+U('lotus',20,132,96,44)+U('seeker',34,36,68,106)+'<g transform="translate(140 40)"><rect width="150" height="34" rx="17" fill="#fff"/><text x="75" y="22" text-anchor="middle" font-family="Mukta" font-weight="700" font-size="12" fill="#1d2b2b">gold… helicopter… 16 again…</text></g>',
   title:'Do you ever daydream about a different life?',options:[{t:'Yes, often',icon:'q'},{t:'Sometimes',icon:'eye'},{t:'Never',icon:'lotus'}],
   quote:'Nothing of that sort exists. Just mere words hover in the mind.',source:'on [[sutra|Sutra 1.9]]',after:'[[Gurudev]]: “Fantasies are vikalpas.”'},
  {type:'flips',scene:'lake',title:'Two kinds of Vikalpa',lead:'Tap both.',tiles:[
    {f:'Pleasant',icon:'sun',b:'“If I were 16 again… I’ll get a big haul of gold… then I’ll have my own helicopter to fly.”'},
    {f:'Fearful',icon:'moon',b:'“What will happen if I die tomorrow? An accident may happen to me.”'}],
   payoff:{q:'Even fear is a Vikalpa.'}},
  {type:'pick',scene:'lake',title:'Which one is a Vikalpa?',options:[['“I’m cold. I can feel it.”',0],['“If I were 16 again, I’d find a big haul of gold.”',1]],
   quote:'Not only children who fantasize but adults also get into their own fantasies.',note:'Next: 5 thought clouds to break. Up to 30 [[Prana]].'}
 ],
 steps:[
  {type:'choose',visual:'cloud',title:'Break the clouds',lead:'Answer each question. A right answer breaks the cloud into loose words.',points:30,rightTitle:'Cloud broken!',
   items:[
    {who:'Gurudev on Vikalpa',text:'“Just mere words hover in the mind.”',q:'What does [[Gurudev]] call Vikalpa?',a:'a',options:[{k:'a',t:'Fantasies'},{k:'b',t:'Wanting proof of everything'},{k:'c',t:'Remembering past experiences'}],why:['[[Gurudev]]: “Fantasies are vikalpas.”']},
    {who:'A thought at age 55',text:'If I were 16 again, I’d find a big haul of gold and fly my own helicopter!',q:'Which kind of Vikalpa is this?',a:'a',options:[{k:'a',t:'A joyful, pleasurable fantasy'},{k:'b',t:'A baseless fear'}],why:['This is [[Gurudev]]’s own example.','“Vikalpa can be of two types. One could be just joyful, pleasurable fantasies.”']},
    {who:'A thought at night',fear:true,text:'What will happen if I die tomorrow? An accident may happen to me.',q:'Which kind of Vikalpa is this?',a:'b',options:[{k:'a',t:'A joyful, pleasurable fantasy'},{k:'b',t:'A baseless fear'}],why:['[[Gurudev]]: “Even fear is a Vikalpa.”','“These are all just simply sounds that has no value.”']},
    {who:'A winter morning',text:'I’m cold. Nobody needs to tell me.',q:'Which activity of the mind is this?',a:'a',options:[{k:'a',t:'[[Pramana]]'},{k:'b',t:'Vikalpa'},{k:'c',t:'[[Smriti]]'}],why:['[[Gurudev]]: “Are you cold? Yes, I am. There is nobody need to tell me. This is Pratyaksha.”']},
    {who:'A daydream at work',text:'One day I’ll win the lottery and buy my own island.',q:'Which activity of the mind is this?',a:'b',options:[{k:'a',t:'[[Pramana]]'},{k:'b',t:'Vikalpa'},{k:'c',t:'[[Smriti]]'}],why:['There is no lottery win and no island. Only the words exist.','[[Gurudev]]: “Fantasies are vikalpas.”']}
   ]}
 ],
 badge:{name:'Cloud Breaker',text:'You can see a fantasy for what it is: mere words.',miss:'Get 4 of 5 right to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Baseless fears in the mind or fantasies are called Vikalpa.”']},

/* ================= Lesson 16 · Three conditions ================= */
{id:'firm',num:16,module:3,title:'Firm Roots',topic:'Three conditions for firm practice',sutra:'1.14',beginLabel:'Start the 10 days',
 tips:{sutra:'Sa tu dirghkaal nairantarya satkarsevito drudbhoomi. Gurudev: “It takes long time (dirghkaal), without a Gap (nairantarya), with Honour & with Respect (satkarsevito) receiving it & practicing it then it becomes firmly established (drudbhoomi).”',
  abhyasa:'Gurudev: “This effort to be steady, the effort to be still is practice.” “Abhyasa is something done with gratitude, gratefulness, honor, respect.”',drudbhoomi:'Gurudev: “then it becomes firmly established (drudbhoomi).”'},
 cards:[
  {type:'choice',scene:'meadow',title:'What took you a long time to learn?',options:[{t:'A musical instrument',icon:'music',after:'[[Gurudev]]: “You cannot say in one day you learn the flute.”'},{t:'A sport or exercise',icon:'sun',after:'[[Gurudev]]: “Bodybuilding doesn’t happen overnight. Muscles won’t grow.”'},{t:'Cooking',icon:'heart',after:'[[Gurudev]]: “To master an art, whether its cooking or playing a guitar… it takes some time.”'},{t:'Something else',icon:'q',after:'[[Gurudev]]: “Body has its own requirement of time for its growth. Similarly mind needs more time for its growth.”'}],
   quote:'Anything in life that is of some value takes some time to culture.',source:'on [[sutra|Sutra 1.14]]'},
  {type:'flips',scene:'lake',title:'Three conditions for firm practice',tiles:[
    {f:'Long time',icon:'sun',h:'Dirghkaal',b:'“It need not be too long time, but sufficiently long time.”'},
    {f:'No gap',icon:'drop',h:'Nairantarya',b:'“Without a gap, constant reminder, constant practice is essential.”'},
    {f:'With honor',icon:'heart',h:'Satkarsevito',b:'“Not with grumbling… [[abhyasa|Abhyasa]] is something done with gratitude, gratefulness, honor, respect.”'}],
   payoff:{q:'…then it becomes firmly established ([[drudbhoomi]]).'}},
  {type:'pick',scene:'lake',title:'What is honor?',lead:'[[Gurudev]] asks this himself. Pick his answer.',options:[['Doing it perfectly, without mistakes',0],['Total attentiveness to the present moment, with a tinch of gratefulness',1],['Doing it because you must',0]],
   quote:'Honor is total attentiveness to the present moment, with a tinch of gratefulness.',note:'Next: ten days by the lotus pond.'}
 ],
 steps:[
  {type:'days',title:'Ten days by the pond',lead:'Each day, choose how the Seeker practises. The lotus roots grow only with all three conditions.',points:30,
   days:[
    {s:'Day 1. Your first morning of practice.',o:[['h','Sit with full attention, grateful to be here.'],['g','Sit, but keep checking messages.'],['x','Start tomorrow instead.']]},
    {s:'Day 2. You feel a little lazy this morning.',o:[['h','Sit anyway, with full attention.'],['x','Skip it. I don’t feel like it today.'],['g','Sit, sighing: “Oh! I have to meditate.”']]},
    {s:'Day 3. Friends invite you out at practice time.',o:[['h','Practise first, with full attention, then join them.'],['x','Go out. I’ll practise next week.'],['g','Rush through it, thinking about the outing.']]},
    {s:'Day 4. It feels ordinary now. The first day felt wonderful.',o:[['g','Just sit and close your eyes, out of habit.'],['h','Sit with all honor, as on the first day.'],['x','Take a break until it feels special again.']]},
    {s:'Day 5. You are travelling today.',o:[['x','Skip it, and do double tomorrow.'],['h','A short practice in the hotel, with full attention.'],['g','Practise in the taxi while half-listening to calls.']]},
    {s:'Day 6. Yesterday’s practice felt low, not charming.',o:[['h','Bring back your attentiveness and gratitude.'],['x','Give it up. It isn’t working.'],['g','Do it while complaining that it’s boring.']]},
    {s:'Day 7. A very busy work day.',o:[['g','Sit, planning your to-do list.'],['x','Skip it. Too busy today.'],['h','Sit for your usual time, attentive and grateful.']]},
    {s:'Day 8. You are feeling great today.',o:[['x','Skip it. I already feel great.'],['h','Practise with all your heart.'],['g','Practise quickly, to get it over with.']]},
    {s:'Day 9. A course: practising together with others.',o:[['h','Join in, receiving the knowledge with honor.'],['g','Attend, but keep watching the clock.'],['x','Skip it. I’ll do it alone someday.']]},
    {s:'Day 10. The tenth morning.',o:[['x','Ten days is enough. I’m done.'],['g','Sit, but my mind is elsewhere.'],['h','Sit with full attention and gratitude.']]}],
   effects:{h:{v:'Roots grow deeper',l:['[[Gurudev]]: “Abhyasa is something done with gratitude, gratefulness, honor, respect.”']},
    g:{v:'Barely any growth',l:['[[Gurudev]]: “Not with grumbling, gaping doing something. Unenthusiastically, that is of no use, that is not abhyasa.”']},
    x:{v:'The connection is broken',l:['[[Gurudev]]: “If we feel like doing, we do, if we don’t feel like doing, a little lazy, we don’t do it. Then that connection is broken.”']}}},
  {type:'choose',visual:'card',title:'After ten days',lead:'One last question.',points:10,items:[{text:'Is the practice firmly established now?',a:'b',options:[{k:'a',t:'Yes. Ten days, and it is done forever.'},{k:'b',t:'Not yet. It takes a sufficiently long time, without a gap, with honor.'},{k:'c',t:'Practice doesn’t really matter.'}],why:['[[Gurudev]]: “Anything in life that is of some value takes some time to culture.”']}]}
 ],
 badge:{name:'Firm Ground',text:'You explored what helps practice take root.',miss:'Average 80% or more across the ten-day practice and final question to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Respect & honor every moment.”']},

/* ================= Lesson 22 · The five supports ================= */
{id:'five',num:22,module:4,title:'Five Gems',topic:'The five supports',sutra:'1.20',stepWord:'Gem',beginLabel:'Collect the gems',resultScene:'throne',doneLabel:'Throne complete',
 mode:{collect:{gems:[{n:'Shraddha',c:'#f2a33a'},{n:'Veerya',c:'#d9a21b'},{n:'Smruti',c:'#e889a5'},{n:'Samadhi',c:'#0f5c5e'},{n:'Pragya',c:'#f8f5ee'}]}},
 tips:{sutra:'Shraddhaveeryasmrutipragyapurvakitareshaam. Gurudev: “Then comes the most vital sutra.”',
  samadhi:'Gurudev: “Through samadhi, through deep meditation, through deep equanimous mind also awareness is gained.”',pragya:'Gurudev: “Pragya is the result of samadhi. Equanimous mind gives rise to a heightened awareness.”'},
 cards:[
  {type:'choice',scene:'throne',title:'What helps you most when things get hard?',options:[{t:'Trusting that it will work out',icon:'gem:#f2a33a',after:'That is Shraddha, faith. [[Gurudev]]: “Faith makes you solid.”'},{t:'Courage and energy',icon:'gem:#d9a21b',after:'That is Veerya. [[Gurudev]]: “100% vigor or force, courage, vitality.”'},{t:'Remembering a good moment',icon:'gem:#e889a5',after:'That is Smruti. [[Gurudev]]: “The very memory of it again, will again make you re-live that.”'},{t:'Becoming quiet and steady',icon:'gem:#0f5c5e',after:'That is [[samadhi]]. [[Gurudev]]: “Through deep meditation, through deep equanimous mind.”'}],
   quote:'Then comes the most vital sutra.',source:'on [[sutra|Sutra 1.20]]'},
  {type:'flips',scene:'throne',title:'The five supports',lead:'Tap all five gems.',tiles:[
    {f:'Shraddha',icon:'gem:#f2a33a',sub:'Faith',b:'“Faith makes you solid… It integrates your whole personality.”'},{f:'Veerya',icon:'gem:#d9a21b',sub:'Vigor',b:'“100% vigor or force, courage, vitality.”'},
    {f:'Smruti',icon:'gem:#e889a5',sub:'Memory',b:'“Memory of Samadhi reproduces… brings back you to your Self.”'},{f:'Samadhi',icon:'gem:#0f5c5e',sub:'Deep meditation',b:'“Through deep meditation, through deep equanimous mind.”'},
    {f:'Pragya',icon:'gem:#f8f5ee',sub:'Awareness',b:'“Equanimous mind gives rise to a heightened awareness.”'}],
   payoff:{q:'So, these many avenues are there, these many ways that you can blossom in life.'}},
  {type:'pick',scene:'throne',title:'Faith or doubt: which is strength?',options:[['Faith is strength',1],['Doubt is strength',0]],
   quote:'Doubt is something that pulls you all apart… Consolidation of your energy is faith.',note:'Five gems, five short challenges. Up to 100 [[Prana]].'}
 ],
 steps:[
  {type:'release',title:'Shraddha: let go of doubt',lead:'Doubt scatters your energy. Tap each doubt to see its type and let it go.',dots:true,scene:'plain',
   items:[{t:'Am I good enough? I don’t think I can do it.',label:'Doubt about one Self'},{t:'Is this all right? Will this technique do any good to me?',label:'Doubt about the technique'},{t:'What is he up to? What does he want?',label:'Doubt about the teacher'}],
   start:'Your energy is scattered.',end:'Your energy comes together.',doneTitle:'Faith gem collected',
   why:['[[Gurudev]]: “Doubts scatters you… Consolidation of your energy is faith.”','The three types of doubt are from [[Gurudev]]’s talk on the obstacles (Sutra 1.30).']},
  {type:'tapfast',title:'Veerya: unite every cell',lead:'Tap fast. Light up all 24 cells in 8 seconds.',cells:24,seconds:8,
   why:['[[Gurudev]]: “The entire body, every cell in the body gets united, the whole consciousness becomes one.”','“That sense of patriotism or valor or vigor, also takes you to a state of Meditation.”']},
  {type:'pickn',title:'Smruti: turn the wheel around',lead:'Pick the three memories that bring you back to your Self.',n:3,q:'Pick 3.',relive:'Sit & be with it…',
   options:[['A peaceful, beautiful meditation',1],['A moment of joy',1],['A compliment someone gave you',1],['An insult someone gave you',0],['A time you were embarrassed',0],['An argument from last week',0]],
   why:['[[Gurudev]]: “We don’t remember compliments, but we remember somebody’s insult more. But yoga is turning the wheel around.”','“Remember those wonderful moment you have had, sit & be with it.”']},
  {type:'still',title:'Samadhi: be steady',lead:'Press and hold the lotus without moving for 6 seconds. If you move, it starts again.',seconds:6,
   why:['[[Gurudev]]: “For a few moments you keep your body steady & keep your eyes steady & you will see almost immediately the mind will also become steady.”']},
  {type:'find',title:'Pragya: heightened awareness',lead:'Find the 4 tiny lotus buds hidden in the scene.',n:4,
   why:['[[Gurudev]]: “Pragya is the result of samadhi. Equanimous mind gives rise to a heightened awareness.”']}
 ],
 badge:{name:'Five Supports',text:'All five gems, shining bright.',miss:'Score 80% or more for the badge.',need:.8},
 endLines:['[[Gurudev]]: “So, these many avenues are there, these many ways that you can blossom in life.”']},

/* ================= Obstacle 7 · Bhranti Darshana ================= */
{id:'bhranti',num:'O7',module:6,title:'Clear the Glass',topic:'Obstacle 7: Bhranti Darshana',sutra:'1.30',
 tips:{sutra:'Vyadhisathyaanasanshaypranadaalasyaviratibrantidarshanalabhdabhoomitvanavasthitatva: the nine obstacles.',Yogamaya:'Gurudev: “This is called yogo-maya. Yogamaya is, a vision would come & give you some massage or it would be intuitive message.”'},
 cards:[
  {type:'choice',scene:'lake',title:'Have you had a strong feeling that turned out wrong?',options:[{t:'Yes',icon:'q'},{t:'Maybe once',icon:'eye'},{t:'Not that I know of',icon:'lotus'}],
   quote:'You imagine you are somebody very special. Suddenly you imagine you are super star or whatever.',source:'on Bhrantidarshana, the seventh obstacle ([[sutra|Sutra 1.30]])'},
  {type:'flips',scene:'lake',title:'Part true, part false',tiles:[
    {f:'Visions',icon:'eye',b:'“Those visions are not completely false & they are not completely true.”'},
    {f:'[[Yogamaya]]',icon:'moon',b:'“Because you are not totally hollow & empty, then there are residues or traces of your desires & hatreds & fears.”'},
    {f:'A devotee',icon:'heart',b:'“Almost every vision was right.” Then one said: “don’t take your husband to a doctor.”'}],
   payoff:{q:'Don’t gallop on these horses of delusion.'}},
  {type:'tap',scene:'lake',title:'Find the feeling',lead:'A message, and a clue.',statement:'“Don’t take your husband to a doctor.” She was already afraid of going to a doctor.',button:'I see the fear behind it',
   after:'In the game, each message is behind coloured glass. Tap the feeling behind it, and the glass clears.',note:'Up to 30 [[Prana]].'}
 ],
 steps:[
  {type:'choose',visual:'glass',retry:true,title:'Clear the glass',lead:'Read the clue. Tap the feeling behind the message.',q:'Which is behind this message?',points:30,rightTitle:'The glass is clear!',okTitle:'The glass is clear',
   hint:'Read the clue again and try another.',
   options:[{k:'fear',t:'Fear',icon:'fear'},{k:'desire',t:'Desire',icon:'crave'},{k:'hatred',t:'Hatred',icon:'dislike'},{k:'special',t:'Feeling special',icon:'special'}],
   items:[
    {who:'A message in meditation',text:'“Don’t take your husband to a doctor. He will be cured without going to a doctor.”',clue:'She was already afraid of going to a doctor.',a:'fear',why:['This is [[Gurudev]]’s story.','“So sugar went up, up, up & he lost both his eyes.”','“There were one’s own fear, craving & those things.”']},
    {who:'After one week of practice',text:'“You saw a vision. You are now somebody very special.”',clue:'The Seeker has always wanted to be admired.',a:'special',why:['[[Gurudev]]: “You imagine you are somebody very special.”']},
    {who:'A voice during meditation',text:'“Quit your job today. Great fame and riches are waiting.”',clue:'The Seeker has longed for fame for years.',a:'desire',why:['[[Gurudev]]: traces of “your desires & hatreds & fears, those things will come up in that form”.']},
    {who:'An inner feeling',text:'“Your neighbour is plotting against you. Never speak to her again.”',clue:'The Seeker has disliked this neighbour for a long time.',a:'hatred',why:['[[Gurudev]]: traces of “your desires & hatreds & fears, those things will come up in that form”.']},
    {who:'A message before the course',text:'“Don’t go. Something bad will happen if you travel.”',clue:'The Seeker is nervous about meeting new people.',a:'fear',why:['Fear can come up as an “inner voice”.','[[Gurudev]]: “Don’t gallop on these horses of delusion.”']}
   ]},
  {type:'choose',visual:'card',title:'Don’t gallop',lead:'One last question.',points:10,items:[{text:'So what should the Seeker do when an inner message comes?',a:'c',options:[{k:'a',t:'Act on it at once. The inner voice is always right.'},{k:'b',t:'Visions are always false.'},{k:'c',t:'Remember it is a mixture of some truth and some false. Don’t gallop on it.'}],why:['[[Gurudev]]: “They are mixture of some truth & some false.”','“Don’t gallop on these horses of delusion.”']}]}
 ],
 badge:{name:'Clear Seer',text:'You can spot the feeling behind an inner message.',miss:'Average 80% or more across the five scenarios and final question to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Bharantidarshana - many people get caught up in it.”']},

/* ================= Lesson 38 · Vishayavati ================= */
{id:'vishayavati',num:38,module:7,title:'One Sense, Still Mind',topic:'Vishayavati',sutra:'1.35',beginLabel:'Begin the real thing',
 tips:{sutra:'Vishayvati va pravrutirutpanna manastithinibandhani. Gurudev: “Through any one object of senses, the mind can be stilled.”',
  Vishayavati:'Gurudev: “Through any one object of senses, the mind can be stilled.”',
  grape:'Gurudev: “We have done the Grape process in the Basic course… Just take the food & just be with the food so totally.” (Part of the Art of Living Part 1 course.)'},
 cards:[
  {type:'choice',scene:'lake',title:'When was your mind most still today?',options:[{t:'Listening to music',icon:'music'},{t:'Eating something tasty',icon:'grape'},{t:'Looking at nature',icon:'nature'},{t:'I can’t remember',icon:'q'}],
   quote:'Through any one object of senses, the mind can be stilled.',source:'on [[Vishayavati]]',gaze:{button:'Try it: gaze at the lotus for 5 seconds',seconds:5,done:'[[Gurudev]]: “You gaze from all your heart, your mind that time is not running here & there.”'}},
  {type:'flips',scene:'custom',svg:sun+lake(124)+U('lotus',100,128,120,52)+U('seekerSit',108,46,104,98),title:'Three doors to stillness',lead:'Tap each door to see [[Gurudev]]’s example.',tiles:[
    {f:'Gaze',icon:'eye',b:'“You gaze from all your heart… Then you sit with eyes closed. The mind is completely settled.”'},
    {f:'Song',icon:'bell',b:'“We do the kirtan, singing, after singing, after Bhajan, we sit quiet, meditate, the mind has come to a standstill.”'},
    {f:'Grape',icon:'grape',b:'“We have done the [[grape|Grape process]]… Just take the food & just be with the food so totally.”'}],
   payoff:{q:'You don’t know in which corner your mind is stuck.',note:'So participate in all the process totally.'}},
  {type:'holdtry',scene:'lakeSide',title:'Try a practice round',seconds:6,note:'In the game: three senses, 24 seconds each.'}
 ],
 steps:[
  {type:'hold',title:'Sight: gaze at the lotus',lead:'Press and hold the lotus. Don’t tap the distractions.',art:'lotusArt',seconds:24,
   prompts:['Gaze at the lotus from all your heart.','Notice its colours.','Notice its edges and its light.','Let the mind rest here, nowhere else.'],distractions:['New message!','What’s for dinner?','Did I lock the door?','Look over here!'],
   why:['[[Gurudev]]: “You are looking at somebody, for a few moments, you gaze from all your heart, your mind that time is not running here & there.”']},
  {type:'hold',title:'Sound: listen to the bell',lead:'Press and hold the bell. A soft tone plays.',art:'bell',sound:true,seconds:24,
   prompts:['Listen to the sound from its beginning…','…to its fading.','Let the sound fill you.','Then the silence after it.'],distractions:['You have 3 alerts','Is it time yet?','Remember that email?','Check this out!'],
   why:['[[Gurudev]]: “After singing, after Bhajan, we sit quiet, meditate, the mind has come to a standstill.”']},
  {type:'hold',title:'Taste: be with one grape',lead:'Take a grape, a raisin or any small food, or imagine one. Press and hold.',art:'grape',seconds:24,
   prompts:['Take the food.','Feel it before you bite.','Taste it slowly.','Just be with the food so totally.'],distractions:['New message!','Hurry up!','What’s next?','Look over here!'],
   why:['[[Gurudev]]: “Just take the food & just be with the food so totally.”']}
 ],
 badge:{name:'Sense Anchor',text:'You stayed with one sense while distractions called.',miss:'Average 80% focus or more to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Through that activity, through that very sense, it can be brought into standstill.”']},

/* ================= Lesson 41 · Dreams and sleep ================= */
{id:'sleep',num:41,module:7,title:'Meet Your Sleep',topic:'Knowledge from dreams and sleep',sutra:'1.38',stepWord:'Act',beginLabel:'Begin the night',
 tips:{sutra:'Swapnanidragyaanalambavan va. Gurudev: “Knowledge of sleep & dreams.”',pragya:'Gurudev: “That awakening is pragya, is samadhi. That moment alone you are fully alive.”',samadhi:'Gurudev: “Knowledge of sleep that leads to samadhi.”'},
 cards:[
  {type:'choice',scene:'night',title:'Have you ever met your sleep?',lead:'There is no wrong answer.',options:[{t:'Yes, every night!',icon:'moon'},{t:'No, I just fall asleep',icon:'q'},{t:'What does that even mean?',icon:'eye'}],
   quote:'You sleep all your life but you have never met your sleep.',source:'on [[sutra|Sutra 1.38]]',after:'[[Gurudev]]: “This is like a person lived all his life with millions in his hands but does not know how to spend them.”'},
  {type:'flips',scene:'night',title:'Two ways to see a dream',lead:'Tap both to compare.',tiles:[
    {f:'Ignorant',icon:'moon',b:'“Ignorant people make a dream reality… Utter ignorance is trying to interpret the dream.”'},
    {f:'Enlightened',icon:'sun',b:'“Enlightened people see this reality as a dream.” They say: “oh, forget about it, wake up.”'}],
   payoff:{q:'Knowledge of sleep awakens you.'}},
  {type:'tap',scene:'lake',title:'Are you daydreaming right now?',lead:'Read the thought. If it is a daydream, say so.',statement:'“Next week I’ll do that; another week I’ll do this…”',button:'Oh! I am daydreaming',
   after:'[[Gurudev]]: “Once you know this is a dream, Oh! I am daydreaming. That very moment gush of energy comes into you.”',note:'Tonight: let go, brush away the dreams, then catch the daydreams.'}
 ],
 steps:[
  {type:'release',title:'Let go to fall asleep',lead:'[[Gurudev]]: “If you hold on to any one thing can you sleep?” Tap each thing to let it go.',scene:'night',
   items:[{t:'Who I am',icon:'tag'},{t:'My job title',icon:'brief'},{t:'Things I like',icon:'like'},{t:'Things I dislike',icon:'no'},{t:'My cravings',icon:'worry'},{t:'Someone very dear',icon:'people',note:'“However dear some person is, they cannot go into your sleep.”'}],
   start:'The Seeker is holding on to six things.',end:'All let go. You simply rest.',doneTitle:'Asleep!',
   why:['[[Gurudev]]: “In your sleep, you are devoid of all your identities of who you are, your cravings, your aversions, your likes, your dislikes.”','“This is exactly is meditation where we don’t do anything.”','“Knowledge of sleep that leads to [[samadhi]].”']},
  {type:'reveal',title:'Five types of dreams',lead:'Tap each dream cloud to peek at what type it is.',start:'Dreams are drifting in…',end:'All five seen. But which is which?',
   items:[{t:'Munching pizza with a big scoop of ice cream',label:'Desires',note:'“Your latent desires, they come up in dreams.”'},{t:'An old experience from long ago',label:'Stress release',note:'“Past experiences come up.”'},{t:'Something that might happen in future',label:'Intuitive',note:'“You get an intuition of that.”'},{t:'Pizza, an old experience and the future, all at once',label:'A mixture',note:'“Usually it is the 4th type of dream.”'},{t:'Songs in a strange language, in a hotel in Italy',label:'The place',note:'“It has nothing to do with you.”'}],
   question:{q:'You do not know which one is what. What would a wise person do?',options:[['Interpret each dream carefully',0],['Keep a dictionary of dream symbols',0],['Simply just brush them all',1]],why:['[[Gurudev]]: “So a wise person would simply just brush them all. Anyway it is of no use, dream is a dream.”']},
   sweep:'Brush them all away',swept:'Forget about it, wake up!'},
  {type:'timed',title:'Catch the daydream',lead:'Morning. A daydream appears. Tap the button before the bar runs out.',button:'Oh! I am daydreaming',seconds:4.5,
   items:['I will be the President of Germany or some place.','Next week I’ll do that; another week I’ll do this.','Building castles in air, in the sky…'],warn:'The mind is galloping on a dream…',good:'A gush of energy! You are awake.',miss:'That one carried you away.',
   why:['[[Gurudev]]: “That alertness wakes you up to the reality. You are awakened. That awakening is [[pragya]].”']}
 ],
 badge:{name:'Wide Awake',text:'You let go, brushed away the dreams and caught every daydream.',miss:'Brush the dreams wisely and catch every daydream to earn it.',need:.95},
 endLines:['[[Gurudev]]: “Knowledge of dream or sleep can also awaken you to the truth.”']},

/* ================= Lesson 1 · The legend of Patanjali ================= */
{id:'legend',num:1,module:1,title:'The Thousand Students',topic:'The legend of Patanjali',sutra:'1.1',tag:'The story',
 tips:{sutra:'The story Gurudev tells before Sutra 1.1.',Adishesha:'Gurudev: “Adishesha – Symbol of awarness”',Brahmarakshasha:'Gurudev: “Brahmarakshasha – means you’ll become a ghost & you will hang on the tree”'},
 cards:[
  {type:'choice',scene:'meadow',title:'How do you like to learn something deep?',options:[{t:'Through a story',icon:'heart'},{t:'Through a talk',icon:'q'},{t:'By trying it myself',icon:'sun'}],
   quote:'The great way & the most effective way of conveying something have been through stories',source:'before telling the story of Patanjali',after:'[[Gurudev]]: “On one level they just appear like a story but in a deeper level they convey something more.”'},
  {type:'flips',scene:'lake',title:'What the name means',lead:'Tap each one to see [[Gurudev]]’s words.',tiles:[
    {f:'Anjali',icon:'heart',b:'“Anjali means – your hand -- offering.”'},
    {f:'Pata',icon:'drop',b:'“Before you could offer, it dropped – that is Pata”'},
    {f:'[[Adishesha]]',icon:'eye',b:'“Then Adishesha took birth in the world as Patanjali.”'}],
   payoff:{q:'The only supreme act in the world is offering.',note:'[[Gurudev]]: “When even that offering drops… you get to a stage of total non – doing.”'}},
  {type:'pick',scene:'meadow',title:'What was Patanjali’s condition?',lead:'Pick [[Gurudev]]’s answer.',options:[['Teach one or two students at a time',0],['A thousand people, a screen between them, and nobody goes out',1]],
   quote:'Nobody should lift this curtain or screen & nobody should go out – everybody should stay till the whole thing is finished.',note:'Next: five moments from the story. Up to 70 [[Prana]].'}
 ],
 steps:[
  {type:'choose',visual:'card',shuffle:false,title:'What happened next?',lead:'Five moments from the story, in order. Pick what happened next.',points:50,rightTitle:'That’s the story!',
   items:[
    {text:'The rishis asked Vishnu how to get rid of anger, lust, greed and jealousy, without medicine. What did Vishnu do?',a:'b',options:[{k:'a',t:'Gave them a new herb'},{k:'b',t:'Just looked at Adishesha, smiling'},{k:'c',t:'Sent them back to the doctors'}],
     why:['[[Gurudev]]: “Just that smile looking at Adishesha was good enough – he conveyed the whole thing.”','“Then Adishesha took birth in the world as Patanjali.”']},
    {text:'A thousand students sat before the curtain. Patanjali taught from behind it. What happened?',a:'b',options:[{k:'a',t:'Only a few understood'},{k:'b',t:'Each one of them absorbed this knowledge'},{k:'c',t:'Nobody could hear him'}],
     why:['[[Gurudev]]: “Each one of them got – each one of them absorbed this knowledge.”','The students wondered: “How he is making each one of us understand without even saying any words, from behind the curtain.”']},
    {text:'One boy slipped out for a nature call. Curious, the others lifted the curtain. What happened?',a:'c',options:[{k:'a',t:'They saw Patanjali writing'},{k:'b',t:'Patanjali carried on teaching'},{k:'c',t:'All 999 of them were burned to ashes'}],
     why:['[[Gurudev]]: “When they lifted the curtain all the 999 of them, they all got burned down, they became ashes.”']},
    {text:'The boy came back and begged pardon. What did Patanjali do?',a:'a',options:[{k:'a',t:'Taught him the rest of the sutras, with a condition'},{k:'b',t:'Sent him away'},{k:'c',t:'Never spoke to him again'}],
     why:['[[Gurudev]]: “Patanjali was so compassionate – his heart flowed”','The condition: “If you teach one student this knowledge, then you will be liberated.”']},
    {text:'For thousands of years the boy waited on a tree as a [[Brahmarakshasha]], looking for one student. Who finally came?',a:'b',options:[{k:'a',t:'A king'},{k:'b',t:'Patanjali himself'},{k:'c',t:'Nobody ever came'}],
     why:['[[Gurudev]]: “So to redeem one’s disciple, master became a disciple of a disciple.”','“The compassion of Patanjali is unparallel.”']}
   ]},
  {type:'hold',title:'Sit on the rock',lead:'[[Gurudev]] leaves these questions to you. Press and hold the lotus, and ponder each one.',points:20,seconds:32,settle:5,art:'lotusArt',
   prompts:['What is the significance of the veil?','Why, when it was lifted – everybody was burned down?','Why though one person has disobeyed the rule was redeemed?','A goat ate half the leaves. What is the significance of that goat?'],
   settleText:'Really be with this knowledge.',after:'Each one of you think on your own.',
   why:['[[Gurudev]]: “Sit on the rock – really be with this knowledge”','“See puranas don’t give any other explanation, they just give a story & it is for us to unlock that secret.”']}
 ],
 badge:{name:'Story Keeper',text:'You know the story, and you carry its questions.',miss:'Get 4 of 5 story moments right on the first try to earn it.',need:.8,scoreStep:0},
 endLines:['[[Gurudev]]: “So Patanjali came to give this knowledge of Yoga – the union – yoga sutras.”']},

/* ================= Lesson 4 · Chitta vritti nirodha ================= */
{id:'nirodha',num:4,module:1,title:'Still the Lake',topic:'Chitta vritti nirodha',sutra:'1.2',
 tips:{sutra:'Yogah chitta vritti nirodhah. Gurudev: “Uniting all the loose ends of your existence.”',Chitta:'Gurudev: “You call mind or consciousness or chitta – it’s all the same”',Vritti:'Gurudev: “The modulations of the mind are of 5 forms”',Nirodha:'Gurudev: “the activities are subdued, subduing these activities.”'},
 cards:[
  {type:'choice',scene:'lake',title:'Where is your mind right now?',options:[{t:'On what I see',icon:'eye'},{t:'On what I hear',icon:'bell'},{t:'Somewhere else entirely',icon:'q'}],
   quote:'Your mind is engaged - is caught up in outside world all the time.',source:'on [[sutra|Sutra 1.2]]',after:'[[Gurudev]]: “Yoga is making you whole.”'},
  {type:'flips',scene:'lake',title:'Four words',lead:'Tap each word to see [[Gurudev]]’s words.',tiles:[
    {f:'Yogah',icon:'lotus',b:'“Yoga is making you whole.”'},
    {f:'[[Chitta]]',icon:'eye',b:'“You call mind or consciousness or chitta – it’s all the same”'},
    {f:'[[Vritti]]',icon:'q',b:'“The modulations of the mind are of 5 forms”'},
    {f:'[[Nirodha]]',icon:'drop',b:'“The activities are subdued, subduing these activities.”'}],
   payoff:{q:'Uniting all the loose ends of your existence.'}},
  {type:'pick',scene:'lake',title:'When do the senses become keen & crystal clear?',lead:'Pick [[Gurudev]]’s answer.',options:[['When the mind keeps comparing and remembering',0],['When the mind is not going on its own trip',1]],
   quote:'When your mind is not going on your own trip of regret & anger, anticipation, sleep, proof, wrong knowledge, fantasy & Memory a five modulations.',note:'Next: still the ripples, then rebuild the sutra. Up to 70 [[Prana]].'}
 ],
 steps:[
  {type:'release',title:'Still the lake',lead:'1. Tap a ripple to see which activity it is. 2. Tap them all until the lake is still.',scene:'lake',points:30,
   items:[{t:'Prove that you love me!',label:'Proof'},{t:'She thinks she is better than me.',label:'Wrong knowledge'},{t:'If I were 16 again…',label:'Fantasy'},{t:'So drowsy… nodding off…',label:'Sleep'},{t:'That insult last week…',label:'Memory'},{t:'What will happen next week?',label:'Anticipation'}],
   start:'Ripples cover the lake of the mind.',end:'The activities are subdued. The lake is still.',doneTitle:'The lake is still',
   why:['[[Gurudev]]: “The activities are subdued, subduing these activities.”','Every ripple is from [[Gurudev]]’s list: “regret & anger, anticipation, sleep, proof, wrong knowledge, fantasy & Memory”.']},
  {type:'order',title:'Rebuild the sutra',lead:'Put the four words back in place.',q:'Tap the four words in order.',words:[{d:'योगः',r:'yogah'},{d:'चित्त',r:'chitta'},{d:'वृत्ति',r:'vritti'},{d:'निरोधः',r:'nirodhah'}],why:['Yogah chitta vritti nirodhah.']},
  {type:'match',title:'Match the words',lead:'Every meaning is in [[Gurudev]]’s words.',
   pairs:[['Yoga','“Yoga is making you whole.”'],['Chitta','“You call mind or consciousness or chitta – it’s all the same”'],['Vritti','“The modulations of the mind are of 5 forms”'],['Nirodha','“The activities are subdued, subduing these activities.”']],
   why:['All four are from [[Gurudev]]’s commentary.']}
 ],
 badge:{name:'Still Lake',text:'You stilled the ripples and rebuilt the sutra.',miss:'Rebuild the sutra and match the words without a slip to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Whole purpose of Yoga is to be onto oneself, to bring integrity in you, to make you a whole.”']},

/* ================= Lesson 5 · Chitta ================= */
{id:'chitta',num:5,module:1,title:'Flame, Water, Air',topic:'Chitta',sutra:'1.2',
 tips:{sutra:'Yogah chitta vritti nirodhah. Gurudev: “You call mind or consciousness or chitta – it’s all the same – different modes of consciousness.”',prasadanam:'Gurudev: “If you do this, you chita, your mind will be pleasant. Chitta prasadanam. It becomes graceful, gracious.”'},
 cards:[
  {type:'choice',scene:'lakeSide',title:'What is your mind like today?',options:[{t:'Bright and lively',icon:'sun'},{t:'Calm and clear',icon:'drop'},{t:'Restless',icon:'q'}],
   quote:'You call mind or consciousness or chitta – it’s all the same – different modes of consciousness.',source:'on [[sutra|Sutra 1.2]]'},
  {type:'flips',scene:'lake',title:'Three pictures of the mind',lead:'Tap each one to see [[Gurudev]]’s words.',tiles:[
    {f:'Flame',icon:'sun',b:'“Your consciousness is a flame. Your mind is a flame, you forget this.”'},
    {f:'Water',icon:'drop',b:'“In whichever cup you put the water; the water assumes the shape of the cup.”'},
    {f:'Air',icon:'nature',b:'“Because mind is like air, is energy, is all pervading.”'}],
   payoff:{q:'In whatever thought you engage your mind, your mind becomes like that.'}},
  {type:'tap',scene:'lake',title:'Try it now',lead:'Close your eyes for a moment and do this.',statement:'Think of somebody whom you love very much.',button:'I did it',
   quote:'Think of somebody whom you love very much & you see how nice feelings, sensations arise in you, isn’t it?',note:'Next: sort 5 thoughts, then 3 questions. Up to 60 [[Prana]].'}
 ],
 steps:[
  {type:'sort',title:'The shape of the cup',lead:'Swipe each card: does this thought bring nice feelings, or knots?',points:30,count:5,
   bins:[{t:'Nice feelings',sub:'peace, quietness',icon:'lotus'},{t:'Knots',sub:'nasty, uncomfortable feelings',icon:'dislike'}],
   cards:[
    {who:'seeker',label:'The Seeker',t:'The Seeker thinks of somebody they love very much.',bin:0,why:['[[Gurudev]]: “You see how nice feelings, sensations arise in you”']},
    {who:'seeker',label:'The Seeker',t:'The Seeker thinks of one who is liberated from cravings.',bin:0,why:['[[Gurudev]]: “You start feeling that peace, feeling the quietness”']},
    {who:'friend',label:'A friend',t:'The Seeker sits with a friend who is bubbling with joy.',bin:0,why:['[[Gurudev]]: “You just go & sit with them, you start laughing, you start feeling that way”']},
    {who:'seeker',label:'The Seeker',t:'The Seeker thinks of somebody who is very nasty.',bin:1,why:['[[Gurudev]]: “Then you will start feeling those nasty emotions inside you.”']},
    {who:'seeker',label:'The Seeker',t:'The Seeker thinks of somebody who is very jealous of them.',bin:1,why:['[[Gurudev]]: “Then you will feel such uncomfortable sensations.”']},
    {who:'friend',label:'A friend',t:'The Seeker sits for a while with a friend who is very sad.',bin:1,why:['[[Gurudev]]: “You also start feeling depressed or sad.”']}
   ],
   why:['[[Gurudev]]: “In whatever thought you engage your mind, your mind becomes like that.”']},
  {type:'choose',visual:'card',title:'What is chitta?',lead:'Three questions from [[Gurudev]]’s words.',points:30,
   items:[
    {text:'Mind, consciousness, chitta: are they three different things?',a:'b',options:[{k:'a',t:'Yes, three different things'},{k:'b',t:'It’s all the same – different modes of consciousness'},{k:'c',t:'Only chitta is real'}],
     why:['[[Gurudev]]: “You call mind or consciousness or chitta – it’s all the same – different modes of consciousness.”']},
    {text:'A flame lives on wax and oxygen. What does the mind use?',a:'a',options:[{k:'a',t:'The body & the food in the body as wax, and the air as oxygen'},{k:'b',t:'Only thoughts'},{k:'c',t:'Nothing at all'}],
     why:['[[Gurudev]]: “Your life, your mind uses the body & the food in the body as wax & then the air as oxygen”']},
    {text:'Patanjali says: have friendliness, compassion and joy, and be indifferent to sinful acts. What happens to the chitta?',a:'c',options:[{k:'a',t:'It becomes restless'},{k:'b',t:'Nothing changes'},{k:'c',t:'It becomes pleasant, graceful, gracious'}],
     why:['[[Gurudev]]: “If you do this, you chita, your mind will be pleasant. Chitta prasadanam. It becomes graceful, gracious.”']}
   ]}
 ],
 badge:{name:'Clear Flame',text:'You know Gurudev’s three pictures of the mind.',miss:'Average 80% or more across card sorting and the three questions to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Putting your attention or mind on the enlightened, your consciousness is more & more alive & more filled with light.”']},

/* ================= Lesson 6 · The Seer ================= */
{id:'seer',num:6,module:1,title:'The Eye That Is You',topic:'The Seer',sutra:'1.3',beginLabel:'Begin',
 tips:{sutra:'Tada drushte swarupe awasthanam. Gurudev: “In the form of the Seer, abiding there is Yoga.”',Seer:'Gurudev: “Abiding in the form, in the nature of the seer, is Yoga.” “Seer is beyond proof.”'},
 cards:[
  {type:'choice',scene:'lake',title:'When did you last feel real joy?',options:[{t:'Today',icon:'sun'},{t:'This week',icon:'heart'},{t:'I can’t remember',icon:'q'}],
   quote:'Whenever you experience joy, ecstasy, bliss, happiness in life, knowingly or unknowingly you are abiding in the form of the Seer, in the nature of the Seer.',source:'on [[sutra|Sutra 1.3]]'},
  {type:'flips',scene:'lake',title:'Become aware',lead:'Tap each one, and do what it says.',tiles:[
    {f:'Eyes',icon:'eye',b:'“Become aware of the pair of eyes that are looking at me.”'},
    {f:'Mind',icon:'q',b:'“Become aware of the mind that through those eyes are looking at me.”'},
    {f:'Core',icon:'heart',b:'“The very center core of your existence. The eye that is YOU.”'}],
   payoff:{q:'In the form of the Seer, abiding there is Yoga.'}},
  {type:'pick',scene:'lake',title:'Does the [[Seer]] need proof?',lead:'Pick [[Gurudev]]’s answer.',options:[['Yes, the senses must prove it',0],['No, the Seer is beyond proof',1]],
   quote:'Abiding in the Self does not need a proof.',note:'Next: sort 5 moments, then one minute of [[Gurudev]]’s practice.'}
 ],
 steps:[
  {type:'sort',title:'Seer or activities?',lead:'Swipe each card: abiding in the Seer, or one with the activities of the mind?',points:30,count:5,
   bins:[{t:'In the Seer',sub:'abiding in the nature of the Seer',icon:'lotus'},{t:'In the activities',sub:'one with the activities of the mind',icon:'q'}],
   cards:[
    {who:'seeker',label:'The Seeker',t:'Sitting quietly by the lake, a wave of joy fills the Seeker.',bin:0,why:['[[Gurudev]]: “Whenever you experience joy, ecstasy, bliss, happiness in life, knowingly or unknowingly you are abiding in the form of the Seer”']},
    {who:'seeker',label:'The Seeker',t:'Eyes closed, the Seeker rests at the core, not interested in seeing or hearing anything.',bin:0,why:['[[Gurudev]]: “This moment you are not interested in seeing anything, smelling anything, hearing anything”','“Rest & relax there.”']},
    {who:'seeker',label:'The Seeker',t:'The Seeker simply feels: I am, I exist. No proof is needed.',bin:0,why:['[[Gurudev]]: “Beyond proof is your feeling of I am, I exist.”']},
    {who:'friend',label:'A friend',t:'The Seeker asks a friend to prove their love.',bin:1,why:['[[Gurudev]] on wanting proof: “This is not in the realm of the Seer.”']},
    {who:'seeker',label:'The Seeker',t:'At a mountain, the Seeker thinks: this is like Canada or like Himalayas.',bin:1,why:['[[Gurudev]]: “You are not seeing things as they are but you are seeing through memory, seeing through comparison.”']},
    {who:'seeker',label:'The Seeker',t:'Watching a movie, the Seeker forgets the body completely.',bin:1,why:['[[Gurudev]]: “Your consciousness assumes the form of that movie of that vritti.”']}
   ]},
  {type:'hold',title:'Rest in the Seer',lead:'[[Gurudev]]’s own practice. Press and hold the lotus for one minute, and follow each line.',points:20,seconds:60,settle:10,art:'lotusArt',
   prompts:['Become aware of the pair of eyes that are looking.','Become aware of the mind that through those eyes are looking.','Close your eyes, just squeeze your eyes, feel your eyes.','Take your attention from the eyes to the mind, that’s all over your head.','Become aware of your whole body, your heart & the very center core of your existence.','The eye that is YOU. Rest & relax there.'],
   settleText:'Rest & relax there. Right there.',after:'Open your eyes slowly.',
   why:['[[Gurudev]]: “Retrieve your mind from all the five senses to the core of your heart or your existence. This is drustuho swarupe awastha.”']}
 ],
 badge:{name:'Seer at Rest',text:'You rested in the eye that is you.',miss:'Sort 4 of 5 and hold the practice to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Seer is beyond proof.”']},

/* ================= Lesson 7 · Vritti saarupya ================= */
{id:'saarupya',num:7,module:1,title:'Lost in the Movie',topic:'Vritti saarupya',sutra:'1.4',
 tips:{sutra:'Vritti saarupya mitaratya. Gurudev: “You assume the form of the mind at other times, activities of the mind.”'},
 cards:[
  {type:'choice',scene:'meadow',title:'Have you ever been totally lost in a movie?',options:[{t:'Yes, often',icon:'eye'},{t:'Sometimes',icon:'q'},{t:'Never',icon:'lotus'}],
   quote:'If you are engaged in watching a movie then you don’t feel any pain or anything you don’t feel your body at all.',source:'on [[sutra|Sutra 1.4]]',after:'[[Gurudev]]: “You don’t even know you’re sitting.”'},
  {type:'flips',scene:'meadow',title:'Two stories from [[Gurudev]]',lead:'Tap each one.',tiles:[
    {f:'The village',icon:'q',b:'“People stood up really with their sticks & says come on – I am going to hit you.”'},
    {f:'The drama',icon:'eye',b:'“This gentlemen just throw his chappals – slippers on it because he was so mad at the villain”'},
    {f:'The villain',icon:'crown',b:'“That Villain really took that slipper as a sign of honor.”'}],
   payoff:{q:'Your consciousness assumes the form of that movie of that vritti.'}},
  {type:'pick',scene:'night',title:'In sleep and dreams, are you with your Self?',lead:'Pick [[Gurudev]]’s answer.',options:[['Yes, completely',0],['No, the same memories come',1]],
   quote:'In sleep & dreaming, same memories come but you are never to your Self- calm, quiet.',note:'Next: catch the mind taking a form, then 4 questions. Up to 50 [[Prana]].'}
 ],
 steps:[
  {type:'timed',title:'Caught in the movie',lead:'1. Read the moment. 2. Tap the button before the bar runs out.',button:'I’m caught up in it!',seconds:5,
   items:['The villain is torturing the hero! Grab a stick!','The villain is so good. Off comes a slipper!','Maybe a better song will come in that station…','Oh! This is beautiful. This is like Canada or like Himalayas.'],
   warn:'The mind is taking the form of what it sees…',good:'You noticed it.',miss:'That one carried you away.',
   why:['[[Gurudev]]: “You become the object of your perception.”','On the man who kept changing radio stations: “See, that is how mind works.”']},
  {type:'choose',visual:'card',title:'What happened?',lead:'Four questions on [[Gurudev]]’s words.',points:30,
   items:[
    {text:'In a village, people rushed at the stage with sticks to hit the villain. What had happened to them?',a:'b',options:[{k:'a',t:'They were resting in the Seer'},{k:'b',t:'Their consciousness assumed the form of the movie'},{k:'c',t:'They had fallen asleep'}],
     why:['[[Gurudev]]: “Nobody exists. Just the movie exists that moment.”']},
    {text:'Why did the villain take the slipper as a sign of honor?',a:'a',options:[{k:'a',t:'His acting was so good that the gentleman threw his chappals'},{k:'b',t:'He collected slippers'},{k:'c',t:'He was angry with the gentleman'}],
     why:['[[Gurudev]]: “My acting was so good that you could throw your chappals on me.”']},
    {text:'When you are in waking state, what are you constantly doing?',a:'c',options:[{k:'a',t:'Abiding in the Self'},{k:'b',t:'Sleeping'},{k:'c',t:'Engaging in the activities of the senses'}],
     why:['[[Gurudev]]: “When you are in waking state, you are constantly engaging in the activities of the senses.”']},
    {text:'Vritti saarupya mitaratya. At other times, what do you do?',a:'a',options:[{k:'a',t:'You assume the form of the mind, the activities of the mind'},{k:'b',t:'You stay in the Seer'},{k:'c',t:'Nothing happens'}],
     why:['[[Gurudev]]: “You assume the form of the mind at other times, activities of the mind.”']}
   ]}
 ],
 badge:{name:'Movie Watcher',text:'You can catch the mind taking the form of what it sees.',miss:'Average 80% or more across the timed moments and four questions to earn it.',need:.8},
 endLines:['[[Gurudev]]: “Otherwise, at other times you are with different activities of the mind, you become one with different activities of the mind.”']}
];

/* lesson menu (built lessons have an id) */
window.CATALOG=[
 {name:'Module 1 · What is Yoga?',lessons:[{id:'legend'},{id:'atha'},{id:'anushasana'},{id:'nirodha'},{id:'chitta'},{id:'seer'},{id:'saarupya'},{id:'guardian'}]},
 {name:'Module 2 · The five vrittis',lessons:[{t:'8 Painful and non-painful vrittis'},{t:'9 Pramana'},{id:'viparyaya'},{id:'vikalpa'},{t:'12 Nidra'},{t:'13 Smruti'}]},
 {name:'Module 3 · Practice & dispassion',lessons:[{t:'14 Two wheels'},{t:'15 Abhyasa'},{id:'firm'},{t:'17 Vairagya'},{t:'18 Param Vairagya'}]},
 {name:'Module 4 · Samadhi & the seeker',lessons:[{t:'19 Types of samadhi'},{t:'20 Samskaras'},{t:'21 Videha and Prakritilaya'},{id:'five'},{t:'23 Tivrasamvega'},{t:'24 Mild, medium, intense'}]},
 {name:'Module 5 · Ishwara & Om',lessons:[{t:'25 Ishwarapranidhana'},{t:'26 Who is God?'},{t:'27 The kleshas'},{t:'28 Seed of all knowledge'},{t:'29 Guru of the ancients'},{t:'30 Pranava'},{t:'31 Japa'},{t:'32 What the practice gives'}]},
 {name:'Module 6 · Obstacles',lessons:[{t:'33 The nine obstacles'},{id:'bhranti'},{t:'34 The five companions'},{t:'35 One principle'}]},
 {name:'Module 7 · Steadying the mind',lessons:[{t:'36 Four attitudes'},{t:'37 Breath'},{id:'vishayavati'},{t:'39 Vishoka Jyotishmati'},{t:'40 Veetraaga'},{id:'sleep'},{t:'43 One path'}]},
 {name:'Module 8 · Higher samadhi',lessons:[{t:'44 Atom to infinite'},{t:'45 The crystal'},{t:'46–54 Higher samadhi'}]}
];
})();
