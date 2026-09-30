// Static game data: nations, clubs, traits, attributes, formations, roles.
(function () {
  const FM = window.FM;

  FM.D = {};

  // ---------- Attributes (1–20 scale, FM-style) ----------
  FM.D.ATTRS = ['pace', 'stamina', 'strength', 'dribbling', 'technique', 'passing', 'vision', 'finishing', 'tackling', 'positioning', 'composure', 'workRate', 'reflexes', 'handling'];
  FM.D.ATTR_LABEL = {
    pace: 'Pace', stamina: 'Stamina', strength: 'Strength', dribbling: 'Dribbling', technique: 'Technique', passing: 'Passing',
    vision: 'Vision', finishing: 'Finishing', tackling: 'Tackling', positioning: 'Positioning', composure: 'Composure',
    workRate: 'Work Rate', reflexes: 'Reflexes', handling: 'Handling',
  };
  FM.D.ATTR_GROUPS = {
    Physical: ['pace', 'stamina', 'strength', 'workRate'],
    Technical: ['dribbling', 'technique', 'passing', 'finishing', 'tackling'],
    Mental: ['vision', 'positioning', 'composure'],
    Goalkeeping: ['reflexes', 'handling'],
  };
  // Radar axes: label -> attrs averaged
  FM.D.RADAR = {
    Pace: ['pace'], Attack: ['finishing', 'composure'], Creativity: ['vision', 'passing'],
    Skill: ['dribbling', 'technique'], Defence: ['tackling', 'positioning'], Physical: ['strength', 'stamina', 'workRate'],
  };
  FM.D.RADAR_GK = { Reflexes: ['reflexes'], Handling: ['handling'], Positioning: ['positioning'], Distribution: ['passing'], Composure: ['composure'], Physical: ['strength', 'pace'] };

  // Scouting language: [elite >=17, good >=14, weak <=7]
  FM.D.PHRASES = {
    pace: ['Blistering acceleration', 'Quick across the ground', 'Lacks a yard of pace'],
    stamina: ['Tireless — runs all day', 'Good engine', 'Fades late in games'],
    strength: ['Built like a tank', 'Holds his own physically', 'Easily knocked off the ball'],
    dribbling: ['Beats players for fun', 'Comfortable running with the ball', 'Loses the ball under pressure'],
    technique: ['Silky first touch', 'Clean technique', 'Heavy touch'],
    passing: ['Pinpoint range of passing', 'Tidy, reliable passer', 'Wasteful in possession'],
    vision: ['Sees passes others don\'t', 'Good awareness of teammates', 'Rarely lifts his head'],
    finishing: ['Ruthless in front of goal', 'Knows where the net is', 'Snatches at chances'],
    tackling: ['Ferocious, perfectly timed tackles', 'Wins his duels', 'Rash in the challenge'],
    positioning: ['Reads the game superbly', 'Disciplined positionally', 'Often caught out of position'],
    composure: ['Ice in his veins', 'Calm on the ball', 'Panics under pressure'],
    workRate: ['Relentless presser', 'Puts a shift in', 'Coasts through games'],
    reflexes: ['Cat-like reflexes', 'Sharp shot-stopper', 'Slow to react'],
    handling: ['Safe hands', 'Dependable handling', 'Spills routine shots'],
  };

  // ---------- Positions ----------
  FM.D.POS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'];
  FM.D.POS_NAME = { GK: 'Goalkeeper', CB: 'Centre-Back', FB: 'Full-Back', DM: 'Defensive Mid', CM: 'Central Mid', AM: 'Attacking Mid', W: 'Winger', ST: 'Striker', WB: 'Wing-Back' };
  FM.D.POS_GROUP = { GK: 'GK', CB: 'DEF', FB: 'DEF', DM: 'MID', CM: 'MID', AM: 'MID', W: 'ATT', ST: 'ATT' };
  // Weights used to compute current ability (CA) per position
  FM.D.POS_W = {
    GK: { reflexes: 3, handling: 3, positioning: 1.5, composure: 1, passing: 0.5 },
    CB: { tackling: 3, positioning: 3, strength: 2, pace: 1, composure: 1, passing: 0.5 },
    FB: { pace: 2, tackling: 2, positioning: 1.5, stamina: 1.5, workRate: 1, passing: 1, dribbling: 0.5 },
    DM: { tackling: 2.5, positioning: 2, passing: 2, workRate: 1.5, stamina: 1, strength: 1, vision: 0.5 },
    CM: { passing: 2.5, vision: 2, technique: 1.5, stamina: 1.5, workRate: 1, tackling: 0.7, composure: 1 },
    AM: { vision: 2.5, technique: 2.5, passing: 2, dribbling: 2, finishing: 1, composure: 1 },
    W: { pace: 2.5, dribbling: 2.5, technique: 1.5, passing: 1, finishing: 1, stamina: 1 },
    ST: { finishing: 3, composure: 2, pace: 1.5, strength: 1, technique: 1, dribbling: 1, positioning: 0.5 },
  };
  // How well a natural position fits a formation slot type (0–1)
  FM.D.FIT = {
    GK: { GK: 1 },
    CB: { CB: 1, DM: 0.75, FB: 0.7 },
    FB: { FB: 1, WB: 0.95, CB: 0.7, W: 0.65, DM: 0.6 },
    DM: { DM: 1, CM: 0.9, CB: 0.75 },
    CM: { CM: 1, DM: 0.85, AM: 0.85, WB: 0.55 },
    AM: { AM: 1, CM: 0.85, W: 0.8, ST: 0.75 },
    W: { W: 1, AM: 0.8, WB: 0.75, ST: 0.7, FB: 0.55 },
    ST: { ST: 1, AM: 0.75, W: 0.7 },
  };

  // ---------- Formations (x: 0 own goal → 1 opponent goal, y: 0 left → 1 right) ----------
  const GK = { t: 'GK', x: 0.04, y: 0.5 };
  FM.D.FORMATIONS = {
    '4-3-3': [GK, { t: 'FB', x: 0.24, y: 0.14 }, { t: 'CB', x: 0.2, y: 0.38 }, { t: 'CB', x: 0.2, y: 0.62 }, { t: 'FB', x: 0.24, y: 0.86 }, { t: 'DM', x: 0.38, y: 0.5 }, { t: 'CM', x: 0.5, y: 0.3 }, { t: 'CM', x: 0.5, y: 0.7 }, { t: 'W', x: 0.7, y: 0.14 }, { t: 'ST', x: 0.76, y: 0.5 }, { t: 'W', x: 0.7, y: 0.86 }],
    '4-2-3-1': [GK, { t: 'FB', x: 0.24, y: 0.14 }, { t: 'CB', x: 0.2, y: 0.38 }, { t: 'CB', x: 0.2, y: 0.62 }, { t: 'FB', x: 0.24, y: 0.86 }, { t: 'DM', x: 0.38, y: 0.38 }, { t: 'DM', x: 0.38, y: 0.62 }, { t: 'W', x: 0.62, y: 0.15 }, { t: 'AM', x: 0.6, y: 0.5 }, { t: 'W', x: 0.62, y: 0.85 }, { t: 'ST', x: 0.78, y: 0.5 }],
    '4-4-2': [GK, { t: 'FB', x: 0.24, y: 0.14 }, { t: 'CB', x: 0.2, y: 0.38 }, { t: 'CB', x: 0.2, y: 0.62 }, { t: 'FB', x: 0.24, y: 0.86 }, { t: 'W', x: 0.5, y: 0.13 }, { t: 'CM', x: 0.45, y: 0.38 }, { t: 'CM', x: 0.45, y: 0.62 }, { t: 'W', x: 0.5, y: 0.87 }, { t: 'ST', x: 0.74, y: 0.4 }, { t: 'ST', x: 0.74, y: 0.6 }],
    '3-5-2': [GK, { t: 'CB', x: 0.2, y: 0.27 }, { t: 'CB', x: 0.17, y: 0.5 }, { t: 'CB', x: 0.2, y: 0.73 }, { t: 'WB', x: 0.44, y: 0.09 }, { t: 'DM', x: 0.36, y: 0.5 }, { t: 'CM', x: 0.5, y: 0.32 }, { t: 'CM', x: 0.5, y: 0.68 }, { t: 'WB', x: 0.44, y: 0.91 }, { t: 'ST', x: 0.75, y: 0.4 }, { t: 'ST', x: 0.75, y: 0.6 }],
    '3-4-3': [GK, { t: 'CB', x: 0.2, y: 0.27 }, { t: 'CB', x: 0.17, y: 0.5 }, { t: 'CB', x: 0.2, y: 0.73 }, { t: 'WB', x: 0.46, y: 0.09 }, { t: 'CM', x: 0.44, y: 0.38 }, { t: 'CM', x: 0.44, y: 0.62 }, { t: 'WB', x: 0.46, y: 0.91 }, { t: 'W', x: 0.7, y: 0.18 }, { t: 'ST', x: 0.77, y: 0.5 }, { t: 'W', x: 0.7, y: 0.82 }],
    '5-3-2': [GK, { t: 'WB', x: 0.3, y: 0.08 }, { t: 'CB', x: 0.19, y: 0.3 }, { t: 'CB', x: 0.16, y: 0.5 }, { t: 'CB', x: 0.19, y: 0.7 }, { t: 'WB', x: 0.3, y: 0.92 }, { t: 'CM', x: 0.44, y: 0.3 }, { t: 'DM', x: 0.4, y: 0.5 }, { t: 'CM', x: 0.44, y: 0.7 }, { t: 'ST', x: 0.7, y: 0.4 }, { t: 'ST', x: 0.7, y: 0.6 }],
  };
  FM.D.shapeOf = (f) => ({ '3': 'Back 3', '4': 'Back 4', '5': 'Back 5' }[f[0]]);

  // Roles: engine modifiers (att/mid/def) + positional nudges in possession (dx, dy toward centre if 'in')
  FM.D.ROLES = {
    GK: { 'Goalkeeper': {}, 'Sweeper Keeper': { mid: 0.02, dx: 0.06, risk: 0.01 } },
    CB: { 'Centre-Back': { def: 0.02 }, 'Ball-Playing CB': { mid: 0.02, def: -0.01 }, 'Libero': { mid: 0.03, def: -0.02, dx: 0.12 } },
    FB: { 'Full-Back': { def: 0.02 }, 'Wing-Back': { att: 0.02, def: -0.01, dx: 0.14 }, 'Inverted FB': { mid: 0.03, dx: 0.12, in: 0.28 } },
    WB: { 'Wing-Back': { att: 0.02 }, 'Complete WB': { att: 0.03, def: -0.02, dx: 0.1 } },
    DM: { 'Anchor': { def: 0.03, att: -0.01 }, 'Deep-Lying Playmaker': { mid: 0.03 }, 'Segundo Volante': { att: 0.03, def: -0.01, dx: 0.14 } },
    CM: { 'Box-to-Box': { att: 0.01, def: 0.01, mid: 0.01 }, 'Carrilero': { def: 0.02, mid: 0.01, in: -0.1 }, 'Mezzala': { att: 0.03, def: -0.01, dx: 0.1, in: -0.12 }, 'Playmaker': { mid: 0.03 } },
    AM: { 'Advanced Playmaker': { mid: 0.03 }, 'Trequartista': { att: 0.03, def: -0.02 }, 'Shadow Striker': { att: 0.03, dx: 0.1 } },
    W: { 'Winger': { att: 0.02, cross: 0.1 }, 'Inverted Winger': { att: 0.02, mid: 0.01, in: 0.2 }, 'Inside Forward': { att: 0.03, in: 0.25, dx: 0.06 } },
    ST: { 'Poacher': { att: 0.03, dx: 0.04 }, 'Target Man': { att: 0.02, cross: 0.1 }, 'False 9': { mid: 0.04, att: 0.01, dx: -0.14 }, 'Pressing Forward': { att: 0.01, press: 0.05 } },
  };

  FM.D.BUILDUP = ['Short', 'Direct', 'Counter', 'Possession'];
  FM.D.PRESS = ['High Press', 'Mid Block', 'Low Block'];

  // ---------- Traits ----------
  FM.D.TRAITS = {
    'Big Game Player': { icon: '⭐', desc: 'Raises his level in derbies and against top sides.' },
    'Injury Prone': { icon: '🩹', desc: 'Picks up knocks more often than most.' },
    'Late Bloomer': { icon: '🌱', desc: 'Keeps improving well into his mid-twenties.' },
    'Loyal': { icon: '💙', desc: 'Committed to the club. Ignores outside interest.' },
    'Mercenary': { icon: '💰', desc: 'Follows the money. Unsettled by bigger offers.' },
    'Leader': { icon: '🎖️', desc: 'Organises and lifts teammates. Natural captain.' },
    'Media Friendly': { icon: '🎙️', desc: 'Handles the press brilliantly. Fans love him.' },
    'Temperamental': { icon: '🔥', desc: 'Volatile. More cards, bigger mood swings.' },
    'Derby Specialist': { icon: '⚔️', desc: 'Lives for the derby.' },
    'Fair-Weather': { icon: '🌧️', desc: 'Hates rainy matches. Noticeably worse in the wet.' },
    'Consistent': { icon: '📈', desc: 'Rarely has a bad game.' },
    'Flair': { icon: '✨', desc: 'Tries the unexpected. Moments of magic.' },
  };

  // ---------- Nations ----------
  FM.D.NATIONS = {
    ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', region: 'ENG', style: 'Hard-working and physical', bias: { workRate: 2, strength: 1.5, stamina: 1 },
      fn: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Tom', 'James', 'Ben', 'Callum', 'Kieran', 'Luke', 'Ryan', 'Jordan', 'Mason', 'Declan', 'Jamie', 'Aaron', 'Connor', 'Reece', 'Lewis', 'Dan', 'Sam', 'Nathan', 'Joe', 'Alfie', 'Archie', 'Kyle', 'Marcus', 'Ollie', 'Ethan', 'Tyler', 'Rhys'],
      ln: ['Walker', 'Hughes', 'Barnes', 'Clarke', 'Wright', 'Turner', 'Mitchell', 'Cooper', 'Ward', 'Morris', 'Bennett', 'Price', 'Fletcher', 'Holloway', 'Palmer', 'Shaw', 'Webb', 'Gray', 'Doyle', 'Harding', 'Rowe', 'Pritchard', 'Sutton', 'Hale', 'Kemp', 'Lowe', 'Marsh', 'Bishop', 'Carver', 'Dunn', 'Fox', 'Goodwin', 'Heath', 'Knox', 'Lambert', 'Osei', 'Adeyemi', 'Campbell'] },
    BRA: { name: 'Brazil', flag: '🇧🇷', region: 'SAM', style: 'Flair and technique', bias: { dribbling: 2.5, technique: 2, finishing: 1 },
      fn: ['Lucas', 'Gabriel', 'Matheus', 'João', 'Pedro', 'Rafael', 'Thiago', 'Vinícius', 'Caio', 'Diego', 'Felipe', 'Bruno', 'Igor', 'Wesley', 'Everton', 'Rodrigo'],
      ln: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Carvalho', 'Ribeiro', 'Gomes', 'Barbosa', 'Rocha', 'Nascimento', 'Moura'] },
    ARG: { name: 'Argentina', flag: '🇦🇷', region: 'SAM', style: 'Street-smart competitors', bias: { dribbling: 1.5, vision: 1.5, composure: 1.5, tackling: 1 },
      fn: ['Santiago', 'Matías', 'Nicolás', 'Facundo', 'Lautaro', 'Julián', 'Agustín', 'Franco', 'Gonzalo', 'Tomás', 'Emiliano', 'Valentín'],
      ln: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Romero', 'Sosa', 'Álvarez', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Correa'] },
    JPN: { name: 'Japan', flag: '🇯🇵', region: 'ASIA', style: 'Disciplined technicians', bias: { technique: 2, passing: 2, workRate: 2, strength: -1.5 },
      fn: ['Haruto', 'Sota', 'Yuto', 'Ren', 'Kaito', 'Daiki', 'Takumi', 'Shota', 'Ryo', 'Kenta', 'Hiroki', 'Yuki', 'Sho', 'Kaoru'],
      ln: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimura', 'Endo'] },
    KOR: { name: 'South Korea', flag: '🇰🇷', region: 'ASIA', style: 'Relentless engines', bias: { stamina: 2.5, workRate: 2.5, pace: 1 },
      fn: ['Ji-ho', 'Seung-woo', 'Hyun-jun', 'Jae-won', 'Do-yeon', 'Tae-hyun', 'Joon-ho', 'Woo-jin', 'Sang-hoon', 'Dong-hyun'],
      ln: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh'] },
    THA: { name: 'Thailand', flag: '🇹🇭', region: 'ASIA', style: 'Quick, nimble dribblers', bias: { pace: 1.5, dribbling: 1.5, technique: 1, strength: -2 },
      fn: ['Supachai', 'Chanathip', 'Theerathon', 'Ekanit', 'Suphanat', 'Kritsada', 'Thanawat', 'Nattapong', 'Pansa', 'Weerathep', 'Sarach', 'Channarong'],
      ln: ['Srisuk', 'Bunmathan', 'Songkrasin', 'Chaiyawong', 'Kaewprom', 'Phonrat', 'Mahawong', 'Saengchan', 'Thongdee', 'Wongsa', 'Rattanakorn', 'Inthasen'] },
    SRB: { name: 'Serbia', flag: '🇷🇸', region: 'EUR', style: 'Tough, uncompromising defenders', bias: { tackling: 2.5, strength: 2, positioning: 1.5 },
      fn: ['Nikola', 'Luka', 'Stefan', 'Marko', 'Aleksandar', 'Nemanja', 'Dušan', 'Filip', 'Miloš', 'Uroš', 'Lazar', 'Strahinja'],
      ln: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Pavlović', 'Milošević', 'Stanković', 'Kostić', 'Lukić'] },
    FRA: { name: 'France', flag: '🇫🇷', region: 'EUR', style: 'Elite athletes', bias: { pace: 2.5, strength: 2, stamina: 1.5 },
      fn: ['Hugo', 'Théo', 'Lucas', 'Mathis', 'Nathan', 'Enzo', 'Maxime', 'Antoine', 'Yanis', 'Rayan', 'Moussa', 'Ibrahima', 'Jules', 'Clément'],
      ln: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Lefebvre', 'Fofana', 'Diallo', 'Camara', 'Traoré', 'Mendy', 'Girard', 'Mercier', 'Blanc'] },
    ESP: { name: 'Spain', flag: '🇪🇸', region: 'EUR', style: 'Positional play specialists', bias: { passing: 2.5, vision: 2, technique: 2, strength: -1 },
      fn: ['Pablo', 'Sergio', 'Álvaro', 'Javier', 'Iker', 'Hugo', 'Adrián', 'Marcos', 'Rubén', 'Dani'],
      ln: ['García', 'Martín', 'Sánchez', 'Ruiz', 'Moreno', 'Muñoz', 'Navarro', 'Torres', 'Ramos', 'Gil', 'Vidal', 'Serrano'] },
    NGA: { name: 'Nigeria', flag: '🇳🇬', region: 'AFR', style: 'Explosive athletes', bias: { pace: 2.5, strength: 2, dribbling: 1 },
      fn: ['Chidi', 'Emeka', 'Samuel', 'Victor', 'Ahmed', 'Tunde', 'Kelechi', 'Uche', 'Ifeanyi', 'Taiwo', 'Wilfred', 'Ademola'],
      ln: ['Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Eze', 'Okonkwo', 'Obi', 'Adebayo', 'Chukwu', 'Ogunleye', 'Musa', 'Ndidi'] },
  };
  // More nations so league squads look like real leagues (fictional name combinations)
  const addN = (code, name, flag, region, style, bias, fn, ln) => (FM.D.NATIONS[code] = { name, flag, region, style, bias, fn: fn.split(' '), ln: ln.split(',').map((x) => x.trim()) });
  addN('POR', 'Portugal', '🇵🇹', 'EUR', 'Technical, inventive', { dribbling: 1.5, technique: 1.5, passing: 1 }, 'João Diogo Rúben Tiago Gonçalo André Rafael Nuno Vitor Francisco Pedro Hugo', 'Pereira, Carvalho, Mendes, Tavares, Correia, Pinto, Moreira, Lopes, Cardoso, Teixeira, Neves, Ramalho, Antunes, Fonseca');
  addN('NED', 'Netherlands', '🇳🇱', 'EUR', 'Total-football passers', { passing: 2, vision: 1.5, technique: 1 }, 'Daan Sem Lars Bram Thijs Jesse Ruben Stijn Joris Milan Luuk Niels', 'de Jong, Jansen, de Vries, van den Berg, Bakker, Visser, Smit, Meijer, de Boer, Mulder, Bos, Vos, Hendriks, Kuipers');
  addN('GER', 'Germany', '🇩🇪', 'EUR', 'Disciplined and organised', { positioning: 1.5, workRate: 1.5, composure: 1.5 }, 'Lukas Leon Jonas Felix Maximilian Niklas Tim Jan Florian Moritz Julian Kai', 'Schmidt, Schneider, Fischer, Weber, Wagner, Becker, Hoffmann, Koch, Richter, Klein, Wolf, Schröder, Neumann, Braun');
  addN('BEL', 'Belgium', '🇧🇪', 'EUR', 'Golden-generation technicians', { technique: 1.5, vision: 1 }, 'Arne Wout Jens Thibault Lucas Mathis Siebe Senne Romain Jordan', 'Peeters, Janssens, Maes, Jacobs, Willems, Claes, Goossens, Wouters, De Smet, Lambrecht, Verbeke, Michiels');
  addN('IRL', 'Ireland', '🇮🇪', 'ENG', 'Committed and physical', { workRate: 2, strength: 1.5 }, 'Seán Conor Cian Darragh Oisín Ciarán Jamie Evan Adam Kevin Shane Ryan', "Murphy, Kelly, O'Brien, Byrne, O'Connor, Walsh, McCarthy, Gallagher, Kennedy, Brennan, Nolan, Duffy, Farrell, Quinn");
  addN('SCO', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'ENG', 'Tenacious competitors', { workRate: 2, tackling: 1 }, 'Callum Ross Euan Lewis Fraser Craig Scott Kyle Grant Stuart Jamie Liam', 'MacDonald, Stewart, Anderson, Fraser, Reid, Ross, Murray, McKenzie, Paterson, Gillespie, Hamilton, Munro, Buchanan, Crawford');
  addN('WAL', 'Wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'ENG', 'Hard-running and honest', { workRate: 1.5, stamina: 1 }, 'Rhys Dylan Gethin Owain Iwan Aled Cai Dafydd Tomos Rhodri', 'Jones, Williams, Davies, Evans, Thomas, Roberts, Lewis, Morgan, Griffiths, Owen, Pugh, Llewellyn');
  addN('URU', 'Uruguay', '🇺🇾', 'SAM', 'Garra charrúa — fierce defenders', { tackling: 2, composure: 1, strength: 1 }, 'Facundo Nahitan Maximiliano Agustín Brian Mathías Diego Sebastián Nicolás Gastón', 'Olivera, Pereiro, Cabrera, Viñas, Silvera, Méndez, Acevedo, Laborda, Gutiérrez, Ferreira, Techera, Rolán');
  addN('COL', 'Colombia', '🇨🇴', 'SAM', 'Rhythm and flair', { dribbling: 2, pace: 1.5 }, 'Andrés Carlos Jhon Santiago Camilo Daniel Jefferson Wilmar Stiven Kevin Yeison Duván', 'Castaño, Borja, Arias, Palacios, Mosquera, Valencia, Cardona, Rentería, Quiñones, Hurtado, Guerrero, Murillo');
  addN('SEN', 'Senegal', '🇸🇳', 'AFR', 'Powerful and quick', { pace: 2, strength: 2 }, 'Moussa Cheikh Pape Mamadou Ibrahima Abdou Youssouf Lamine Ousmane Aliou Babacar Modou', 'Diop, Ndiaye, Fall, Cissé, Mbaye, Faye, Sow, Seck, Niang, Thiam, Badji, Ba');
  addN('GHA', 'Ghana', '🇬🇭', 'AFR', 'Athletic and energetic', { pace: 2, strength: 1.5, workRate: 1 }, 'Kwame Kofi Yaw Kwabena Kwasi Samuel Emmanuel Isaac Joseph Abdul Richmond Kojo', 'Mensah, Asante, Owusu, Appiah, Agyemang, Amoah, Adjei, Darko, Opoku, Ofori, Acheampong, Boakye');
  addN('CIV', 'Ivory Coast', '🇨🇮', 'AFR', 'Explosive dribblers', { pace: 2, dribbling: 1.5, strength: 1 }, 'Yao Serge Jean Franck Ibrahim Seko Simon Evann Oumar Christian Arsène Hamed', 'Koné, Kouassi, Bamba, Coulibaly, Ouattara, Diomandé, Kouamé, Doumbia, Gbamin, Konan, Yapi, Zoro');
  addN('MAR', 'Morocco', '🇲🇦', 'AFR', 'Silky technicians', { technique: 2, dribbling: 1.5 }, 'Youssef Hamza Amine Ilias Soufiane Zakaria Anass Bilal Oussama Ayoub Nayef Adam', 'El Amrani, Benali, Bennani, El Idrissi, Tazi, Alaoui, Berrada, Chakir, Lamrani, Haddadi, El Fassi, Ouazzani');
  addN('USA', 'United States', '🇺🇸', 'NAM', 'Athletic, tireless', { stamina: 2, workRate: 1.5, pace: 1 }, 'Tyler Brandon Chris Josh Brenden Caleb Jordan Miles Gio Cole Austin Zack', 'Johnson, Miller, Smith, Brown, Davis, Wilson, Moore, Taylor, Jackson, Harris, Clark, Parker, Reyes, Bennett');
  addN('DEN', 'Denmark', '🇩🇰', 'EUR', 'Smart, composed', { positioning: 1.5, passing: 1, strength: 1 }, 'Mads Mikkel Rasmus Frederik Oliver Magnus Emil Jonas Kasper Mathias', 'Nielsen, Jensen, Hansen, Pedersen, Larsen, Sørensen, Rasmussen, Poulsen, Madsen, Kristensen, Holm, Skov');
  addN('NOR', 'Norway', '🇳🇴', 'EUR', 'Strong and durable', { strength: 1.5, stamina: 1.5, workRate: 1 }, 'Sander Martin Kristian Magnus Jonas Henrik Eirik Sindre Håkon Tobias Fredrik Ola', 'Johansen, Olsen, Berg, Haugen, Dahl, Lund, Strand, Solberg, Bakken, Aas, Moen, Nygård');
  addN('CRO', 'Croatia', '🇭🇷', 'EUR', 'Midfield masters', { technique: 1.5, vision: 1.5, composure: 1 }, 'Ivan Mateo Marko Josip Ante Nikola Dominik Filip Petar Mario Lovro Toma', 'Horvat, Kovačević, Babić, Marić, Jurić, Knežević, Vuković, Perić, Pavić, Kolar, Božić, Grgić');
  addN('ITA', 'Italy', '🇮🇹', 'EUR', 'Tactically astute defenders', { positioning: 2, tackling: 1.5, composure: 1 }, 'Lorenzo Matteo Alessandro Davide Andrea Riccardo Giacomo Simone Nicolò Gianluca Tommaso Edoardo', 'Rossi, Russo, Ferrari, Esposito, Bianchi, Romano, Colombo, Ricci, Marino, Greco, Gallo, Conti');

  FM.D.REGIONS = { ENG: 'British Isles', EUR: 'Europe', SAM: 'South America', NAM: 'North America', ASIA: 'Asia', AFR: 'Africa' };

  // Realistic nationality mix per league (weights ≈ % of squads) and per academy
  FM.D.NAT_MIX = {
    D1: { ENG: 38, FRA: 6, ESP: 5, POR: 5, BRA: 5, NED: 4, BEL: 3, GER: 3, ARG: 3, IRL: 3, SCO: 3, WAL: 2, NGA: 2, GHA: 2, SEN: 2, CIV: 2, DEN: 2, NOR: 2, JPN: 1.5, KOR: 1.5, USA: 1.5, URU: 1, COL: 1, MAR: 1, CRO: 1, SRB: 1, ITA: 1 },
    D2: { ENG: 60, IRL: 6, SCO: 5, WAL: 5, NED: 2, NGA: 2, GHA: 2, FRA: 2, DEN: 2, NOR: 2, USA: 2, JPN: 1, POR: 1, ESP: 1, BEL: 1, CIV: 1, SEN: 1, KOR: 1 },
    D3: { ENG: 72, IRL: 6, SCO: 6, WAL: 6, NGA: 2, GHA: 2, JPN: 1, USA: 1, NED: 1, DEN: 1, NOR: 1, FRA: 1 },
    ES2: { ESP: 76, ARG: 5, URU: 3, COL: 3, MAR: 3, BRA: 3, POR: 2, SEN: 1, FRA: 1, ITA: 1, SRB: 1, CRO: 1 },
    DE1: { GER: 52, FRA: 5, NED: 4, DEN: 3, NOR: 3, SRB: 3, CRO: 3, BRA: 3, JPN: 3, POR: 2, ESP: 2, KOR: 2, USA: 2, SEN: 2, CIV: 2, GHA: 2, ENG: 2, BEL: 2, ITA: 1, MAR: 1 },
    FR1: { FRA: 55, SEN: 5, CIV: 5, MAR: 4, BRA: 3, POR: 3, BEL: 3, ARG: 2, NGA: 2, GHA: 2, ESP: 2, NED: 1, GER: 1, CRO: 1, SRB: 1, JPN: 1, KOR: 1, USA: 1, URU: 1, COL: 1, ITA: 1 },
    BR1: { BRA: 86, ARG: 5, URU: 3, COL: 3, POR: 1, USA: 1, JPN: 1 },
    ES1: { ESP: 60, ARG: 6, BRA: 5, FRA: 4, URU: 3, POR: 3, COL: 3, MAR: 3, SEN: 1.5, NGA: 1, GER: 1, NED: 1, JPN: 1, KOR: 1, CRO: 1, SRB: 1, ITA: 1, ENG: 1, BEL: 1 },
  };
  FM.D.YOUTH_MIX = {
    ENG: { ENG: 84, IRL: 4, SCO: 3, WAL: 3, NGA: 1.5, GHA: 1.5, FRA: 1, POR: 1, JPN: 0.5, KOR: 0.5 },
    ESP: { ESP: 86, ARG: 3, MAR: 3, BRA: 2, COL: 2, URU: 1.5, POR: 1.5, SEN: 1 },
    GER: { GER: 88, CRO: 2, SRB: 2, GHA: 2, NED: 1, DEN: 1, USA: 1, KOR: 1, ITA: 1, FRA: 1 },
    FRA: { FRA: 82, SEN: 4, CIV: 4, MAR: 3, GHA: 2, POR: 2, BEL: 2, NGA: 1 },
    BRA: { BRA: 96, ARG: 2, URU: 1, COL: 1 },
  };

  // ---------- Bigger name pools (combined with unique-name enforcement in world.js) ----------
  (function () {
    const more = {
      ENG: ['William Henry Freddie Theo Max Louis Joshua Luca Toby Isaac Adam Elliot Harvey Finley Oscar Jacob Liam Zach Ashley Matt Josh Curtis Dominic Reuben Kian Leon Jayden Bailey Morgan Rory Scott Jake Sonny Rico Tobias',
        'Robinson, Thompson, Lawrence, Chapman, Hodgson, Patterson, Whitaker, Ellis, Hartley, Newton, Burton, Sharp, Hayes, Cole, Fisher, Russell, Barker, Spencer, Webster, Atkinson, Holt, Parkes, Buckley, Mason, Nash, Gibbs, Porter, Reeve, Stone, Tate, Wheeler, Yates, Booth, Dixon, Frost, Hurst, Kirby, Lodge, Moss, Pearce, Rhodes, Shepherd, Summers, Watts, Addo, Asante, Okoye, Richards'],
      BRA: ['Gustavo Leonardo Guilherme Vitor Eduardo Marcelo Renan Danilo Paulo Anderson Douglas Fabrício Luan Murilo Otávio Raul Samuel Yuri Arthur Henrique',
        'Araújo, Cardoso, Martins, Freitas, Teixeira, Correia, Azevedo, Monteiro, Mendes, Batista, Cavalcanti, Duarte, Farias, Lacerda, Macedo, Nogueira, Peixoto, Queiroz, Siqueira, Vieira, Fonseca, Andrade'],
      ARG: ['Ezequiel Leandro Joaquín Ramiro Maximiliano Bruno Thiago Alan Ignacio Federico Lucas Mateo Marcos Rodrigo Cristian Hernán',
        'Gómez, Pérez, Sánchez, Ramírez, Torres, Flores, Ruiz, Castro, Ortiz, Molina, Rojas, Vega, Giménez, Aguirre, Cabrera, Ledesma, Quiroga, Ponce, Villalba, Peralta, Godoy'],
      JPN: ['Takuma Kazuki Ryota Naoki Shun Yusuke Kenji Tomoya Hayato Riku Sora Itsuki Kosuke Taichi Genki Shuto',
        'Hayashi, Shimizu, Yamaguchi, Mori, Ikeda, Hashimoto, Ishikawa, Ogawa, Okada, Fujita, Goto, Kondo, Murakami, Nishimura, Sakamoto, Aoki, Fukuda, Maeda'],
      KOR: ['Min-ho Hyun-woo Seung-min Jin-su Tae-yang Dong-won Kyung-ho Young-jae Sung-hoon Jun-seo Ha-neul Si-woo',
        'Kwon, Song, Shin, Ahn, Seo, Moon, Bae, Baek, Nam, Ryu, Jeon, Hong'],
      THA: ['Anon Apichat Chaiwat Jakkaphan Kittipong Nopphon Prasit Sittichok Thanakorn Wattana Yodsak Phakin',
        'Boonmee, Chaiyasit, Jaidee, Kongsri, Maneerat, Phromphan, Sukjai, Wongsawat, Yodchai, Pongsak, Sriwan, Thammarat'],
      SRB: ['Đorđe Milan Vladimir Bogdan Petar Dragan Ognjen Vuk Andrija Veljko Mihajlo Nenad',
        'Popović, Živković, Janković, Radović, Obradović, Simić, Todorović, Vasić, Zdravković, Nedeljković, Filipović, Ristić'],
      FRA: ['Louis Arthur Raphaël Tom Noah Adam Evan Axel Mathéo Baptiste Samuel Mamadou Adrien Benjamin Killian Wesley',
        'Durand, Leroy, Roux, Fontaine, Chevalier, Robin, Garnier, Faure, Rousseau, Lemaire, Sylla, Sissoko, Cissé, Gomis, Picard, Gauthier, Bonnet, Lacroix'],
      ESP: ['Carlos David Diego Jorge Raúl Víctor Alberto Fernando Luis Mario Óscar Alejandro Miguel Ángel Borja Gonzalo Nacho Unai Aitor Mikel Jon Asier Íñigo Gerard Pau Marc Jordi Eric Aleix Oriol',
        'López, Pérez, González, Rodríguez, Fernández, Gómez, Díaz, Hernández, Álvarez, Jiménez, Romero, Alonso, Castro, Ortega, Rubio, Molina, Delgado, Suárez, Iglesias, Garrido, Cortés, Castillo, Santos, Lozano, Guerrero, Cano, Prieto, Méndez, Calvo, Gallego, Herrera, Peña, León, Márquez, Cabrera, Flores, Campos, Vega, Fuentes, Aguirre, Pascual, Blanco, Arias, Ibáñez, Lorente, Iturralde, Etxeberria, Zubiría'],
      NGA: ['Chukwuemeka Obinna Olamide Femi Segun Yusuf Bright Frank Moses Kenneth Paul Sunday',
        'Ogbu, Ibe, Onyeka, Akinola, Okoro, Uzor, Bello, Lawal, Ajayi, Oladipo, Nnamdi, Afolabi'],
      POR: ['Bruno Rui Miguel Ricardo Luís Afonso Martim Tomás', 'Santos, Ferreira, Costa, Gomes, Martins, Rodrigues, Sousa, Oliveira, Ribeiro, Rocha, Matos, Barros'],
      NED: ['Tim Jasper Koen Tom Wout Sven Rick Kevin Dennis Jordy', 'de Wit, Kramer, van Leeuwen, Dekker, Brouwer, Vermeulen, Willems, van der Meer, Prins, Postma'],
      GER: ['Paul Lennard David Tobias Philipp Marco Luca Erik Noah Fabian', 'Zimmermann, Krüger, Hartmann, Lange, Schmitt, Meyer, Walter, König, Kaiser, Vogel, Peters, Frank'],
      BEL: ['Tibo Maxime Robbe Kobe Nathan Victor Brent Jelle Stef Lander', 'Vermeersch, Declercq, Van Damme, Hermans, Aerts, Pauwels, Desmet, Vandenberghe, Coppens, Martens'],
      IRL: ['Aaron Dara Eoin Niall Liam Patrick Tadhg Ronan Cathal Fionn', 'Lynch, Doherty, Moran, Hayes, Power, Reilly, Hogan, Kavanagh, Fitzgerald, Keane, Daly, Sheridan'],
      SCO: ['Andrew Ryan Connor Jack Blair Calum Aidan Robbie Greg Dylan', 'Thomson, Wilson, Scott, Cameron, Gordon, Kerr, Morrison, Duncan, Sinclair, Watson, Burns, Graham'],
      WAL: ['Harry Joel Lewis Morgan Tom Elis Gareth Wyn Macsen Osian', 'Rees, Phillips, Edwards, Parry, James, Powell, Hopkins, Bevan, Vaughan, Pritchard'],
      URU: ['Martín Joaquín Rodrigo Mauricio Santiago Franco Emiliano Gonzalo', 'Pereira, Fernández, Martínez, Castro, Álvarez, Sosa, Benítez, Da Silva, Rivero, Correa'],
      COL: ['Juan Sebastián Luis Felipe Alejandro Óscar Mateo Brayan', 'Gómez, Hernández, Ramírez, Rojas, Ortiz, Moreno, Serna, Balanta, Cuesta, Perea'],
      SEN: ['Saliou Habib Assane Omar Malick Serigne Demba Khadim', 'Dieng, Diatta, Diallo, Camara, Diédhiou, Mendy, Sy, Gning, Touré, Kouyaté'],
      GHA: ['Nana Kwaku Ebenezer Michael Daniel Prince Felix Collins', 'Kyei, Quaye, Tetteh, Nkrumah, Bonsu, Antwi, Sarpong, Yeboah, Owusu-Ansah, Donkor'],
      CIV: ['Wilfried Moussa Axel Nicolas Jérémie Kouadio Aboubacar Idriss', 'Traoré, Cissé, Diaby, Sangaré, Tiéné, Akpa, Seri, Kanga, Boli, Gradel'],
      MAR: ['Mehdi Karim Rayane Omar Reda Nabil Walid Taha', 'Ziani, Kaddouri, Mansouri, Benjelloun, Tahiri, Chraibi, Rachidi, Slimani, Bouzidi, Naciri'],
      USA: ['Ryan Kyle Matt Nick Tanner Hunter Jesse Diego Aidan Luke', 'Thomas, White, Lopez, Walker, Young, King, Wright, Scott, Green, Carter, Mitchell, Rivera'],
      DEN: ['Christian Viktor Anders Nicolai Rune Jeppe Victor Tobias', 'Thomsen, Mortensen, Jørgensen, Knudsen, Lauridsen, Dalsgaard, Bech, Vestergaard, Friis, Bruun'],
      NOR: ['Ole Stian Even Mats Aksel Vegard Jørgen Petter', 'Nilsen, Pettersen, Karlsen, Kristiansen, Jacobsen, Halvorsen, Eide, Thorsen, Brekke, Myhre'],
      CRO: ['Borna Duje Joško Stipe Tin Kristijan Matej Ante', 'Šimić, Radić, Lovrić, Petković, Barić, Matić, Galić, Bašić, Rukavina, Jelić'],
      ITA: ['Marco Luca Francesco Stefano Pietro Filippo Emanuele Manuel Leonardo Giorgio', 'Costa, Fontana, Moretti, Barbieri, Lombardi, Rinaldi, Caruso, Ferri, Galli, Martini, Leone, Longo, Gentile, Villa'],
    };
    for (const code in more) {
      const N = FM.D.NATIONS[code];
      const [fn, ln] = more[code];
      fn.split(' ').forEach((x) => x && !N.fn.includes(x) && N.fn.push(x));
      ln.split(',').map((x) => x.trim()).forEach((x) => x && !N.ln.includes(x) && N.ln.push(x));
    }
  })();
  // Hispanic naming uses two surnames when a combination is taken; others use a double-barrelled name
  FM.D.TWO_SURNAMES = ['ESP', 'ARG', 'URU', 'COL', 'POR', 'BRA'];

  FM.D.pickNat = (mix) => FM.U.wpick(Object.keys(mix), (k) => mix[k]);

  // Pre-season: friendlies and camps (3 pre-season slots)
  FM.D.CAMPS = {
    fitness: { name: 'Alpine fitness camp', icon: '🏔️', cost: 6e5, desc: 'Sharpens fitness and stamina. Everyone starts the season at 100%.' },
    tactical: { name: 'Tactical camp', icon: '🧠', cost: 4e5, desc: 'Drills your system. Big boost to tactical familiarity.' },
    youth: { name: 'Youth development camp', icon: '🌱', cost: 3e5, desc: 'Intensive coaching for players aged 21 and under.' },
    tour: { name: 'Commercial tour of Asia', icon: '✈️', cost: -2.5e6, desc: 'Earns money and new fans, but the travel tires the squad.' },
  };
  FM.D.PRESEASON_DAYS = 3;

  FM.D.STAFF_ROLES = {
    'Assistant Manager': { key: 'assistant', effect: 'Sharper advice on selection, tactics and the squad' },
    'First-Team Coach': { key: 'coach', effect: 'Faster player development' },
    'Head of Analytics': { key: 'analyst', effect: 'Moneyball insights and deeper post-match analysis' },
    'Head Physio': { key: 'physio', effect: 'Shorter injury layoffs' },
    'Sporting Director': { key: 'director', effect: 'Negotiates lower fees and wages' },
    'Scout': { key: 'scout', effect: 'Finds and assesses players' },
  };

  // ---------- Club identities (drive board objectives + fan culture) ----------
  FM.D.IDENTITY = {
    oil: { label: 'Oil-Backed', icon: '🛢️', fans: 'Trophies. Nothing else matters.', budget: 2.0, sell: 1.6, obj: 'title' },
    giant: { label: 'Historic Giant', icon: '🏛️', fans: 'Expect to challenge for the title every season.', budget: 1.6, sell: 1.3, obj: 'top2' },
    historic: { label: 'Proud History', icon: '📜', fans: 'Want European nights and a top-half finish.', budget: 1.1, sell: 1.1, obj: 'tophalf' },
    fan: { label: 'Fan-Owned', icon: '🤝', fans: 'Demand attacking football and a club that lives within its means.', budget: 0.8, sell: 1.0, obj: 'attack' },
    youth: { label: 'Youth-Focused', icon: '🌱', fans: 'Love seeing academy kids get their chance.', budget: 0.8, sell: 1.0, obj: 'youth' },
    selling: { label: 'Selling Club', icon: '💼', fans: 'Accept sales — if you find the next gem.', budget: 0.9, sell: 0.85, obj: 'profit' },
    fallen: { label: 'Fallen Giant', icon: '🏚️', fans: 'Desperate for a return to former glory.', budget: 1.2, sell: 1.2, obj: 'rise' },
  };

  // ---------- Domestic clubs (real names; identity and reputation are the game's own ratings) ----------
  // [name, short, city, primary, secondary, identity, rep, stadium, capacity]
  FM.D.CLUBS_D1 = [
    ['Manchester City', 'MCI', 'Manchester', '#6CABDD', '#1C2C5B', 'oil', 88, 'Etihad Stadium', 53400],
    ['Liverpool', 'LIV', 'Liverpool', '#C8102E', '#00B2A9', 'giant', 88, 'Anfield', 61276],
    ['Arsenal', 'ARS', 'London', '#EF0107', '#FFFFFF', 'giant', 87, 'Emirates Stadium', 60704],
    ['Chelsea', 'CHE', 'London', '#034694', '#FFFFFF', 'oil', 82, 'Stamford Bridge', 40343],
    ['Manchester United', 'MUN', 'Manchester', '#DA291C', '#FFFFFF', 'fallen', 80, 'Old Trafford', 74310],
    ['Newcastle United', 'NEW', 'Newcastle', '#241F20', '#FFFFFF', 'oil', 78, 'St James\' Park', 52305],
    ['Tottenham Hotspur', 'TOT', 'London', '#FFFFFF', '#132257', 'historic', 78, 'Tottenham Hotspur Stadium', 62850],
    ['Aston Villa', 'AVL', 'Birmingham', '#670E36', '#95BFE5', 'historic', 75, 'Villa Park', 42640],
    ['Brighton & Hove Albion', 'BHA', 'Brighton', '#0057B8', '#FFFFFF', 'selling', 72, 'Amex Stadium', 31876],
    ['Nottingham Forest', 'NFO', 'Nottingham', '#DD0000', '#FFFFFF', 'fallen', 71, 'City Ground', 30404],
    ['West Ham United', 'WHU', 'London', '#7A263A', '#1BB1E7', 'historic', 68, 'London Stadium', 62500],
    ['Crystal Palace', 'CRY', 'London', '#1B458F', '#C4122E', 'historic', 68, 'Selhurst Park', 25486],
    ['AFC Bournemouth', 'BOU', 'Bournemouth', '#DA291C', '#000000', 'selling', 68, 'Vitality Stadium', 11307],
    ['Fulham', 'FUL', 'London', '#FFFFFF', '#000000', 'historic', 67, 'Craven Cottage', 29589],
    ['Brentford', 'BRE', 'London', '#E30613', '#FFFFFF', 'selling', 67, 'Gtech Community Stadium', 17250],
    ['Everton', 'EVE', 'Liverpool', '#003399', '#FFFFFF', 'fallen', 67, 'Hill Dickinson Stadium', 52888],
    ['Wolverhampton Wanderers', 'WOL', 'Wolverhampton', '#FDB913', '#231F20', 'selling', 66, 'Molineux', 31750],
    ['Leeds United', 'LEE', 'Leeds', '#FFFFFF', '#1D428A', 'fallen', 64, 'Elland Road', 37645],
    ['Sunderland', 'SUN', 'Sunderland', '#EB172B', '#FFFFFF', 'fallen', 62, 'Stadium of Light', 48707],
    ['Burnley', 'BUR', 'Burnley', '#6C1D45', '#99D6EA', 'youth', 61, 'Turf Moor', 21944],
  ];
  FM.D.CLUBS_D2 = [
    ['Leicester City', 'LEI', 'Leicester', '#003090', '#FDBE11', 'fallen', 61, 'King Power Stadium', 32259],
    ['Southampton', 'SOU', 'Southampton', '#D71920', '#FFFFFF', 'youth', 60, 'St Mary\'s Stadium', 32384],
    ['Ipswich Town', 'IPS', 'Ipswich', '#3A64A3', '#FFFFFF', 'historic', 59, 'Portman Road', 30311],
    ['Sheffield United', 'SHU', 'Sheffield', '#EE2737', '#FFFFFF', 'fan', 58, 'Bramall Lane', 32050],
    ['Middlesbrough', 'MID', 'Middlesbrough', '#E11B22', '#FFFFFF', 'historic', 57, 'Riverside Stadium', 34742],
    ['Birmingham City', 'BIR', 'Birmingham', '#0000FF', '#FFFFFF', 'oil', 57, 'St Andrew\'s', 29409],
    ['West Bromwich Albion', 'WBA', 'West Bromwich', '#122F67', '#FFFFFF', 'historic', 56, 'The Hawthorns', 26850],
    ['Norwich City', 'NCI', 'Norwich', '#FFF200', '#00A650', 'youth', 56, 'Carrow Road', 27359],
    ['Coventry City', 'COV', 'Coventry', '#6CABDD', '#FFFFFF', 'fan', 55, 'Coventry Building Society Arena', 32609],
    ['Watford', 'WAT', 'Watford', '#FBEE23', '#ED2127', 'selling', 55, 'Vicarage Road', 22200],
    ['Wrexham', 'WRX', 'Wrexham', '#D6001C', '#FFFFFF', 'oil', 54, 'Racecourse Ground', 12600],
    ['Stoke City', 'STK', 'Stoke-on-Trent', '#E03A3E', '#FFFFFF', 'fallen', 54, 'bet365 Stadium', 30089],
    ['Hull City', 'HUL', 'Hull', '#F18A01', '#000000', 'fan', 53, 'MKM Stadium', 25586],
    ['Swansea City', 'SWA', 'Swansea', '#FFFFFF', '#121212', 'youth', 53, 'Swansea.com Stadium', 21088],
    ['Derby County', 'DER', 'Derby', '#FFFFFF', '#000000', 'fallen', 53, 'Pride Park', 32956],
    ['Sheffield Wednesday', 'SHW', 'Sheffield', '#0E00F7', '#FFFFFF', 'fallen', 52, 'Hillsborough', 39732],
    ['Blackburn Rovers', 'BLB', 'Blackburn', '#009EE0', '#FFFFFF', 'fallen', 52, 'Ewood Park', 31367],
    ['Bristol City', 'BRC', 'Bristol', '#E21A23', '#FFFFFF', 'youth', 52, 'Ashton Gate', 27000],
    ['Queens Park Rangers', 'QPR', 'London', '#1D5BA4', '#FFFFFF', 'fan', 51, 'Loftus Road', 18439],
    ['Preston North End', 'PNE', 'Preston', '#FFFFFF', '#000080', 'fan', 51, 'Deepdale', 23404],
    ['Millwall', 'MIL', 'London', '#001D5E', '#FFFFFF', 'fan', 51, 'The Den', 20146],
    ['Portsmouth', 'POM', 'Portsmouth', '#001489', '#FFFFFF', 'fan', 50, 'Fratton Park', 20899],
    ['Charlton Athletic', 'CHA', 'London', '#D4021D', '#FFFFFF', 'historic', 49, 'The Valley', 27111],
    ['Oxford United', 'OXF', 'Oxford', '#FFD100', '#001D5E', 'fan', 47, 'Kassam Stadium', 12500],
  ];
  FM.D.CLUBS_ES1 = [
    ['Real Madrid', 'RMA', 'Madrid', '#FFFFFF', '#FEBE10', 'giant', 89, 'Santiago Bernabéu', 83186],
    ['FC Barcelona', 'FCB', 'Barcelona', '#A50044', '#004D98', 'giant', 88, 'Spotify Camp Nou', 99354],
    ['Atlético Madrid', 'ATM', 'Madrid', '#CB3524', '#272E61', 'historic', 82, 'Metropolitano', 70460],
    ['Athletic Club', 'ATH', 'Bilbao', '#EE2523', '#FFFFFF', 'youth', 76, 'San Mamés', 53289],
    ['Villarreal', 'VIL', 'Villarreal', '#FFE667', '#005187', 'selling', 74, 'Estadio de la Cerámica', 23500],
    ['Real Sociedad', 'RSO', 'San Sebastián', '#143C8B', '#FFFFFF', 'youth', 73, 'Reale Arena', 39313],
    ['Real Betis', 'BET', 'Seville', '#0BB363', '#FFFFFF', 'historic', 72, 'Benito Villamarín', 60721],
    ['Sevilla', 'SEV', 'Seville', '#FFFFFF', '#D81E05', 'fallen', 68, 'Ramón Sánchez-Pizjuán', 43883],
    ['Girona', 'GIR', 'Girona', '#CD2534', '#FFFFFF', 'oil', 66, 'Montilivi', 14624],
    ['Valencia', 'VAL', 'Valencia', '#FFFFFF', '#000000', 'fallen', 66, 'Mestalla', 49430],
    ['Celta Vigo', 'CEL', 'Vigo', '#8AC3EE', '#FFFFFF', 'selling', 64, 'Balaídos', 24870],
    ['Osasuna', 'OSA', 'Pamplona', '#D91A21', '#0A346F', 'fan', 64, 'El Sadar', 23576],
    ['Mallorca', 'MLL', 'Palma', '#E20613', '#000000', 'fan', 62, 'Estadi Mallorca Son Moix', 26020],
    ['Espanyol', 'RCD', 'Barcelona', '#007FC8', '#FFFFFF', 'fallen', 62, 'RCDE Stadium', 40000],
    ['Rayo Vallecano', 'RAY', 'Madrid', '#FFFFFF', '#E53027', 'fan', 61, 'Estadio de Vallecas', 14708],
    ['Getafe', 'GET', 'Getafe', '#005999', '#FFFFFF', 'selling', 61, 'Coliseum', 16500],
    ['Alavés', 'ALA', 'Vitoria-Gasteiz', '#0761AF', '#FFFFFF', 'youth', 60, 'Mendizorroza', 19840],
    ['Real Oviedo', 'OVI', 'Oviedo', '#0033A0', '#FFFFFF', 'fan', 59, 'Carlos Tartiere', 30500],
    ['Levante', 'LEV', 'Valencia', '#B5123E', '#004F9F', 'fan', 59, 'Ciutat de València', 26354],
    ['Elche', 'ELC', 'Elche', '#FFFFFF', '#05642C', 'fan', 58, 'Martínez Valero', 31388],
  ];


  // ---------- More leagues ----------
  FM.D.CLUBS_D3 = [
    ['Cardiff City', 'CAR', 'Cardiff', '#0070B5', '#FFFFFF', 'fallen', 49, 'Cardiff City Stadium', 33280],
    ['Luton Town', 'LUT', 'Luton', '#F78F1E', '#002D62', 'fallen', 48, 'Kenilworth Road', 12000],
    ['Huddersfield Town', 'HUD', 'Huddersfield', '#0E63AD', '#FFFFFF', 'historic', 48, 'John Smith\'s Stadium', 24121],
    ['Bolton Wanderers', 'BWA', 'Bolton', '#FFFFFF', '#263C7E', 'fallen', 48, 'Toughsheet Community Stadium', 28723],
    ['Plymouth Argyle', 'PLY', 'Plymouth', '#00563F', '#FFFFFF', 'fan', 46, 'Home Park', 17900],
    ['Reading', 'REA', 'Reading', '#004494', '#FFFFFF', 'fallen', 46, 'Select Car Leasing Stadium', 24161],
    ['Barnsley', 'BNS', 'Barnsley', '#D71921', '#FFFFFF', 'youth', 45, 'Oakwell', 23287],
    ['Wigan Athletic', 'WIG', 'Wigan', '#1D59AF', '#FFFFFF', 'selling', 45, 'Brick Community Stadium', 25138],
    ['Stockport County', 'STO', 'Stockport', '#0B4EA2', '#FFFFFF', 'fan', 45, 'Edgeley Park', 10841],
    ['Bradford City', 'BFD', 'Bradford', '#8E1B3A', '#FFB81C', 'fallen', 44, 'Valley Parade', 25136],
    ['Blackpool', 'BLP', 'Blackpool', '#F68712', '#FFFFFF', 'fan', 44, 'Bloomfield Road', 16616],
    ['Peterborough United', 'PBO', 'Peterborough', '#0055A4', '#FFFFFF', 'selling', 44, 'Weston Homes Stadium', 15314],
    ['Rotherham United', 'ROT', 'Rotherham', '#D71920', '#FFFFFF', 'fallen', 43, 'New York Stadium', 12021],
    ['Lincoln City', 'LIN', 'Lincoln', '#E1251B', '#FFFFFF', 'youth', 43, 'Sincil Bank', 10669],
    ['Doncaster Rovers', 'DON', 'Doncaster', '#E21E26', '#FFFFFF', 'fan', 42, 'Eco-Power Stadium', 15231],
    ['Leyton Orient', 'LEY', 'London', '#C8102E', '#FFFFFF', 'fan', 42, 'Brisbane Road', 9271],
    ['Wycombe Wanderers', 'WYC', 'High Wycombe', '#88C4E6', '#0B1D4F', 'youth', 42, 'Adams Park', 10137],
    ['Mansfield Town', 'MNS', 'Mansfield', '#FEDD00', '#0033A0', 'fan', 41, 'Field Mill', 9186],
    ['Exeter City', 'EXE', 'Exeter', '#D6001C', '#FFFFFF', 'fan', 40, 'St James Park', 8696],
    ['Port Vale', 'PVA', 'Stoke-on-Trent', '#FFFFFF', '#000000', 'fan', 40, 'Vale Park', 15036],
    ['AFC Wimbledon', 'WIM', 'London', '#0033A0', '#FFD100', 'fan', 40, 'Plough Lane', 9215],
    ['Stevenage', 'STV', 'Stevenage', '#E30613', '#FFFFFF', 'youth', 40, 'Lamex Stadium', 7800],
    ['Northampton Town', 'NTN', 'Northampton', '#7A263A', '#FFFFFF', 'fan', 39, 'Sixfields Stadium', 7798],
    ['Burton Albion', 'BRT', 'Burton upon Trent', '#FFD100', '#000000', 'selling', 39, 'Pirelli Stadium', 6912],
  ];
  FM.D.CLUBS_ES2 = [
    ['Deportivo La Coruña', 'DEP', 'A Coruña', '#0067B1', '#FFFFFF', 'fallen', 56, 'Riazor', 32660],
    ['Las Palmas', 'LPA', 'Las Palmas', '#FFE400', '#0055A5', 'fan', 56, 'Estadio Gran Canaria', 32400],
    ['Real Valladolid', 'VLD', 'Valladolid', '#5B2C83', '#FFFFFF', 'fallen', 56, 'José Zorrilla', 27618],
    ['Málaga', 'MAL', 'Málaga', '#0073CF', '#FFFFFF', 'fallen', 55, 'La Rosaleda', 30044],
    ['Almería', 'ALM', 'Almería', '#EE1119', '#FFFFFF', 'oil', 55, 'Estadio de los Juegos Mediterráneos', 15274],
    ['Real Zaragoza', 'ZAR', 'Zaragoza', '#FFFFFF', '#0A3A82', 'fallen', 54, 'La Romareda', 33608],
    ['Leganés', 'LEG', 'Leganés', '#FFFFFF', '#0B3F8C', 'youth', 54, 'Butarque', 12454],
    ['Granada', 'GRA', 'Granada', '#C8102E', '#FFFFFF', 'selling', 54, 'Nuevo Los Cármenes', 19336],
    ['Sporting Gijón', 'SPG', 'Gijón', '#E30613', '#FFFFFF', 'historic', 53, 'El Molinón', 29371],
    ['Racing Santander', 'RSA', 'Santander', '#FFFFFF', '#00843D', 'historic', 53, 'El Sardinero', 22222],
    ['Cádiz', 'CAD', 'Cádiz', '#FFE400', '#0045A7', 'fan', 53, 'Nuevo Mirandilla', 20724],
    ['Eibar', 'EIB', 'Eibar', '#004F9F', '#A6192E', 'youth', 51, 'Ipurua', 8164],
    ['Castellón', 'CAS', 'Castellón de la Plana', '#FFFFFF', '#000000', 'oil', 51, 'Nou Castàlia', 15500],
    ['Andorra', 'AND', 'Andorra la Vella', '#0038A8', '#FEDD00', 'oil', 50, 'Estadi Nacional', 3306],
    ['Huesca', 'HUE', 'Huesca', '#003DA5', '#A6192E', 'youth', 49, 'El Alcoraz', 9128],
    ['Albacete', 'ALB', 'Albacete', '#FFFFFF', '#000000', 'fan', 49, 'Carlos Belmonte', 17524],
    ['Burgos', 'BGS', 'Burgos', '#FFFFFF', '#000000', 'fan', 48, 'El Plantío', 12200],
    ['Córdoba', 'CCF', 'Córdoba', '#FFFFFF', '#00843D', 'fan', 48, 'Nuevo Arcángel', 21822],
    ['Mirandés', 'MIR', 'Miranda de Ebro', '#E30613', '#000000', 'youth', 48, 'Anduva', 5759],
    ['Real Sociedad B', 'RSS', 'San Sebastián', '#143C8B', '#FFFFFF', 'youth', 47, 'Estadio de Zubieta', 2500],
    ['Cultural Leonesa', 'CYD', 'León', '#FFFFFF', '#000000', 'fan', 46, 'Reino de León', 13346],
    ['Ceuta', 'CEU', 'Ceuta', '#FFFFFF', '#000000', 'fan', 45, 'Alfonso Murube', 6500],
  ];
  FM.D.CLUBS_DE1 = [
    ['Bayern Munich', 'BAY', 'Munich', '#DC052D', '#FFFFFF', 'giant', 89, 'Allianz Arena', 75024],
    ['Borussia Dortmund', 'BVB', 'Dortmund', '#FDE100', '#000000', 'fan', 84, 'Signal Iduna Park', 81365],
    ['Bayer Leverkusen', 'B04', 'Leverkusen', '#E32221', '#000000', 'historic', 81, 'BayArena', 30210],
    ['RB Leipzig', 'RBL', 'Leipzig', '#FFFFFF', '#DD0741', 'oil', 78, 'Red Bull Arena', 47069],
    ['Eintracht Frankfurt', 'SGE', 'Frankfurt', '#000000', '#E1000F', 'fan', 74, 'Deutsche Bank Park', 58000],
    ['VfB Stuttgart', 'VFB', 'Stuttgart', '#FFFFFF', '#E32219', 'historic', 74, 'MHPArena', 60449],
    ['SC Freiburg', 'SCF', 'Freiburg', '#C00000', '#000000', 'youth', 69, 'Europa-Park Stadion', 34700],
    ['VfL Wolfsburg', 'WOB', 'Wolfsburg', '#65B32E', '#FFFFFF', 'selling', 66, 'Volkswagen Arena', 28917],
    ['Borussia Mönchengladbach', 'BMG', 'Mönchengladbach', '#FFFFFF', '#000000', 'historic', 66, 'Borussia-Park', 54042],
    ['Hamburger SV', 'HSV', 'Hamburg', '#FFFFFF', '#0A3E8C', 'fallen', 66, 'Volksparkstadion', 57000],
    ['1. FC Köln', 'KOE', 'Cologne', '#FFFFFF', '#ED1C24', 'fallen', 64, 'RheinEnergieStadion', 50000],
    ['Werder Bremen', 'SVW', 'Bremen', '#1D9053', '#FFFFFF', 'historic', 64, 'Weserstadion', 42100],
    ['Mainz 05', 'M05', 'Mainz', '#C3141E', '#FFFFFF', 'fan', 63, 'Mewa Arena', 33305],
    ['Union Berlin', 'FCU', 'Berlin', '#EB1923', '#FFFFFF', 'fan', 62, 'An der Alten Försterei', 22012],
    ['TSG Hoffenheim', 'TSG', 'Sinsheim', '#1C63B7', '#FFFFFF', 'selling', 62, 'PreZero Arena', 30150],
    ['FC Augsburg', 'AUG', 'Augsburg', '#FFFFFF', '#BA3733', 'fan', 61, 'WWK Arena', 30660],
    ['FC St. Pauli', 'STP', 'Hamburg', '#624839', '#FFFFFF', 'fan', 60, 'Millerntor-Stadion', 29546],
    ['1. FC Heidenheim', 'HDH', 'Heidenheim', '#E2001A', '#003B79', 'youth', 58, 'Voith-Arena', 15000],
  ];
  FM.D.CLUBS_FR1 = [
    ['Paris Saint-Germain', 'PSG', 'Paris', '#004170', '#DA291C', 'oil', 90, 'Parc des Princes', 47929],
    ['Olympique de Marseille', 'OMA', 'Marseille', '#FFFFFF', '#2FAEE0', 'giant', 82, 'Orange Vélodrome', 67394],
    ['AS Monaco', 'ASM', 'Monaco', '#E30613', '#FFFFFF', 'oil', 78, 'Stade Louis II', 18523],
    ['Olympique Lyonnais', 'OLY', 'Lyon', '#FFFFFF', '#DA291C', 'fallen', 74, 'Groupama Stadium', 59186],
    ['LOSC Lille', 'LIL', 'Lille', '#E01E13', '#1B2C5A', 'selling', 74, 'Stade Pierre-Mauroy', 50186],
    ['OGC Nice', 'NIC', 'Nice', '#CE1126', '#000000', 'oil', 70, 'Allianz Riviera', 36178],
    ['Stade Rennais', 'REN', 'Rennes', '#E2001A', '#000000', 'youth', 70, 'Roazhon Park', 29778],
    ['RC Lens', 'RCL', 'Lens', '#FFD100', '#E30613', 'fan', 69, 'Stade Bollaert-Delelis', 38223],
    ['RC Strasbourg', 'RCS', 'Strasbourg', '#0056A6', '#FFFFFF', 'oil', 66, 'Stade de la Meinau', 29230],
    ['Stade Brestois', 'SBR', 'Brest', '#E30613', '#FFFFFF', 'selling', 62, 'Stade Francis-Le Blé', 15220],
    ['Toulouse FC', 'TFC', 'Toulouse', '#6B2C91', '#FFFFFF', 'youth', 62, 'Stadium de Toulouse', 33150],
    ['FC Nantes', 'NAN', 'Nantes', '#FCD405', '#009A44', 'historic', 61, 'Stade de la Beaujoire', 35322],
    ['Paris FC', 'PFC', 'Paris', '#1B2C5A', '#FFFFFF', 'oil', 60, 'Stade Jean-Bouin', 20000],
    ['FC Lorient', 'LOR', 'Lorient', '#F58025', '#000000', 'fan', 59, 'Stade du Moustoir', 18110],
    ['AJ Auxerre', 'AUX', 'Auxerre', '#FFFFFF', '#0033A0', 'fan', 58, 'Stade de l\'Abbé-Deschamps', 18541],
    ['Le Havre AC', 'HAC', 'Le Havre', '#1D5EAE', '#89CFF0', 'historic', 58, 'Stade Océane', 25178],
    ['Angers SCO', 'ANG', 'Angers', '#000000', '#FFFFFF', 'fan', 58, 'Stade Raymond-Kopa', 18752],
    ['FC Metz', 'FCM', 'Metz', '#8E1B3A', '#FFFFFF', 'historic', 57, 'Stade Saint-Symphorien', 28786],
  ];
  FM.D.CLUBS_BR1 = [
    ['Flamengo', 'FLA', 'Rio de Janeiro', '#C4122E', '#000000', 'giant', 85, 'Maracanã', 78838],
    ['Palmeiras', 'PAL', 'São Paulo', '#006437', '#FFFFFF', 'giant', 84, 'Allianz Parque', 43713],
    ['Corinthians', 'COR', 'São Paulo', '#FFFFFF', '#000000', 'historic', 79, 'Neo Química Arena', 49205],
    ['São Paulo', 'SAO', 'São Paulo', '#FFFFFF', '#E4002B', 'historic', 78, 'MorumBIS', 66795],
    ['Botafogo', 'BOT', 'Rio de Janeiro', '#000000', '#FFFFFF', 'oil', 77, 'Estádio Nilton Santos', 46831],
    ['Atlético Mineiro', 'CAM', 'Belo Horizonte', '#000000', '#FFFFFF', 'oil', 76, 'Arena MRV', 46000],
    ['Grêmio', 'GRE', 'Porto Alegre', '#0D80BF', '#000000', 'historic', 75, 'Arena do Grêmio', 55662],
    ['Internacional', 'SCI', 'Porto Alegre', '#E30613', '#FFFFFF', 'historic', 75, 'Beira-Rio', 50128],
    ['Fluminense', 'FLU', 'Rio de Janeiro', '#7A1F3D', '#00613C', 'historic', 74, 'Maracanã', 78838],
    ['Cruzeiro', 'CRU', 'Belo Horizonte', '#0033A0', '#FFFFFF', 'fallen', 73, 'Mineirão', 61846],
    ['Vasco da Gama', 'VAS', 'Rio de Janeiro', '#FFFFFF', '#000000', 'fallen', 72, 'São Januário', 21880],
    ['Santos', 'SAN', 'Santos', '#FFFFFF', '#000000', 'fallen', 71, 'Vila Belmiro', 16068],
    ['Bahia', 'BAH', 'Salvador', '#004A99', '#E30613', 'oil', 70, 'Arena Fonte Nova', 47907],
    ['Fortaleza', 'FTZ', 'Fortaleza', '#1F3B8E', '#E30613', 'fan', 68, 'Arena Castelão', 63903],
    ['Red Bull Bragantino', 'RBB', 'Bragança Paulista', '#FFFFFF', '#D1001F', 'oil', 67, 'Estádio Nabi Abi Chedid', 17022],
    ['Ceará', 'CEA', 'Fortaleza', '#000000', '#FFFFFF', 'fan', 64, 'Arena Castelão', 63903],
    ['Sport Recife', 'SPT', 'Recife', '#E30613', '#000000', 'fan', 64, 'Ilha do Retiro', 32983],
    ['Vitória', 'VIT', 'Salvador', '#E30613', '#000000', 'fan', 63, 'Barradão', 30793],
    ['Juventude', 'JVD', 'Caxias do Sul', '#00843D', '#FFFFFF', 'fan', 62, 'Alfredo Jaconi', 19924],
    ['Mirassol', 'MSL', 'Mirassol', '#FFE600', '#00843D', 'youth', 62, 'Estádio José Maria de Campos Maia', 15000],
  ];
  // League list: [compId, clubs, nation] — the world builder reads this
  FM.D.LEAGUE_CLUBS = [['D1', 'CLUBS_D1', 'ENG'], ['D2', 'CLUBS_D2', 'ENG'], ['D3', 'CLUBS_D3', 'ENG'], ['ES1', 'CLUBS_ES1', 'ESP'], ['ES2', 'CLUBS_ES2', 'ESP'], ['DE1', 'CLUBS_DE1', 'GER'], ['FR1', 'CLUBS_FR1', 'FRA'], ['BR1', 'CLUBS_BR1', 'BRA']];
  FM.D.allClubRows = () => FM.D.LEAGUE_CLUBS.flatMap(([, k]) => FM.D[k]);

  // National team kit colours
  FM.D.NT_COLORS = { ENG: ['#FFFFFF', '#CE1124'], BRA: ['#FFDF00', '#009C3B'], ARG: ['#75AADB', '#FFFFFF'], JPN: ['#1B2A6B', '#FFFFFF'], KOR: ['#C60C30', '#003478'], THA: ['#241D4F', '#A51931'], SRB: ['#C6363C', '#0C4076'], FRA: ['#002654', '#ED2939'], ESP: ['#AA151B', '#F1BF00'], NGA: ['#008751', '#FFFFFF'], POR: ['#8B0000', '#006600'], NED: ['#FF6600', '#FFFFFF'], GER: ['#FFFFFF', '#000000'], BEL: ['#E30613', '#000000'], IRL: ['#169B62', '#FFFFFF'], SCO: ['#0065BF', '#FFFFFF'], WAL: ['#C8102E', '#00B140'], URU: ['#5CBFEB', '#000000'], COL: ['#FCD116', '#003893'], SEN: ['#FFFFFF', '#00853F'], GHA: ['#FFFFFF', '#006B3F'], CIV: ['#F77F00', '#009E60'], MAR: ['#C1272D', '#006233'], USA: ['#FFFFFF', '#0A3161'], DEN: ['#C8102E', '#FFFFFF'], NOR: ['#BA0C2F', '#00205B'], CRO: ['#FF0000', '#FFFFFF'], ITA: ['#0066B3', '#FFFFFF'] };

  FM.D.RIVALS = [
    ['MCI', 'MUN', 'Manchester Derby'], ['LIV', 'EVE', 'Merseyside Derby'], ['ARS', 'TOT', 'North London Derby'], ['CHE', 'FUL', 'West London Derby'],
    ['NEW', 'SUN', 'Tyne–Wear Derby'], ['AVL', 'BIR', 'Second City Derby'], ['NFO', 'DER', 'East Midlands Derby'], ['BHA', 'CRY', 'M23 Derby'],
    ['WHU', 'MIL', 'Dockers Derby'], ['WOL', 'WBA', 'Black Country Derby'], ['LEE', 'HUD', 'West Yorkshire Derby'], ['SOU', 'POM', 'South Coast Derby'],
    ['BRE', 'QPR', 'West London Derby'], ['BUR', 'BLB', 'East Lancashire Derby'], ['SHU', 'SHW', 'Steel City Derby'], ['IPS', 'NCI', 'East Anglian Derby'],
    ['LEI', 'COV', 'M69 Derby'], ['STK', 'PVA', 'Potteries Derby'], ['SWA', 'CAR', 'South Wales Derby'], ['PNE', 'BLP', 'West Lancashire Derby'],
    ['WAT', 'LUT', 'M1 Derby'], ['BWA', 'WIG', 'Lancashire Derby'], ['BNS', 'ROT', 'South Yorkshire Derby'], ['PLY', 'EXE', 'Devon Derby'],
    ['PBO', 'NTN', 'Nene Derby'], ['RMA', 'FCB', 'El Clásico'], ['ATM', 'GET', 'Derbi del Sur de Madrid'], ['ATH', 'RSO', 'Derbi vasco'],
    ['BET', 'SEV', 'Gran Derbi'], ['VAL', 'LEV', 'Derbi valenciano'], ['VIL', 'CAS', 'Derbi de La Plana'], ['CEL', 'DEP', 'Derbi gallego'],
    ['RCD', 'GIR', 'Derbi catalán'], ['OVI', 'SPG', 'Derbi asturiano'], ['RAY', 'LEG', 'Derbi del sur'], ['MAL', 'GRA', 'Derbi andaluz oriental'],
    ['LPA', 'TEN', 'Derbi canario'], ['ZAR', 'HUE', 'Derbi aragonés'], ['ALA', 'EIB', 'Derbi alavés-guipuzcoano'], ['VLD', 'BGS', 'Derbi castellano'],
    ['BAY', 'BVB', 'Der Klassiker'], ['B04', 'KOE', 'Rheinderby'], ['SVW', 'HSV', 'Nordderby'], ['SGE', 'M05', 'Rhein-Main-Derby'],
    ['VFB', 'SCF', 'Baden-Württemberg-Derby'], ['RBL', 'FCU', 'Ost-Derby'], ['PSG', 'OMA', 'Le Classique'], ['LIL', 'RCL', 'Derby du Nord'],
    ['NIC', 'ASM', 'Derby de la Côte d\'Azur'], ['REN', 'NAN', 'Derby de l\'Ouest'], ['OLY', 'STE', 'Derby du Rhône'], ['RCS', 'FCM', 'Derby de l\'Est'],
    ['SBR', 'LOR', 'Derby breton'], ['PFC', 'HAC', 'Derby de la Seine'], ['FLA', 'FLU', 'Fla-Flu'], ['PAL', 'COR', 'Derby Paulista'],
    ['GRE', 'SCI', 'Grenal'], ['CAM', 'CRU', 'Clássico Mineiro'], ['SAO', 'SAN', 'San-São'], ['BOT', 'VAS', 'Clássico da Amizade'],
    ['BAH', 'VIT', 'Ba-Vi'], ['FTZ', 'CEA', 'Clássico-Rei'], ['INT', 'ACM', 'Derby della Madonnina'], ['ROM', 'LAZ', 'Derby della Capitale'],
    ['JUV', 'TOR', 'Derby della Mole'], ['FIO', 'BOL', 'Derby dell\'Appennino'], ['GEN', 'PIS', 'Derby del Tirreno'], ['AJA', 'FEY', 'De Klassieker'],
    ['TWE', 'HER', 'Twentse derby'], ['GRO', 'HEE', 'Derby van het Noorden'], ['GAE', 'PEC', 'IJsselderby'], ['SPR', 'EXC', 'Rotterdamse derby'],
    ['BEN', 'SCP', 'Dérbi de Lisboa'], ['VSC', 'SCB', 'Dérbi do Minho'], ['RIV', 'BOC', 'Superclásico'], ['RAC', 'IND', 'Clásico de Avellaneda'],
    ['ROS', 'NOB', 'Clásico Rosarino'], ['SLO', 'HUR', 'Clásico de barrios'], ['ELP', 'GLP', 'Clásico Platense'], ['TAL', 'BEL', 'Clásico Cordobés'],
    ['LAN', 'BAN', 'Clásico del Sur'], ['GOD', 'IRI', 'Clásico Mendocino'], ['LAG', 'LAF', 'El Tráfico'], ['SEA', 'PTI', 'Cascadia Cup'],
    ['NYC', 'NYR', 'Hudson River Derby'], ['TRT', 'MTL', 'Canadian Classique'], ['HOU', 'DAL', 'Texas Derby'], ['RAP', 'RSL', 'Rocky Mountain Cup'],
    ['CIN', 'CLB', 'Hell Is Real'], ['ATL', 'ORL', 'Southern Derby'], ['GAM', 'CER', 'Osaka Derby'], ['YFM', 'KAW', 'Kanagawa Derby'],
    ['FCT', 'TVE', 'Tokyo Derby'], ['URA', 'KAS', 'Kanto Classico'], ['AME', 'CHV', 'Clásico Nacional'], ['MTY', 'TGR', 'Clásico Regiomontano'],
    ['CAZ', 'PUM', 'Clásico Capitalino'], ['ULS', 'POH', 'Donghae Derby'], ['SEO', 'ANY', 'Anyang–Seoul Derby'], ['BKU', 'PRT', 'Bangkok Derby'],
    ['ENY', 'RAN', 'Oriental Derby'], ['WAC', 'RCA', 'Derby de Casablanca'], ['FAR', 'FUS', 'Derby de Rabat'], ['MAT', 'IRT', 'Derby du Nord'],
    ['CZV', 'FKP', 'Večiti derbi'], ['VOJ', 'SPS', 'Vojvođanski derbi'],
  ];

  // Overseas clubs — "minimal simulation" tier: squads exist for scouting, no fixtures.
  FM.D.CLUBS_OVERSEAS = [
    ['AS Saint-Étienne', 'STE', 'FRA', '#009A44', '#FFFFFF', 62], ['Montpellier HSC', 'MHS', 'FRA', '#F58025', '#1B3A6B', 58],
    ['CD Tenerife', 'TEN', 'ESP', '#FFFFFF', '#0046AD', 52],
  ];

  FM.D.CHANTS = ['"We\'re the pride of {city}, we\'ll never be moved!"', '"{short} till I die!"', '"Oh {city}, we love you!"', '"Glory, glory {nick}!"', '"Stand up for the {nick}!"'];
  FM.D.TRADITIONS = ['Players walk out to a brass band', 'Fans hold up scarves for the anthem before kick-off', 'The home end sings through the whole 12th minute', 'A minute\'s applause for every departing legend', 'Tickets for kids cost £1 on derby day'];

  // Staff
  FM.D.STAFF_PERSONALITY = ['Pragmatic', 'Old-School', 'Innovative', 'Outspoken', 'Loyal', 'Cautious', 'Ambitious'];

  FM.D.WEATHER = [['Clear', '☀️', 0.55], ['Cloudy', '☁️', 0.2], ['Rain', '🌧️', 0.2], ['Snow', '❄️', 0.05]];

  FM.D.SEASON_START = 2026;
  FM.D.WINDOW_ROUNDS = [0, 1, 2, 3, 11, 12, 13]; // transfer window open around these league rounds
  FM.D.YOUTH_ROUND = 16;
  // Calendar: cup days slot in after these league rounds (0-based)
  FM.D.CUP_AFTER = { 1: 'DC', 4: 'DC', 7: 'DC', 11: 'DC', 15: 'DC', 19: 'DC' }; // six rounds: 36 English clubs need a first round
  // Knockout stages are two-legged when the world rule is on (QF1/QF2, SF1/SF2); otherwise the "2" days are dropped
  FM.D.CC_AFTER = { 2: 'G1', 5: 'G2', 8: 'G3', 10: 'G4', 13: 'G5', 16: 'G6', 17: 'QF1', 18: 'QF2', 19: 'SF1', 20: 'SF2', 21: 'F' };
  FM.D.CWC_AFTER = { 9: 'QF', 12: 'SF', 14: 'F' }; // Club World Cup, mid-season
  // Every international break has two matchdays
  FM.D.INTL_AFTER = { 7: ['I1a', 'I1b'], 15: ['I2a', 'I2b'] };
  // Wages were tuned against a 43-day season; longer calendars pay the same season total
  FM.D.WAGE_WEEKS = 43;

  // ---------- Alpha 1: Mexico ----------
  addN('MEX', 'Mexico', '🇲🇽', 'NAM', 'Quick, combative technicians', { technique: 1.5, pace: 1, workRate: 1 },
    'José Luis Carlos Juan Miguel Diego Jesús Héctor Andrés Edson Hirving Raúl Orbelín Uriel Alexis Santiago Érick César Julián Fernando Emilio Rodrigo Iván Gerardo Marco Víctor Omar Ángel',
    'Hernández, García, Martínez, López, González, Rodríguez, Sánchez, Ramírez, Cruz, Flores, Gómez, Morales, Vázquez, Reyes, Jiménez, Torres, Díaz, Gutiérrez, Ruiz, Mendoza, Aguilar, Ortiz, Castillo, Romero, Chávez, Rivera, Juárez, Domínguez, Vargas, Guzmán, Salazar, Esquivel, Orozco, Cervantes, Navarro, Montes');
  FM.D.NT_COLORS.MEX = ['#006847', '#FFFFFF'];
  FM.D.TWO_SURNAMES.push('MEX');

  // ---------- Alpha 1: the wider world in three simulation tiers ----------
  // full    — every match in the engine, finances, cups, transfers
  // light   — every fixture played, results from a fast statistical model with per-match player stats
  // minimal — fixtures produce scores only; squads exist for scouting and the market
  // Rows: [name, short, city, primary, secondary, identity, rep, stadium, capacity]
  FM.D.CLUBS_IT1 = [
    ['Inter', 'INT', 'Milan', '#0068A8', '#000000', 'giant', 86, 'San Siro', 75817],
    ['Juventus', 'JUV', 'Turin', '#FFFFFF', '#000000', 'giant', 84, 'Allianz Stadium', 41507],
    ['Napoli', 'NAP', 'Naples', '#12A0D7', '#FFFFFF', 'historic', 83, 'Stadio Diego Armando Maradona', 54726],
    ['AC Milan', 'ACM', 'Milan', '#FB090B', '#000000', 'giant', 82, 'San Siro', 75817],
    ['Atalanta', 'ATA', 'Bergamo', '#1E71B8', '#000000', 'selling', 78, 'Gewiss Stadium', 24950],
    ['AS Roma', 'ROM', 'Rome', '#8E1F2F', '#F0BC42', 'historic', 78, 'Stadio Olimpico', 70634],
    ['Lazio', 'LAZ', 'Rome', '#87D8F7', '#FFFFFF', 'historic', 74, 'Stadio Olimpico', 70634],
    ['Bologna', 'BOL', 'Bologna', '#A21C26', '#1A2F48', 'youth', 73, 'Stadio Renato Dall\'Ara', 36462],
    ['Fiorentina', 'FIO', 'Florence', '#482E92', '#FFFFFF', 'historic', 73, 'Stadio Artemio Franchi', 43147],
    ['Como', 'COM', 'Como', '#0E3E8C', '#FFFFFF', 'oil', 70, 'Stadio Giuseppe Sinigaglia', 13602],
    ['Torino', 'TOR', 'Turin', '#8A1E03', '#FFFFFF', 'historic', 66, 'Stadio Olimpico Grande Torino', 28177],
    ['Udinese', 'UDI', 'Udine', '#FFFFFF', '#000000', 'selling', 64, 'Bluenergy Stadium', 25144],
    ['Genoa', 'GEN', 'Genoa', '#A6192E', '#002E5D', 'fan', 64, 'Stadio Luigi Ferraris', 36599],
    ['Parma', 'PAR', 'Parma', '#FFFFFF', '#FFD100', 'fan', 62, 'Stadio Ennio Tardini', 22352],
    ['Cagliari', 'CAG', 'Cagliari', '#A6192E', '#002E5D', 'fan', 62, 'Unipol Domus', 16416],
    ['Sassuolo', 'SAS', 'Sassuolo', '#00A650', '#000000', 'youth', 61, 'Mapei Stadium', 21584],
    ['Hellas Verona', 'VER', 'Verona', '#FFD100', '#003DA5', 'youth', 60, 'Stadio Marcantonio Bentegodi', 39211],
    ['Lecce', 'LEC', 'Lecce', '#FFD100', '#E30613', 'youth', 60, 'Stadio Via del Mare', 31533],
    ['Cremonese', 'CRE', 'Cremona', '#E30613', '#9A9A9A', 'fan', 58, 'Stadio Giovanni Zini', 16003],
    ['Pisa', 'PIS', 'Pisa', '#000000', '#0033A0', 'fan', 58, 'Arena Garibaldi', 25000],
  ];
  FM.D.CLUBS_NL1 = [
    ['Ajax', 'AJA', 'Amsterdam', '#FFFFFF', '#D2122E', 'giant', 81, 'Johan Cruijff ArenA', 55865],
    ['PSV Eindhoven', 'PSV', 'Eindhoven', '#ED1C24', '#FFFFFF', 'historic', 80, 'Philips Stadion', 35119],
    ['Feyenoord', 'FEY', 'Rotterdam', '#FF0000', '#FFFFFF', 'fan', 79, 'De Kuip', 47500],
    ['AZ Alkmaar', 'AZA', 'Alkmaar', '#DB0021', '#FFFFFF', 'selling', 72, 'AFAS Stadion', 19478],
    ['FC Twente', 'TWE', 'Enschede', '#E30613', '#FFFFFF', 'historic', 68, 'De Grolsch Veste', 30205],
    ['FC Utrecht', 'UTR', 'Utrecht', '#E30613', '#FFFFFF', 'fan', 66, 'Stadion Galgenwaard', 23750],
    ['Go Ahead Eagles', 'GAE', 'Deventer', '#E30613', '#FFD100', 'fan', 62, 'De Adelaarshorst', 10400],
    ['NEC Nijmegen', 'NEC', 'Nijmegen', '#E30613', '#00843D', 'fan', 62, 'Goffertstadion', 12500],
    ['SC Heerenveen', 'HEE', 'Heerenveen', '#0055A4', '#FFFFFF', 'youth', 61, 'Abe Lenstra Stadion', 26100],
    ['FC Groningen', 'GRO', 'Groningen', '#008000', '#FFFFFF', 'historic', 60, 'Euroborg', 22525],
    ['Sparta Rotterdam', 'SPR', 'Rotterdam', '#E4002B', '#FFFFFF', 'youth', 58, 'Het Kasteel', 11026],
    ['PEC Zwolle', 'PEC', 'Zwolle', '#0055A4', '#FFFFFF', 'fan', 58, 'MAC³PARK Stadion', 14000],
    ['Fortuna Sittard', 'FSI', 'Sittard', '#FFD100', '#00843D', 'fan', 57, 'Fortuna Sittard Stadion', 12500],
    ['NAC Breda', 'NAC', 'Breda', '#FFD100', '#000000', 'fan', 57, 'Rat Verlegh Stadion', 19000],
    ['Heracles Almelo', 'HER', 'Almelo', '#000000', '#FFFFFF', 'fan', 56, 'Asito Stadion', 12080],
    ['FC Volendam', 'VOL', 'Volendam', '#FF7F00', '#000000', 'youth', 55, 'Kras Stadion', 7384],
    ['Excelsior', 'EXC', 'Rotterdam', '#E30613', '#000000', 'fan', 55, 'Van Donge & De Roo Stadion', 4500],
    ['Telstar', 'TEL', 'Velsen', '#FFFFFF', '#000000', 'fan', 54, 'BUKO Stadion', 5200],
  ];
  FM.D.CLUBS_PT1 = [
    ['Benfica', 'BEN', 'Lisbon', '#E30613', '#FFFFFF', 'giant', 83, 'Estádio da Luz', 64642],
    ['FC Porto', 'FCP', 'Porto', '#003893', '#FFFFFF', 'giant', 82, 'Estádio do Dragão', 50033],
    ['Sporting CP', 'SCP', 'Lisbon', '#008057', '#FFFFFF', 'historic', 82, 'Estádio José Alvalade', 50095],
    ['SC Braga', 'SCB', 'Braga', '#E30613', '#FFFFFF', 'selling', 74, 'Estádio Municipal de Braga', 30286],
    ['Vitória de Guimarães', 'VSC', 'Guimarães', '#FFFFFF', '#000000', 'fan', 66, 'Estádio D. Afonso Henriques', 30029],
    ['Santa Clara', 'SCL', 'Ponta Delgada', '#E30613', '#FFFFFF', 'fan', 60, 'Estádio de São Miguel', 13277],
    ['Famalicão', 'FAM', 'Vila Nova de Famalicão', '#FFFFFF', '#003DA5', 'selling', 60, 'Estádio Municipal 22 de Junho', 5307],
    ['Estoril Praia', 'EST', 'Estoril', '#FFDD00', '#0038A8', 'youth', 60, 'Estádio António Coimbra da Mota', 8000],
    ['Gil Vicente', 'GIL', 'Barcelos', '#E30613', '#003DA5', 'fan', 58, 'Estádio Cidade de Barcelos', 12046],
    ['Arouca', 'ARO', 'Arouca', '#FFD100', '#0033A0', 'fan', 58, 'Estádio Municipal de Arouca', 5600],
    ['Rio Ave', 'RAV', 'Vila do Conde', '#00843D', '#FFFFFF', 'oil', 57, 'Estádio dos Arcos', 9065],
    ['Moreirense', 'MOR', 'Moreira de Cónegos', '#00843D', '#FFFFFF', 'fan', 57, 'Parque de Jogos Comendador Joaquim de Almeida Freitas', 6153],
    ['Casa Pia', 'CPI', 'Lisbon', '#000000', '#FFFFFF', 'fan', 57, 'Estádio Pina Manique', 3000],
    ['Nacional', 'CDN', 'Funchal', '#000000', '#FFFFFF', 'historic', 55, 'Estádio da Madeira', 5132],
    ['AVS', 'AVS', 'Vila das Aves', '#E30613', '#FFFFFF', 'fan', 54, 'Estádio do CD Aves', 8560],
    ['Estrela da Amadora', 'EAM', 'Amadora', '#E30613', '#00843D', 'fan', 54, 'Estádio José Gomes', 9288],
    ['Alverca', 'ALV', 'Alverca do Ribatejo', '#E30613', '#FFFFFF', 'selling', 54, 'Complexo Desportivo do FC Alverca', 7705],
    ['Tondela', 'TON', 'Tondela', '#FFD100', '#00843D', 'fan', 53, 'Estádio João Cardoso', 5000],
  ];
  FM.D.CLUBS_AR1 = [
    ['River Plate', 'RIV', 'Buenos Aires', '#FFFFFF', '#E30613', 'giant', 79, 'Estadio Monumental', 85018],
    ['Boca Juniors', 'BOC', 'Buenos Aires', '#0033A0', '#FFD100', 'giant', 78, 'La Bombonera', 54000],
    ['Racing Club', 'RAC', 'Avellaneda', '#6CACE4', '#FFFFFF', 'historic', 70, 'Estadio Presidente Perón', 51389],
    ['Independiente', 'IND', 'Avellaneda', '#E30613', '#FFFFFF', 'fallen', 67, 'Estadio Libertadores de América', 48069],
    ['Estudiantes', 'ELP', 'La Plata', '#E30613', '#FFFFFF', 'youth', 66, 'Estadio Jorge Luis Hirschi', 30018],
    ['San Lorenzo', 'SLO', 'Buenos Aires', '#0033A0', '#E30613', 'historic', 65, 'Estadio Pedro Bidegain', 47964],
    ['Vélez Sarsfield', 'VEL', 'Buenos Aires', '#FFFFFF', '#0033A0', 'youth', 64, 'Estadio José Amalfitani', 49540],
    ['Talleres', 'TAL', 'Córdoba', '#0033A0', '#FFFFFF', 'selling', 63, 'Estadio Mario Alberto Kempes', 57000],
    ['Rosario Central', 'ROS', 'Rosario', '#003DA5', '#FFD100', 'fan', 63, 'Gigante de Arroyito', 41654],
    ['Lanús', 'LAN', 'Lanús', '#8A1538', '#FFFFFF', 'selling', 63, 'Estadio Ciudad de Lanús', 47027],
    ['Argentinos Juniors', 'ARJ', 'Buenos Aires', '#E30613', '#FFFFFF', 'youth', 62, 'Estadio Diego Armando Maradona', 26000],
    ['Newell\'s Old Boys', 'NOB', 'Rosario', '#E30613', '#000000', 'fan', 61, 'Estadio Marcelo Bielsa', 42000],
    ['Huracán', 'HUR', 'Buenos Aires', '#FFFFFF', '#E30613', 'fan', 60, 'Estadio Tomás Adolfo Ducó', 48314],
    ['Defensa y Justicia', 'DYJ', 'Florencio Varela', '#FFD100', '#00843D', 'selling', 60, 'Estadio Norberto Tomaghello', 20000],
    ['Belgrano', 'BEL', 'Córdoba', '#6CACE4', '#FFFFFF', 'fan', 60, 'Estadio Julio César Villagra', 30000],
    ['Gimnasia y Esgrima La Plata', 'GLP', 'La Plata', '#FFFFFF', '#1B2C5A', 'fan', 58, 'Estadio Juan Carmelo Zerillo', 24544],
    ['Godoy Cruz', 'GOD', 'Mendoza', '#0033A0', '#FFFFFF', 'youth', 58, 'Estadio Malvinas Argentinas', 42000],
    ['Tigre', 'TIG', 'Victoria', '#0033A0', '#E30613', 'fan', 57, 'Estadio José Dellagiovanna', 26282],
    ['Unión', 'UNI', 'Santa Fe', '#E30613', '#FFFFFF', 'fan', 57, 'Estadio 15 de Abril', 22852],
    ['Instituto', 'INS', 'Córdoba', '#E30613', '#FFFFFF', 'fan', 57, 'Estadio Juan Domingo Perón', 26535],
    ['Banfield', 'BAN', 'Banfield', '#00843D', '#FFFFFF', 'youth', 57, 'Estadio Florencio Sola', 34901],
    ['Independiente Rivadavia', 'IRI', 'Mendoza', '#0033A0', '#FFFFFF', 'fan', 56, 'Estadio Bautista Gargantini', 24000],
    ['Atlético Tucumán', 'ATU', 'San Miguel de Tucumán', '#6CACE4', '#FFFFFF', 'fan', 56, 'Estadio Monumental José Fierro', 35200],
    ['Platense', 'PLA', 'Vicente López', '#FFFFFF', '#6B3F1F', 'fan', 56, 'Estadio Ciudad de Vicente López', 28530],
    ['Barracas Central', 'BAR', 'Buenos Aires', '#E30613', '#FFFFFF', 'fan', 55, 'Estadio Claudio Chiqui Tapia', 4500],
    ['Central Córdoba', 'CCD', 'Santiago del Estero', '#000000', '#FFFFFF', 'fan', 55, 'Estadio Único Madre de Ciudades', 30000],
    ['Sarmiento', 'SAR', 'Junín', '#00843D', '#FFFFFF', 'fan', 54, 'Estadio Eva Perón', 22000],
    ['Deportivo Riestra', 'RIE', 'Buenos Aires', '#000000', '#FFFFFF', 'fan', 53, 'Estadio Guillermo Laza', 3000],
  ];
  FM.D.CLUBS_US1 = [
    ['Inter Miami', 'MIA', 'Miami', '#F7B5CD', '#231F20', 'oil', 67, 'Chase Stadium', 21550],
    ['Los Angeles FC', 'LAF', 'Los Angeles', '#000000', '#C39E6D', 'oil', 66, 'BMO Stadium', 22000],
    ['LA Galaxy', 'LAG', 'Los Angeles', '#FFFFFF', '#00245D', 'historic', 65, 'Dignity Health Sports Park', 27000],
    ['Seattle Sounders', 'SEA', 'Seattle', '#5D9741', '#005595', 'fan', 64, 'Lumen Field', 37722],
    ['FC Cincinnati', 'CIN', 'Cincinnati', '#003087', '#FE5000', 'youth', 63, 'TQL Stadium', 26000],
    ['Columbus Crew', 'CLB', 'Columbus', '#FEDD00', '#000000', 'historic', 62, 'Lower.com Field', 20371],
    ['Philadelphia Union', 'PHI', 'Philadelphia', '#071B2C', '#B19B69', 'youth', 62, 'Subaru Park', 18500],
    ['New York City FC', 'NYC', 'New York', '#6CACE4', '#041E42', 'oil', 62, 'Yankee Stadium', 28743],
    ['Atlanta United', 'ATL', 'Atlanta', '#80000A', '#A19060', 'fan', 61, 'Mercedes-Benz Stadium', 42500],
    ['New York Red Bulls', 'NYR', 'New York', '#FFFFFF', '#BA0C2F', 'oil', 60, 'Sports Illustrated Stadium', 25000],
    ['Nashville SC', 'NSH', 'Nashville', '#ECE83A', '#1F1646', 'fan', 60, 'Geodis Park', 30000],
    ['Orlando City', 'ORL', 'Orlando', '#633492', '#FDE192', 'fan', 60, 'Inter&Co Stadium', 25500],
    ['Vancouver Whitecaps', 'VAN', 'Vancouver', '#FFFFFF', '#00245E', 'youth', 60, 'BC Place', 22120],
    ['Portland Timbers', 'PTI', 'Portland', '#00482B', '#D69A00', 'fan', 59, 'Providence Park', 25218],
    ['Minnesota United', 'MIN', 'Saint Paul', '#585958', '#8CD2F4', 'fan', 58, 'Allianz Field', 19400],
    ['San Diego FC', 'SDG', 'San Diego', '#1B1F23', '#6E4C9F', 'oil', 58, 'Snapdragon Stadium', 35000],
    ['Real Salt Lake', 'RSL', 'Salt Lake City', '#B30838', '#013A81', 'youth', 58, 'America First Field', 20213],
    ['FC Dallas', 'DAL', 'Dallas', '#E81F3E', '#2A4076', 'youth', 58, 'Toyota Stadium', 20500],
    ['Charlotte FC', 'CLT', 'Charlotte', '#1A85C8', '#000000', 'fan', 57, 'Bank of America Stadium', 38000],
    ['Houston Dynamo', 'HOU', 'Houston', '#FF6B00', '#101820', 'fan', 57, 'Shell Energy Stadium', 22039],
    ['Sporting Kansas City', 'SKC', 'Kansas City', '#91B0D5', '#002F65', 'fan', 57, 'Children\'s Mercy Park', 18467],
    ['St. Louis City SC', 'STL', 'St. Louis', '#DD004A', '#0A1E2C', 'fan', 57, 'Energizer Park', 22423],
    ['Colorado Rapids', 'RAP', 'Denver', '#960A2C', '#9CC2EA', 'youth', 56, 'Dick\'s Sporting Goods Park', 18061],
    ['Austin FC', 'AUS', 'Austin', '#00B140', '#000000', 'fan', 56, 'Q2 Stadium', 20738],
    ['Chicago Fire', 'CHI', 'Chicago', '#7CCDEF', '#FF0000', 'fan', 56, 'Soldier Field', 61500],
    ['D.C. United', 'DCU', 'Washington', '#000000', '#EF3E42', 'fan', 56, 'Audi Field', 20000],
    ['New England Revolution', 'NER', 'Foxborough', '#0A2240', '#CE0E2D', 'fan', 56, 'Gillette Stadium', 65878],
    ['Toronto FC', 'TRT', 'Toronto', '#B81137', '#455560', 'fan', 57, 'BMO Field', 30991],
    ['CF Montréal', 'MTL', 'Montreal', '#000000', '#0033A1', 'fan', 55, 'Stade Saputo', 19619],
    ['San Jose Earthquakes', 'SJE', 'San Jose', '#0067B1', '#000000', 'fan', 55, 'PayPal Park', 18000],
  ];
  FM.D.CLUBS_JP1 = [
    ['Vissel Kobe', 'VIS', 'Kobe', '#8B0000', '#FFFFFF', 'oil', 64, 'Noevir Stadium Kobe', 30132],
    ['Kashima Antlers', 'KAS', 'Kashima', '#B8002D', '#1D2088', 'historic', 64, 'Kashima Soccer Stadium', 40728],
    ['Urawa Red Diamonds', 'URA', 'Saitama', '#E60012', '#000000', 'giant', 63, 'Saitama Stadium 2002', 63700],
    ['Sanfrecce Hiroshima', 'SFH', 'Hiroshima', '#50318F', '#FFFFFF', 'youth', 63, 'Edion Peace Wing Hiroshima', 28520],
    ['Kawasaki Frontale', 'KAW', 'Kawasaki', '#1E90FF', '#000000', 'historic', 62, 'Todoroki Stadium', 26827],
    ['Yokohama F. Marinos', 'YFM', 'Yokohama', '#0033A0', '#FFFFFF', 'historic', 61, 'Nissan Stadium', 72327],
    ['Gamba Osaka', 'GAM', 'Osaka', '#1A3D8F', '#000000', 'historic', 60, 'Panasonic Stadium Suita', 39694],
    ['FC Machida Zelvia', 'MAC', 'Machida', '#002E6E', '#C8A200', 'oil', 60, 'Machida GION Stadium', 15489],
    ['FC Tokyo', 'FCT', 'Tokyo', '#0033A0', '#E60012', 'fan', 60, 'Ajinomoto Stadium', 49970],
    ['Kashiwa Reysol', 'KSW', 'Kashiwa', '#FFF000', '#000000', 'selling', 58, 'Sankyo Frontier Kashiwa Stadium', 15109],
    ['Nagoya Grampus', 'NAG', 'Nagoya', '#D6000F', '#F9A61A', 'fan', 58, 'Toyota Stadium', 44380],
    ['Cerezo Osaka', 'CER', 'Osaka', '#EC6A9E', '#0A1F5C', 'historic', 58, 'Yodoko Sakura Stadium', 24481],
    ['Avispa Fukuoka', 'AVI', 'Fukuoka', '#1C1C7C', '#AAAAAA', 'youth', 56, 'Best Denki Stadium', 21562],
    ['Kyoto Sanga', 'KYO', 'Kyoto', '#6A1B9A', '#FFFFFF', 'fan', 56, 'Sanga Stadium by Kyocera', 21600],
    ['Albirex Niigata', 'NII', 'Niigata', '#FF6600', '#003DA5', 'youth', 55, 'Denka Big Swan Stadium', 42300],
    ['Shonan Bellmare', 'SBM', 'Hiratsuka', '#8CC63F', '#003DA5', 'youth', 55, 'Lemon Gas Stadium Hiratsuka', 15380],
    ['Tokyo Verdy', 'TVE', 'Tokyo', '#00843D', '#FFFFFF', 'fan', 55, 'Ajinomoto Stadium', 49970],
    ['Shimizu S-Pulse', 'SHI', 'Shizuoka', '#FF8200', '#003DA5', 'fan', 55, 'IAI Stadium Nihondaira', 19594],
    ['Fagiano Okayama', 'OKA', 'Okayama', '#9E1B32', '#FFFFFF', 'fan', 53, 'JFE Harenokuni Stadium', 15479],
    ['Yokohama FC', 'YFC', 'Yokohama', '#00A0E9', '#FFFFFF', 'fan', 53, 'NHK Spring Mitsuzawa Football Stadium', 15440],
  ];
  // Minimal tier (8 clubs): [name, short, city, primary, secondary, identity, rep]
  FM.D.CLUBS_MX1 = [
    ['Club América', 'AME', 'Mexico City', '#FFE600', '#0A1F5C', 'giant', 70], ['CF Monterrey', 'MTY', 'Monterrey', '#0B2240', '#FFFFFF', 'oil', 68],
    ['Tigres UANL', 'TGR', 'San Nicolás de los Garza', '#FDB913', '#003DA5', 'oil', 68], ['Guadalajara', 'CHV', 'Guadalajara', '#E30613', '#FFFFFF', 'historic', 67],
    ['Cruz Azul', 'CAZ', 'Mexico City', '#0033A0', '#FFFFFF', 'historic', 66], ['Toluca', 'TOL', 'Toluca', '#E30613', '#FFFFFF', 'fan', 64],
    ['Pumas UNAM', 'PUM', 'Mexico City', '#0B2240', '#C5A45A', 'youth', 63], ['Pachuca', 'PAC', 'Pachuca', '#FFFFFF', '#0033A0', 'selling', 63],
    ['Club León', 'LEO', 'León', '#00843D', '#FFFFFF', 'selling', 62], ['Santos Laguna', 'SLA', 'Torreón', '#00843D', '#FFFFFF', 'youth', 60],
    ['Atlas', 'ATS', 'Guadalajara', '#E30613', '#000000', 'fan', 60], ['Tijuana', 'TIJ', 'Tijuana', '#E30613', '#000000', 'fan', 58],
    ['Necaxa', 'NCX', 'Aguascalientes', '#E30613', '#FFFFFF', 'fan', 57], ['Querétaro', 'QRO', 'Querétaro', '#0033A0', '#000000', 'fan', 56],
    ['Puebla', 'PUE', 'Puebla', '#FFFFFF', '#0033A0', 'fan', 56], ['FC Juárez', 'JUA', 'Ciudad Juárez', '#00843D', '#E30613', 'fan', 56],
    ['Atlético San Luis', 'ASL', 'San Luis Potosí', '#E30613', '#003DA5', 'fan', 56], ['Mazatlán', 'MAZ', 'Mazatlán', '#6A1B9A', '#FFFFFF', 'fan', 55],
  ];
  FM.D.CLUBS_NG1 = [
    ['Enyimba', 'ENY', 'Aba', '#003DA5', '#FFFFFF', 'giant', 55], ['Enugu Rangers', 'RAN', 'Enugu', '#E30613', '#FFFFFF', 'historic', 52],
    ['Rivers United', 'RVU', 'Port Harcourt', '#0369A1', '#F59E0B', 'oil', 52], ['Remo Stars', 'REM', 'Ikenne', '#15803D', '#FFFFFF', 'selling', 51],
    ['Kano Pillars', 'KPI', 'Kano', '#FFD100', '#006400', 'historic', 51], ['Shooting Stars', 'SSC', 'Ibadan', '#003DA5', '#FFFFFF', 'fan', 49],
    ['Lobi Stars', 'LOB', 'Makurdi', '#E30613', '#FFFFFF', 'fan', 48], ['Plateau United', 'PLU', 'Jos', '#E30613', '#FFD100', 'youth', 48],
    ['Bendel Insurance', 'BDI', 'Benin City', '#003DA5', '#FFFFFF', 'historic', 47], ['Heartland', 'HRT', 'Owerri', '#E30613', '#FFFFFF', 'historic', 47],
    ['Ikorodu City', 'IKC', 'Ikorodu', '#003DA5', '#FFD100', 'oil', 47], ['Abia Warriors', 'ABW', 'Umuahia', '#00843D', '#FFD100', 'fan', 47],
    ['Akwa United', 'AKW', 'Uyo', '#003DA5', '#FFFFFF', 'fan', 47], ['Kwara United', 'KWU', 'Ilorin', '#00843D', '#FFFFFF', 'fan', 46],
    ['Nasarawa United', 'NSU', 'Lafia', '#FFD100', '#00843D', 'fan', 46], ['Niger Tornadoes', 'NIT', 'Minna', '#FFD100', '#003DA5', 'fan', 46],
    ['Bayelsa United', 'BYU', 'Yenagoa', '#003DA5', '#E30613', 'fan', 46], ['El-Kanemi Warriors', 'EKW', 'Maiduguri', '#00843D', '#FFFFFF', 'fan', 46],
    ['Katsina United', 'KTU', 'Katsina', '#E30613', '#00843D', 'fan', 45], ['Sunshine Stars', 'SUS', 'Akure', '#FFD100', '#003DA5', 'fan', 45],
  ];
  FM.D.CLUBS_KR1 = [
    ['Ulsan HD', 'ULS', 'Ulsan', '#003DA5', '#FFD100', 'oil', 60], ['Jeonbuk Hyundai Motors', 'JBH', 'Jeonju', '#00843D', '#FFD100', 'giant', 60],
    ['Pohang Steelers', 'POH', 'Pohang', '#E30613', '#000000', 'historic', 57], ['FC Seoul', 'SEO', 'Seoul', '#E30613', '#000000', 'historic', 57],
    ['Daejeon Hana Citizen', 'DJN', 'Daejeon', '#6A1B9A', '#00843D', 'oil', 55], ['Gwangju FC', 'GWA', 'Gwangju', '#FFD100', '#E30613', 'youth', 54],
    ['Gangwon FC', 'GAN', 'Chuncheon', '#FF7F00', '#003DA5', 'fan', 53], ['Gimcheon Sangmu', 'GIM', 'Gimcheon', '#E30613', '#003DA5', 'fan', 53],
    ['Jeju SK', 'JEJ', 'Jeju', '#FF6600', '#000000', 'fan', 52], ['Daegu FC', 'DGU', 'Daegu', '#87CEEB', '#1C2B4F', 'youth', 52],
    ['Suwon FC', 'SUW', 'Suwon', '#E30613', '#003DA5', 'fan', 52], ['FC Anyang', 'ANY', 'Anyang', '#5B2C83', '#FFFFFF', 'fan', 51],
  ];
  FM.D.CLUBS_TH1 = [
    ['Buriram United', 'BRU', 'Buriram', '#003DA5', '#FFD100', 'oil', 56], ['BG Pathum United', 'BGP', 'Pathum Thani', '#0A1E5E', '#FFFFFF', 'oil', 52],
    ['Bangkok United', 'BKU', 'Bangkok', '#E30613', '#FFFFFF', 'historic', 51], ['Port FC', 'PRT', 'Bangkok', '#FF7F00', '#003DA5', 'fan', 50],
    ['Muangthong United', 'MTU', 'Nonthaburi', '#E30613', '#000000', 'historic', 50], ['Chiangrai United', 'CRA', 'Chiang Rai', '#003DA5', '#FFFFFF', 'youth', 48],
    ['Chonburi FC', 'CHB', 'Chonburi', '#0055A4', '#FFFFFF', 'historic', 48], ['Ratchaburi FC', 'RAT', 'Ratchaburi', '#E30613', '#FFD100', 'youth', 47],
    ['Uthai Thani', 'UTH', 'Uthai Thani', '#FF7F00', '#000000', 'fan', 46], ['Prachuap FC', 'PRA', 'Prachuap Khiri Khan', '#E30613', '#FFFFFF', 'fan', 46],
    ['Sukhothai FC', 'SKT', 'Sukhothai', '#FFD100', '#000000', 'fan', 46], ['Kanchanaburi Power', 'KBP', 'Kanchanaburi', '#003DA5', '#E30613', 'oil', 46],
    ['Lamphun Warriors', 'LPW', 'Lamphun', '#6A1B9A', '#FFFFFF', 'fan', 45], ['Ayutthaya United', 'AYU', 'Ayutthaya', '#E30613', '#FFFFFF', 'fan', 45],
    ['Rayong FC', 'RYG', 'Rayong', '#003DA5', '#FFFFFF', 'fan', 44], ['Nakhon Ratchasima', 'NRS', 'Nakhon Ratchasima', '#FF7F00', '#6A1B9A', 'fan', 44],
  ];
  FM.D.CLUBS_RS1 = [
    ['Red Star Belgrade', 'CZV', 'Belgrade', '#E30613', '#FFFFFF', 'giant', 64], ['Partizan', 'FKP', 'Belgrade', '#000000', '#FFFFFF', 'giant', 61],
    ['Vojvodina', 'VOJ', 'Novi Sad', '#E30613', '#FFFFFF', 'historic', 57], ['TSC Bačka Topola', 'TSC', 'Bačka Topola', '#003DA5', '#FFFFFF', 'oil', 56],
    ['Čukarički', 'CUK', 'Belgrade', '#000000', '#FFD100', 'youth', 53], ['Radnički 1923', 'RAD', 'Kragujevac', '#E30613', '#FFFFFF', 'fan', 53],
    ['Novi Pazar', 'NPZ', 'Novi Pazar', '#E30613', '#FFFFFF', 'fan', 52], ['OFK Beograd', 'OFK', 'Belgrade', '#003DA5', '#FFFFFF', 'historic', 51],
    ['IMT Novi Beograd', 'IMT', 'Belgrade', '#1F2937', '#E5E7EB', 'youth', 50], ['Spartak Subotica', 'SPS', 'Subotica', '#003DA5', '#FFFFFF', 'fan', 50],
    ['Radnički Niš', 'RNI', 'Niš', '#E30613', '#003DA5', 'fan', 50], ['Železničar Pančevo', 'ZEL', 'Pančevo', '#003DA5', '#FFFFFF', 'fan', 49],
    ['Napredak Kruševac', 'NKR', 'Kruševac', '#E30613', '#FFFFFF', 'fan', 49], ['Mladost Lučani', 'MLU', 'Lučani', '#E30613', '#FFFFFF', 'fan', 48],
    ['Jedinstvo Ub', 'JUB', 'Ub', '#003DA5', '#FFFFFF', 'fan', 46], ['Tekstilac Odžaci', 'TEK', 'Odžaci', '#00843D', '#FFFFFF', 'fan', 46],
  ];
  FM.D.CLUBS_MA1 = [
    ['Wydad Casablanca', 'WAC', 'Casablanca', '#E30613', '#FFFFFF', 'giant', 59], ['Raja Casablanca', 'RCA', 'Casablanca', '#00843D', '#FFFFFF', 'giant', 59],
    ['AS FAR', 'FAR', 'Rabat', '#E30613', '#000000', 'historic', 57], ['RS Berkane', 'RSB', 'Berkane', '#FF7F00', '#000000', 'oil', 56],
    ['FUS Rabat', 'FUS', 'Rabat', '#003DA5', '#FFFFFF', 'youth', 54], ['Maghreb Fès', 'MAS', 'Fès', '#FFD100', '#000000', 'historic', 52],
    ['Hassania Agadir', 'HAG', 'Agadir', '#E30613', '#FFD100', 'fan', 50], ['Ittihad Tanger', 'IRT', 'Tangier', '#003DA5', '#FFFFFF', 'youth', 50],
    ['Moghreb Tétouan', 'MAT', 'Tétouan', '#E30613', '#FFFFFF', 'historic', 49], ['Olympic Safi', 'OCS', 'Safi', '#003DA5', '#FFFFFF', 'fan', 48],
    ['Difaâ El Jadidi', 'DHJ', 'El Jadida', '#00843D', '#FFFFFF', 'fan', 48], ['Renaissance Zemamra', 'RSZ', 'Zemamra', '#00843D', '#FFFFFF', 'fan', 47],
    ['Union Touarga', 'UTS', 'Rabat', '#FF7F00', '#000000', 'fan', 47], ['CODM Meknès', 'COD', 'Meknès', '#E30613', '#00843D', 'fan', 47],
    ['Chabab Mohammédia', 'SCC', 'Mohammédia', '#E30613', '#000000', 'fan', 46], ['JS Soualem', 'JSS', 'Soualem', '#003DA5', '#FFFFFF', 'fan', 46],
  ];

  // ---------- More nations: the next European leagues by coefficient ----------
  addN('TUR', 'Turkey', '🇹🇷', 'EUR', 'Passionate, direct and aggressive', { workRate: 1.5, strength: 1, dribbling: 1 },
    'Emre Burak Mert Can Arda Kerem Oğuz Barış Cengiz Hakan Ozan Yusuf Berkay Serdar Umut Ömer Kaan Efe Alper Onur Tolga Cenk Volkan Egemen Selim Furkan Batuhan Enes Doğukan Halil Semih Kerim Ahmet Mehmet Ali Deniz Tuna Uğur Eren Irfan',
    'Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Yıldırım, Öztürk, Aydın, Özdemir, Arslan, Doğan, Kılıç, Aslan, Çetin, Kara, Koç, Kurt, Özkan, Şimşek, Polat, Korkmaz, Karaca, Erdem, Güneş, Aktaş, Bulut, Keskin, Ünal, Tekin, Akın, Uçar, Gül, Avcı, Taş, Sarı, Coşkun, Bozkurt, Kaplan, Özer, Tunç, Durmaz, Başaran, Karagöz, Ekici, Ateş, Işık, Soylu');
  addN('CZE', 'Czechia', '🇨🇿', 'EUR', 'Industrious and well-drilled', { workRate: 1.5, positioning: 1, stamina: 1 },
    'Jan Jakub Tomáš Lukáš Ondřej Adam Matěj Filip Vojtěch David Petr Martin Michal Pavel Daniel Václav Josef Radim Tadeáš Šimon Dominik Marek Vladimír Antonín Štěpán Jiří Roman Aleš Libor Patrik Denis Robin Kryštof Vít Zdeněk Karel Hynek Mojmír Dalibor Bořek',
    'Novák, Svoboda, Novotný, Dvořák, Černý, Procházka, Kučera, Veselý, Horák, Němec, Pokorný, Marek, Pospíšil, Hájek, Jelínek, Král, Růžička, Beneš, Fiala, Sedláček, Doležal, Zeman, Kolář, Navrátil, Čermák, Urban, Vaněk, Blažek, Kříž, Kovář, Bartoš, Vlček, Polák, Musil, Kopecký, Šimek, Konečný, Malý, Holub, Štěpánek, Kadlec, Staněk, Soukup, Holý, Bureš, Jaroš, Richter, Moravec');
  addN('GRE', 'Greece', '🇬🇷', 'EUR', 'Organised, resilient defenders', { positioning: 1.5, tackling: 1.5, strength: 1 },
    'Giorgos Dimitris Nikos Kostas Giannis Christos Vasilis Panagiotis Thanasis Michalis Stelios Sotiris Antonis Manolis Lefteris Apostolos Charalampos Konstantinos Alexandros Stavros Spyros Andreas Petros Pavlos Ilias Theodoros Fotis Marios Anastasios Evangelos Tasos Vangelis Lazaros Savvas Aris Achilleas Zisis Orestis Anestis Prodromos',
    'Papadopoulos, Papadakis, Georgiou, Oikonomou, Pappas, Vlachos, Nikolaidis, Dimitriou, Konstantinidis, Karagiannis, Athanasiou, Christodoulou, Ioannidis, Makris, Vasileiou, Antoniou, Papanikolaou, Alexiou, Stavrou, Kyriakidis, Theodorou, Michailidis, Economou, Lazaridis, Panagiotou, Spanos, Katsaros, Mavridis, Tsakalos, Zervas, Anagnostou, Sotiriou, Galanis, Petridis, Chatzis, Rigas, Voulgaris, Kontos, Tzavaras, Liakos, Marinos, Kalogeropoulos, Lamprou');
  addN('POL', 'Poland', '🇵🇱', 'EUR', 'Strong, honest and direct', { strength: 1.5, workRate: 1.5, finishing: 1 },
    'Jakub Kacper Szymon Mateusz Bartosz Kamil Michał Paweł Piotr Krzysztof Tomasz Łukasz Dawid Adrian Marcin Patryk Damian Sebastian Przemysław Grzegorz Wojciech Maciej Filip Karol Hubert Oskar Igor Mikołaj Dominik Antoni Wiktor Jan Adam Konrad Rafał Arkadiusz Norbert Kornel Bartłomiej Radosław',
    'Nowak, Kowalski, Wiśniewski, Wójcik, Kowalczyk, Kamiński, Lewandowicz, Zieliński, Szymański, Woźniak, Dąbrowski, Kozłowski, Jankowski, Mazur, Kwiatkowski, Krawczyk, Kaczmarek, Piotrowski, Grabowski, Zając, Pawłowski, Michalski, Król, Wieczorek, Jabłoński, Wróbel, Nowakowski, Majewski, Olszewski, Stępień, Malinowski, Jaworski, Adamczyk, Dudek, Nowicki, Pawlak, Górski, Witkowski, Walczak, Sikora, Baran, Rutkowski, Michalak, Szewczyk, Ostrowski, Tomaszewski, Pietrzak, Duda');
  addN('AUT', 'Austria', '🇦🇹', 'EUR', 'High-energy pressers', { workRate: 2, stamina: 1.5, pace: 0.5 },
    'Lukas David Florian Tobias Julian Stefan Christoph Dominik Philipp Matthias Andreas Michael Patrick Alexander Marco Kevin Fabian Maximilian Simon Sebastian Raphael Nicolas Konrad Leopold Valentin Moritz Jakob Elias Felix Samuel Benedikt Lorenz Clemens Paul Nico Marcel Manuel Thomas Georg Severin',
    'Gruber, Huber, Bauer, Wagner, Müller, Pichler, Steiner, Moser, Mayer, Hofer, Leitner, Berger, Fuchs, Eder, Fischer, Schmid, Winkler, Weber, Schwarz, Maier, Schneider, Reiter, Mayr, Schmidt, Wimmer, Egger, Brunner, Lang, Baumgartner, Auer, Binder, Lechner, Wolf, Wallner, Aigner, Ebner, Koller, Lehner, Haas, Schuster, Holzer, Kogler, Resch, Strasser, Pölzl, Grill, Posch, Seidl');
  addN('SUI', 'Switzerland', '🇨🇭', 'EUR', 'Tidy, versatile and composed', { composure: 1.5, passing: 1, positioning: 1 },
    'Luca Noah Leon Nico Jan Fabian Kevin Yannick Cédric Florian Joël Silvan Remo Dario Marco Loris Nils Andrin Gian Ramon Mauro Samuel Timo Reto Beat Michel Simon Jonas Elias Lars Levin Aurèle Matteo Bastien Gaël Théo Kilian Ruben Dominik Pascal',
    'Müller, Meier, Schmid, Keller, Weber, Huber, Schneider, Meyer, Steiner, Fischer, Gerber, Brunner, Baumann, Frei, Zimmermann, Moser, Widmer, Wyss, Graf, Roth, Suter, Baumgartner, Kälin, Bühler, Aebischer, Zbinden, Marti, Lüthi, Gisler, Egli, Imhof, Studer, Ammann, Hofmann, Kunz, Blaser, Bachmann, Hess, Rossier, Favre, Perrin, Bonvin, Morand, Rochat, Chappuis, Bernasconi, Rossi, Bianchi');
  Object.assign(FM.D.NT_COLORS, { TUR: ['#E30A17', '#FFFFFF'], CZE: ['#D7141A', '#11457E'], GRE: ['#0D5EAF', '#FFFFFF'], POL: ['#FFFFFF', '#DC143C'], AUT: ['#ED2939', '#FFFFFF'], SUI: ['#D52B1E', '#FFFFFF'] });
  // ---------- Bigger name pools: more combinations, fewer repeats across a 10,000-player world ----------
  FM.D.addNames = (c, fn, ln) => { const N = FM.D.NATIONS[c]; fn.split(' ').forEach((x) => x && !N.fn.includes(x) && N.fn.push(x)); ln.split(',').map((x) => x.trim()).forEach((x) => x && !N.ln.includes(x) && N.ln.push(x)); };
  FM.D.addNames('ENG', 'Josh Adam Liam Max Leo Oscar Freddie Harvey Louis Toby Finley Henry Jake Theo Bradley Craig Dean Elliot Ellis Gary Jason Josh Kai Kieran Lee Matt Neil Owen Paul Reggie Rob Rory Scott Sean Stuart Wes Zach Ashley Ricky',
    'Allen, Bailey, Baker, Barker, Bates, Bell, Booth, Bradley, Brooks, Burton, Chapman, Cole, Collins, Cox, Dale, Dawson, Dixon, Ellis, Farrell, Fisher, Ford, Foster, Graham, Grant, Hall, Harper, Hart, Hayes, Hill, Holmes, Hunt, Hunter, Jennings, Kay, Kerr, Lane, Lawson, Lloyd, Mason, Miles, Moss, Nash, Nicholls, Norris, Parsons, Payne, Perry, Pope, Porter, Reid, Reynolds, Richards, Robson, Russell, Saunders, Simpson, Slater, Spencer, Stone, Summers, Tate, Thornton, Tucker, Vaughan, Wade, Watts, Wells, Wheeler, Whitehead, Wilkinson, Woods, Yates');
  FM.D.addNames('BRA', 'Arthur Enzo Davi Heitor Bernardo Samuel Miguel Guilherme Gustavo Leonardo Henrique Eduardo Murilo Otávio Renan Anderson Alisson Douglas Fabrício Gérson Hugo Jean Kauã Luan Marcos Nathan Paulo Rafinha Ronaldo Tales Vitor Wendel Yago Ygor Danilo Emerson Juninho Lucca Andrey Kaique',
    'Araújo, Cardoso, Castro, Correia, Cunha, Fernandes, Freitas, Martins, Mendes, Monteiro, Nunes, Pinto, Ramos, Reis, Rodrigues, Santana, Soares, Teixeira, Vieira, Andrade, Batista, Campos, Cavalcanti, Duarte, Farias, Figueiredo, Lopes, Machado, Marques, Medeiros, Melo, Miranda, Moreira, Nogueira, Pires, Queiroz, Sales, Siqueira, Tavares');
  FM.D.addNames('ARG', 'Alejandro Bruno Carlos Cristian Damián Ezequiel Fernando Germán Guido Ignacio Joaquín Juan Leandro Lucas Luciano Marcos Martín Mauro Maximiliano Nahuel Pablo Ramiro Rodrigo Thiago Alan Axel Benjamín Bautista Brian Claudio Enzo Exequiel Federico Gastón Hernán Jonathan Lisandro Milton Walter Luca',
    'Pérez, Gómez, Ruiz, Torres, Suárez, Castro, Molina, Ortiz, Silva, Rojas, Morales, Núñez, Ríos, Vega, Ramos, Luna, Ferreyra, Giménez, Cabrera, Aguirre, Paz, Quiroga, Villalba, Juárez, Godoy, Ledesma, Figueroa, Coronel, Peralta, Arce, Bustos, Carrizo, Maidana, Ojeda, Páez, Rivero, Toledo, Vera, Zárate, Cáceres');
  FM.D.addNames('JPN', 'Asahi Daichi Eita Fumiya Hikaru Hinata Hiroto Jun Kazuya Keisuke Koki Kyosuke Makoto Masaki Minato Naoya Reo Ryusei Satoshi Shinji Shunsuke Soma Taiga Takeru Tatsuya Tomoki Tsubasa Wataru Yamato Yudai Yuma Yusei Akira Ayumu Haruki Issei Kento Rikuto Shinya',
    'Abe, Arai, Fujii, Hasegawa, Hirano, Honda, Ishii, Iwasaki, Kaneko, Kikuchi, Kinoshita, Kubo, Maruyama, Masuda, Matsuda, Miura, Miyazaki, Morita, Nakagawa, Nakano, Nakajima, Noguchi, Ota, Saito, Sakai, Sato, Shibata, Sugiyama, Takagi, Takeda, Tamura, Ueda, Uchida, Wada, Yamazaki, Yano, Yokoyama, Kojima, Hayashida, Nagai');
  FM.D.addNames('KOR', 'Chan-woo Dae-hyun Eun-su Gi-hyun Gyu-min Hae-won Ho-jun Hyeon-seok In-beom Ja-cheol Jae-sung Jeong-ho Ji-hwan Jin-woo Jong-hyun Joo-won Kyu-ri Min-jae Min-kyu Myung-jae Sang-min Se-hun Seok-ju Seung-ho Sung-min Tae-hwan Won-jun Woo-young Yeong-jae Yong-woo Young-min Hyung-min Chul-soo Kwang-hyun Jun-young',
    'Hwang, Im, Heo, Yoo, Go, Yang, Son, Noh, Ha, Kwak, Sung, Cha, Joo, Woo, Min, Jin, Na, Ji, Um, Byun, Chae, Pyo, Gil, Ma, Do, Yeo, Ok, Seol');
  FM.D.addNames('THA', 'Adisak Anucha Apisit Boonsong Chakrit Chalermchai Ekkachai Jirawat Kasem Kiattisak Korrawit Manop Nattawut Niran Panupong Pattara Phichit Pongsakorn Rattapong Sakda Somchai Sompong Sukree Surachet Tanaboon Teerasil Thitiphan Tossapol Umpol Vorawut Wanchai Wisarut Yutthana Charyl Poramet Kritsana',
    'Anantasak, Buakhao, Chanthong, Charoensuk, Duangkaew, Intharat, Jantarasuk, Kaewkla, Khamsing, Lertsak, Meesuk, Nakprasert, Onsri, Panyasiri, Phetchara, Prasertsri, Ruangsri, Saelim, Sangthong, Siriwat, Somboon, Suwannarat, Tangsakul, Thongchai, Udomsak, Wattanachai, Wiriya, Yenphan, Kaewmanee, Boonkerd');
  FM.D.addNames('SRB', 'Aleksa Andrej Bojan Branko Darko Dejan Dimitrije Goran Ivan Jovan Lazar Luka Marko Matija Miloš Mladen Nemanja Novak Pavle Radoš Relja Sava Srđan Stefan Uroš Vasilije Vukašin Zoran Željko Bogdan Danilo Igor Ljubomir Mirko Ognjen',
    'Aleksić, Antić, Bogdanović, Cvetković, Despotović, Đurić, Gajić, Jevtić, Krstić, Lazić, Maksimović, Mladenović, Novaković, Pantić, Perić, Radonjić, Rakić, Savić, Spasić, Stevanović, Stojković, Tomić, Veljković, Vukić, Zečević, Živanović, Jović, Marinković, Milovanović, Radenković');
  FM.D.addNames('FRA', 'Alexis Aurélien Bastien Cédric Corentin Damien Dylan Florian Gaëtan Guillaume Jordan Julien Kévin Lenny Loïc Malo Marius Nicolas Olivier Quentin Rémi Romain Sacha Tanguy Valentin Victor Yann Youssouf Ismaël Kylian Warren Désiré Randal Eduardo Tanguy Boubacar Souleymane Amadou',
    'Barbier, Bertrand, Blanchard, Boyer, Brun, Caron, Clément, Colin, David, Denis, Dumont, Dupont, Fabre, Fournier, Gaillard, Guerin, Henry, Joly, Lambert, Lefèvre, Lemoine, Marchand, Masson, Mathieu, Meunier, Michel, Muller, Nicolas, Perrin, Petit, Renard, Richard, Rivière, Roussel, Roy, Simon, Thomas, Vidal, Kanté, Koné, Touré, Konaté, Doucouré, Sakho, Coulibaly, Keita');
  FM.D.addNames('ESP', 'Aarón Adrián Andrés Antonio Arnau Brais Cristian Enrique Ernesto Francisco Gerardo Guillermo Héctor Ismael Jaime José Juanma Julen Lucas Manuel Mateo Nico Rafa Ramón Rodrigo Samu Santi Tomás Xabi Yeray Ander Beñat Gorka Iñaki Joan Martí Pol Roger Xavi Hugo',
    'Aguilar, Bravo, Caballero, Cámara, Carmona, Crespo, Domínguez, Durán, Escudero, Esteban, Ferrer, Gallardo, Giménez, Guzmán, Hidalgo, Lara, Luque, Manzano, Marín, Mora, Nieto, Ortiz, Pastor, Quintero, Ramírez, Reyes, Robles, Rojas, Sáez, Salas, Sanz, Soler, Soto, Varela, Vázquez, Velasco, Zamora, Arrieta, Goikoetxea, Larrañaga');
  FM.D.addNames('NGA', 'Abdullahi Akinwale Babatunde Chidera Chinedu Daniel David Ebuka Ejike Friday Godwin Ibrahim Innocent Jamiu Kingsley Kunle Michael Nnamdi Obafemi Oluwaseun Promise Raphael Rasheed Sadiq Seun Simeon Stanley Terem Tobi Umar Wale Yakubu Zaidu Calvin Cyriel Ademola Alhassan',
    'Abubakar, Adeleke, Afolayan, Agu, Aina, Akinyemi, Amadi, Anyanwu, Dike, Ekwueme, Ibekwe, Igwe, Kalu, Mohammed, Nwachukwu, Nwankwo, Obasi, Odion, Ogbonna, Okeke, Oyelaran, Sule, Umar, Yusuf, Ezenwa, Adeniyi, Chima, Emenike, Ogundipe, Olatunji, Onyeama, Uzoma, Babalola, Ezeh, Nnadi');
  FM.D.addNames('POR', 'Alexandre Álvaro Artur Bernardo Carlos Daniel Duarte Eduardo Fábio Filipe Gabriel Henrique Hélder Ivo Joaquim Jorge Leonardo Lourenço Manuel Marco Mário Paulo Renato Rodrigo Rui Salvador Samuel Sérgio Simão Tomé Vasco Xavier Gustavo Dinis Otávio',
    'Almeida, Alves, Amaral, Andrade, Araújo, Azevedo, Batista, Borges, Brito, Campos, Castro, Cruz, Cunha, Dias, Esteves, Faria, Fernandes, Freitas, Guerreiro, Henriques, Leal, Leite, Loureiro, Macedo, Machado, Magalhães, Marques, Monteiro, Nogueira, Nunes, Pacheco, Paiva, Reis, Salgado, Seixas, Silva, Simões, Vaz, Vieira');
  FM.D.addNames('NED', 'Bart Boy Calvin Cody Dirk Emil Gijs Hidde Jan Jens Jort Jurriën Kenneth Lucas Mats Max Micky Nathan Owen Pepijn Quinten Rens Robin Roel Ruud Sepp Sjoerd Teun Thom Tijjani Vincent Wessel Xavi Youri Zeno',
    'Boer, Bosch, van Dijk, van der Linden, Hoekstra, Huisman, Jacobs, de Graaf, de Groot, de Haan, de Koning, de Leeuw, Maas, Martens, Peters, Post, Scholten, Timmermans, van Beek, van Dam, van Dongen, van Loon, van Vliet, Verbeek, Verhoeven, Vink, Zwart, Koster, Evers, Brand, Veenstra, Wolters, Schouten');
  FM.D.addNames('GER', 'Alexander Andreas Anton Ben Christian Daniel Dennis Dominik Elias Emil Finn Frederik Hannes Jakob Janik Johannes Jonathan Justin Karl Kevin Lars Lennart Linus Malte Mats Matthias Max Nils Ole Oskar Pascal Robin Sebastian Simon Stefan Thomas Timo Tom Vincent Yannick',
    'Albrecht, Arnold, Baumann, Beck, Böhm, Brandt, Busch, Dietrich, Engel, Friedrich, Fuchs, Graf, Günther, Haas, Hahn, Heinrich, Herrmann, Horn, Jung, Keller, Kraus, Kühn, Lehmann, Lorenz, Ludwig, Maier, Martin, Möller, Otto, Pohl, Roth, Sauer, Schäfer, Scholz, Schubert, Schulz, Schwarz, Seidel, Simon, Sommer, Stein, Thomas, Vogt, Werner, Winkler, Ziegler');
  FM.D.addNames('BEL', 'Aster Bram Charles Cyriel Dante Dries Elias Emile Ferre Hugo Ilias Jarne Jonas Julien Kevin Leander Loïs Louis Mats Mauro Michiel Noah Olivier Pieter Quinten Rune Simon Tom Toon Warre Xander Yari Zeno Arthur Alexis',
    'Bogaert, Claeys, Cools, De Backer, De Clercq, De Cock, De Coster, Dewaele, De Wilde, Dubois, Dupont, Geerts, Hendrickx, Lemmens, Leroy, Lambert, Mertens, Moens, Nys, Segers, Simons, Smets, Stevens, Van Acker, Van den Broeck, Van Hoof, Vandamme, Verhaegen, Verstraete, Vervoort, Wuyts, Lefebvre, Mathieu');
  FM.D.addNames('IRL', 'Adam Ben Bobby Callum Cillian Colm Conal Dáire Darren Declan Diarmuid Donal Eamon Fiachra Gavin James Jake John Kyle Luke Mark Mikey Odhran Padraig Peter Rian Rory Seamus Tiernan Tom Troy',
    'Boyle, Brady, Burke, Carroll, Clarke, Coleman, Collins, Connolly, Cullen, Cunningham, Dempsey, Doyle, Dunne, Egan, Flanagan, Flynn, Foley, Gorman, Harrington, Healy, Hennessy, Horgan, Joyce, Keogh, Lawlor, Lynch, Maguire, Mahon, McGrath, Molloy, Mulligan, Nugent, Regan, Ryan, Sweeney, Tierney, Whelan');
  FM.D.addNames('SCO', 'Aaron Alan Allan Barry Billy Brian Cammy Chris Colin Darren David Declan Gary Gordon Hamish Iain Jamie John Kenny Kevin Kieran Lawrence Lyall Malcolm Neil Rory Ruaridh Shaun Stephen Steven Stewart Tommy',
    'Adam, Bain, Black, Brown, Campbell, Christie, Cooper, Dickson, Docherty, Donaldson, Ferguson, Forrest, Gray, Johnston, Kelly, Kennedy, Lawson, Mackay, Maclean, McLean, Miller, Mitchell, Taylor, Boyd, Craig, Dunlop, Fleming, Hay, Kirk, Lindsay, Ogilvie, Rennie, Wallace');
  FM.D.addNames('WAL', 'Aaron Ben Brennan Chris Connor Daniel David Ethan Gethin Harri Iolo Jac Jonny Jordan Kieffer Lloyd Mark Neco Nathan Rabbi Sion Sorba Wes Joe Ellis Rubin',
    'Allen, Collins, Cooper, Davies, Hughes, Jenkins, King, Lawrence, Moore, Price, Roberts, Taylor, Thomas, Watkins, Wilson, Hopkins, Richards, Bowen, Howells, Jarvis, Lloyd, Meredith, Nash, Probert, Rowlands');
  FM.D.addNames('URU', 'Agustín Álvaro Bruno Carlos Cristian Damián Diego Felipe Fernando Gabriel Guillermo Ignacio Jonathan Juan Leonardo Lucas Luis Manuel Marcelo Nahuel Pablo Rodrigo Ronald Thiago Valentín Walter Alexis Christian Kevin Federico',
    'Acosta, Aguirre, Cáceres, Canobbio, Cardozo, Giménez, González, Hernández, López, Martínez, Olivera, Rodríguez, Rosas, Sánchez, Silva, Torres, Varela, Viera, Villar, Zalazar, Bueno, Cabrera, Duarte, Etchegaray, Lemos, Machado, Nández, Pintos, Quintana, Sosa');
  FM.D.addNames('COL', 'Alexis Andrés Brayan Carlos Cristian Daniel David Deiver Diego Duván Edwin Eduardo Faustino Frank Gustavo Harold Jaminton Jhon Jhonatan Johan Jorge José Juan Kevin Luis Mateo Miguel Nicolás Richard Santiago Sebastián Steven Wílmar Yerson',
    'Barrios, Campaz, Carrascal, Castillo, Durán, Fabra, Guerrero, Hurtado, Lerma, Machado, Montero, Muñoz, Palacios, Quintero, Ríos, Rodríguez, Sánchez, Uribe, Valoy, Vargas, Arboleda, Bermúdez, Cárdenas, Escobar, Gaitán, Londoño, Mejía, Osorio, Restrepo, Zuluaga');
  FM.D.addNames('SEN', 'Abdoulaye Alioune Amadou Bamba Boulaye Cherif Dame Djibril Édouard El Hadji Fodé Formose Habibou Ismaïla Kalidou Krépin Lamine Mame Mbaye Moustapha Nampalys Nicolas Pathé Sadio Salif Samba Seydou Souleymane Youssouf Idrissa Iliman',
    'Baldé, Cissokho, Coly, Diagne, Diakhaby, Diarra, Diaw, Dieye, Diouf, Gassama, Gueye, Kanté, Keïta, Ndoye, Sabaly, Sall, Sané, Sène, Sidibé, Sonko, Tall, Wagué, Ndour, Ngom, Samb, Seye, Thiaw, Tine, Wade');
  FM.D.addNames('GHA', 'Abdul Alexander Andrew Antoine Baba Benjamin Bernard Christopher Dennis Derrick Elisha Enoch Eric Ernest Evans Francis Frederick Gideon Ibrahim Inaki Jonathan Jordan Kamaldeen Kingsley Majeed Mohammed Mubarak Osman Patrick Razak Salis Thomas Tariq',
    'Addo, Aidoo, Ampem, Annan, Asamoah, Badu, Bukari, Nuamah, Nyarko, Ofosu, Frimpong, Gyasi, Issahaku, Lamptey, Sulemana, Amankwah, Boahen, Dankwa, Fosu, Kusi, Manu, Nketiah, Obeng, Sarfo, Tawiah, Twumasi, Wiredu, Yamoah, Zakari');
  FM.D.addNames('CIV', 'Abdoul Adama Alain Amad Arthur Bakary Christian Didier Emmanuel Éric Evann Franck Gervais Guéla Hamed Ibrahim Jean-Michaël Jonathan Karim Lassina Maxwel Nicolas Odilon Oumar Salomon Sébastien Sékou Simon Willy Yaya',
    'Adingra, Aké, Boga, Deli, Diakité, Fofana, Konan, Kouamé, Ouattara, Sangaré, Singo, Soumahoro, Touré, Yao, Agba, Assi, Beugré, Dago, Ehui, Gnahoré, Kacou, Loba, N\'Guessan, Tanoh, Yeboué, Zadi');
  FM.D.addNames('MAR', 'Abdelhamid Abderrazak Achraf Adil Ahmed Anas Azzedine Brahim Chadi Driss Eliesse Hakim Ibrahim Imran Ismael Jawad Khalid Mounir Mohamed Munir Nordin Noussair Othmane Rachid Romain Sofiane Selim Yahia Yassine Younes Zakaria',
    'Aboukhlal, Adli, Attiat-Allah, Chair, Dari, El Khannouss, El Yamiq, Ezzalzouli, Ouahabi, Rahimi, Sabiri, Zaroury, Belhanda, Fajr, Louza, Amrani, Bakkali, Cherkaoui, El Ouardi, Fikri, Hamdaoui, Jabri, Kharbouch, Mouline, Nejjari, Sefrioui, Tounsi, Zeroual');
  FM.D.addNames('USA', 'Alex Andrew Anthony Benjamin Blake Brian Cameron Carter Chase Christian Clint Daniel DeAndre Dylan Eric Ethan Gabriel Jacob Jalen Jonathan Joshua Julian Justin Landon Logan Malik Mark Owen Paxten Reggie Ricardo Sergiño Timothy Walker Weston Yunus',
    'Anderson, Cannon, Carter, Evans, Ferreira, Hall, Horvath, Lewis, Long, Martinez, Morris, Nelson, Robinson, Scally, Turner, Wright, Zimmerman, Barnes, Cooper, Brooks, Campbell, Collins, Edwards, Fisher, Graham, Hughes, Kelly, Murphy, Perez, Ross, Sanders, Stewart, Ward, Wood');
  FM.D.addNames('DEN', 'Alexander Andreas Casper Daniel Elias Gustav Jacob Jens Joakim Jonas Kristoffer Lasse Lucas Malthe Marcus Martin Morten Nikolaj Oliver Pierre-Emile Rasmus Sebastian Simon Thomas Troels Victor William Yussuf Asger Silas Mathias',
    'Andersen, Christensen, Damsgaard, Frandsen, Gregersen, Isaksen, Jakobsen, Kristiansen, Lindstrøm, Olesen, Stryger, Winther, Østergaard, Hermansen, Mikkelsen, Bang, Dam, Enevoldsen, Fog, Gade, Holst, Juhl, Krogh, Lund, Mogensen, Nørregaard, Overgaard, Riis, Schou, Thygesen');
  FM.D.addNames('NOR', 'Alexander Andreas Anders Birger Bjørn Daniel Erling Fredrik Gustav Hans Harald Jens Jo Johannes Julian Kasper Kristoffer Leo Lars Marius Martin Morten Oscar Patrick Per Sebastian Sondre Stefan Thomas Tor Torbjørn Vetle',
    'Aasgaard, Ajer, Berge, Bjørkan, Hanche-Olsen, Hauge, Holm, Jensen, Larsen, Meling, Nyland, Pedersen, Selvik, Solbakken, Strandberg, Thorsby, Tangvik, Skaug, Eggen, Aune, Bakke, Brenden, Fjeld, Grønli, Hovland, Lie, Ness, Rønning, Sæther, Tveit');
  FM.D.addNames('CRO', 'Andrej Antonio Bruno Damir Darko Dario Davor Domagoj Hrvoje Igor Ivo Josip Kristijan Lovro Luka Marin Martin Mateo Matija Mislav Niko Nikola Robert Roko Stjepan Tomislav Vedran Zvonimir Luka Petar Borna',
    'Blažević, Bošnjak, Brajković, Bralić, Crnković, Čović, Dragić, Filipović, Galović, Grubišić, Herceg, Ivanković, Jakovljević, Jukić, Katić, Klarić, Kovač, Lončar, Lukić, Mikulić, Novak, Pavlović, Perković, Polić, Radošević, Sertić, Šarić, Tomić, Vidović, Vrdoljak, Zovko');
  FM.D.addNames('ITA', 'Alberto Alessio Antonio Carlo Claudio Cristiano Daniele Diego Enrico Fabio Federico Gabriele Gaetano Giovanni Giuseppe Jacopo Luigi Mattia Michele Mirko Nicola Paolo Raffaele Roberto Salvatore Samuele Sandro Tommaso Umberto Valerio Vincenzo Christian Destiny',
    'Amato, Barone, Basile, Benedetti, Bernardi, Bruno, Cattaneo, Coppola, D\'Angelo, De Luca, De Rosa, Farina, Fiore, Giordano, Grasso, Guerra, Mancini, Mariani, Marchetti, Messina, Monti, Morelli, Neri, Orlando, Palumbo, Parisi, Pellegrini, Riva, Rizzo, Ruggiero, Sala, Santoro, Serra, Silvestri, Testa, Valentini, Vitale');
  FM.D.addNames('MEX', 'Adrián Alan Alejandro Armando Brian César Christian Daniel Eduardo Efraín Emmanuel Érick Fidel Gilberto Guillermo Hugo Isaac Israel Jesús Jonathan Jorge Kevin Luis Manuel Mario Osvaldo Pablo Rogelio Sebastián Tomás Ulises',
    'Aguirre, Arteaga, Ayala, Beltrán, Cabrera, Campos, Delgado, Espinoza, Estrada, Fuentes, Galindo, Herrera, Lara, Leyva, Lozano, Macías, Medina, Montes, Navarro, Ochoa, Pérez, Quiñones, Ramos, Ríos, Rosales, Salcedo, Sandoval, Tapia, Valdez, Vega, Zavala');

  // ---------- More minimal leagues: the next European leagues by UEFA coefficient ----------
  FM.D.CLUBS_BE1 = [
    ['Club Brugge', 'CLB2', 'Bruges', '#0E4DA4', '#000000', 'giant', 68], ['Union Saint-Gilloise', 'USG', 'Brussels', '#FFDD00', '#0033A0', 'selling', 64],
    ['Anderlecht', 'AND2', 'Brussels', '#4B2C85', '#FFFFFF', 'giant', 65], ['KRC Genk', 'GNK', 'Genk', '#003DA5', '#FFFFFF', 'youth', 63],
    ['KAA Gent', 'GNT', 'Ghent', '#003DA5', '#FFFFFF', 'historic', 61], ['Royal Antwerp', 'ANT', 'Antwerp', '#E30613', '#FFFFFF', 'oil', 61],
    ['Standard Liège', 'STL2', 'Liège', '#E30613', '#FFFFFF', 'fallen', 59], ['Cercle Brugge', 'CER2', 'Bruges', '#00843D', '#000000', 'youth', 56],
    ['KV Mechelen', 'KVM', 'Mechelen', '#FFDD00', '#E30613', 'fan', 56], ['KVC Westerlo', 'WES', 'Westerlo', '#FFDD00', '#003DA5', 'oil', 55],
    ['Sporting Charleroi', 'CHL', 'Charleroi', '#000000', '#FFFFFF', 'fan', 55], ['OH Leuven', 'OHL', 'Leuven', '#FFFFFF', '#00843D', 'fan', 54],
    ['Sint-Truiden', 'STV2', 'Sint-Truiden', '#FFDD00', '#003DA5', 'selling', 53], ['FCV Dender', 'DEN2', 'Denderleeuw', '#E30613', '#FFFFFF', 'fan', 51],
    ['Zulte Waregem', 'ZWA', 'Waregem', '#E30613', '#00843D', 'fan', 51], ['RAAL La Louvière', 'RAAL', 'La Louvière', '#00843D', '#FFFFFF', 'fan', 50],
  ];
  FM.D.CLUBS_TR1 = [
    ['Galatasaray', 'GAL', 'Istanbul', '#A90432', '#FDB912', 'giant', 72], ['Fenerbahçe', 'FEN', 'Istanbul', '#FFED00', '#004A9F', 'giant', 71],
    ['Beşiktaş', 'BJK', 'Istanbul', '#000000', '#FFFFFF', 'giant', 67], ['Trabzonspor', 'TS', 'Trabzon', '#7A1E3A', '#6CABDD', 'historic', 63],
    ['İstanbul Başakşehir', 'IBFK', 'Istanbul', '#F47920', '#0B1F4B', 'oil', 60], ['Samsunspor', 'SAM2', 'Samsun', '#E30613', '#FFFFFF', 'fan', 57],
    ['Göztepe', 'GOZ', 'İzmir', '#FFDD00', '#E30613', 'fan', 56], ['Eyüpspor', 'EYP', 'Istanbul', '#6A1B9A', '#FFDD00', 'oil', 55],
    ['Kasımpaşa', 'KAS2', 'Istanbul', '#003DA5', '#FFFFFF', 'fan', 54], ['Çaykur Rizespor', 'RIZ', 'Rize', '#00843D', '#003DA5', 'fan', 54],
    ['Konyaspor', 'KON', 'Konya', '#00843D', '#FFFFFF', 'fan', 54], ['Antalyaspor', 'ANT2', 'Antalya', '#E30613', '#FFFFFF', 'fan', 53],
    ['Alanyaspor', 'ALY', 'Alanya', '#F47920', '#00843D', 'fan', 53], ['Gaziantep FK', 'GAZ', 'Gaziantep', '#E30613', '#000000', 'fan', 53],
    ['Kayserispor', 'KAY', 'Kayseri', '#FFDD00', '#E30613', 'fan', 52], ['Kocaelispor', 'KOC', 'İzmit', '#00843D', '#000000', 'fan', 52],
    ['Gençlerbirliği', 'GEN2', 'Ankara', '#E30613', '#000000', 'youth', 51], ['Fatih Karagümrük', 'FKG', 'Istanbul', '#E30613', '#000000', 'fan', 51],
  ];
  FM.D.CLUBS_CZ1 = [
    ['Slavia Prague', 'SLA2', 'Prague', '#E30613', '#FFFFFF', 'giant', 64], ['Sparta Prague', 'SPA', 'Prague', '#8A1538', '#FFFFFF', 'giant', 63],
    ['Viktoria Plzeň', 'PLZ', 'Plzeň', '#E30613', '#003DA5', 'historic', 61], ['Baník Ostrava', 'BAN2', 'Ostrava', '#6CABDD', '#FFFFFF', 'fan', 56],
    ['Sigma Olomouc', 'SIG', 'Olomouc', '#003DA5', '#FFFFFF', 'youth', 53], ['Slovan Liberec', 'LIB2', 'Liberec', '#FFFFFF', '#003DA5', 'youth', 53],
    ['Hradec Králové', 'HKR', 'Hradec Králové', '#000000', '#FFDD00', 'fan', 51], ['Mladá Boleslav', 'MBO', 'Mladá Boleslav', '#003DA5', '#FFFFFF', 'selling', 51],
    ['Bohemians 1905', 'BOH', 'Prague', '#00843D', '#FFFFFF', 'fan', 50], ['FK Jablonec', 'JAB', 'Jablonec nad Nisou', '#00843D', '#000000', 'fan', 50],
    ['FK Teplice', 'TEP', 'Teplice', '#FFDD00', '#003DA5', 'fan', 49], ['FK Pardubice', 'PAR2', 'Pardubice', '#E30613', '#FFFFFF', 'fan', 48],
    ['MFK Karviná', 'KAR', 'Karviná', '#00843D', '#FFFFFF', 'fan', 48], ['1. FC Slovácko', 'SLO2', 'Uherské Hradiště', '#003DA5', '#FFFFFF', 'fan', 48],
    ['Dukla Prague', 'DUK', 'Prague', '#FFDD00', '#8A1538', 'historic', 47], ['FC Zlín', 'ZLN', 'Zlín', '#FFDD00', '#000000', 'fan', 47],
  ];
  FM.D.CLUBS_GR1 = [
    ['Olympiacos', 'OLY2', 'Piraeus', '#E30613', '#FFFFFF', 'giant', 68], ['Panathinaikos', 'PAO', 'Athens', '#00843D', '#FFFFFF', 'giant', 64],
    ['AEK Athens', 'AEK', 'Athens', '#FFDD00', '#000000', 'giant', 64], ['PAOK', 'PAOK', 'Thessaloniki', '#000000', '#FFFFFF', 'historic', 65],
    ['Aris Thessaloniki', 'ARI', 'Thessaloniki', '#FFDD00', '#000000', 'fan', 57], ['OFI Crete', 'OFI', 'Heraklion', '#000000', '#FFFFFF', 'fan', 53],
    ['Atromitos', 'ATR', 'Peristeri', '#003DA5', '#FFFFFF', 'fan', 52], ['Asteras Tripolis', 'AST', 'Tripoli', '#FFDD00', '#003DA5', 'fan', 51],
    ['Panetolikos', 'PNT', 'Agrinio', '#FFDD00', '#003DA5', 'fan', 50], ['Volos NFC', 'VOL2', 'Volos', '#E30613', '#003DA5', 'fan', 50],
    ['Levadiakos', 'LEV2', 'Livadeia', '#00843D', '#FFFFFF', 'fan', 49], ['Kifisia', 'KIF', 'Kifisia', '#003DA5', '#FFFFFF', 'fan', 49],
    ['AEL Larissa', 'AEL', 'Larissa', '#8A1538', '#FFFFFF', 'historic', 48], ['Panserraikos', 'PSR', 'Serres', '#E30613', '#FFFFFF', 'fan', 48],
  ];
  FM.D.CLUBS_NO1 = [
    ['Bodø/Glimt', 'BOD', 'Bodø', '#FFDD00', '#000000', 'youth', 63], ['SK Brann', 'BRA2', 'Bergen', '#E30613', '#FFFFFF', 'fan', 58],
    ['Viking FK', 'VIK', 'Stavanger', '#003DA5', '#FFFFFF', 'historic', 57], ['Rosenborg', 'RBK', 'Trondheim', '#FFFFFF', '#000000', 'giant', 58],
    ['Molde', 'MOL', 'Molde', '#003DA5', '#FFFFFF', 'historic', 58], ['Sarpsborg 08', 'S08', 'Sarpsborg', '#003DA5', '#FFFFFF', 'fan', 51],
    ['Fredrikstad', 'FFK', 'Fredrikstad', '#FFFFFF', '#E30613', 'historic', 51], ['Tromsø IL', 'TIL', 'Tromsø', '#E30613', '#FFFFFF', 'fan', 51],
    ['Sandefjord', 'SAF2', 'Sandefjord', '#003DA5', '#FFFFFF', 'fan', 49], ['KFUM Oslo', 'KFU', 'Oslo', '#003DA5', '#FFFFFF', 'fan', 49],
    ['HamKam', 'HAM', 'Hamar', '#00843D', '#FFFFFF', 'fan', 48], ['Kristiansund', 'KBK', 'Kristiansund', '#003DA5', '#FFFFFF', 'fan', 48],
    ['Vålerenga', 'VIF', 'Oslo', '#003DA5', '#E30613', 'historic', 52], ['Bryne', 'BRY', 'Bryne', '#E30613', '#FFFFFF', 'fan', 46],
    ['Strømsgodset', 'SIF', 'Drammen', '#003DA5', '#FFFFFF', 'fan', 48], ['FK Haugesund', 'FKH', 'Haugesund', '#003DA5', '#FFFFFF', 'fan', 47],
  ];
  FM.D.CLUBS_PL1 = [
    ['Lech Poznań', 'LPO', 'Poznań', '#003DA5', '#FFFFFF', 'giant', 60], ['Raków Częstochowa', 'RAK', 'Częstochowa', '#E30613', '#003DA5', 'oil', 59],
    ['Jagiellonia Białystok', 'JAG', 'Białystok', '#FFDD00', '#E30613', 'fan', 58], ['Legia Warsaw', 'LEG2', 'Warsaw', '#FFFFFF', '#00843D', 'giant', 60],
    ['Pogoń Szczecin', 'POG', 'Szczecin', '#003DA5', '#8A1538', 'fan', 55], ['Górnik Zabrze', 'GOR', 'Zabrze', '#FFFFFF', '#003DA5', 'historic', 54],
    ['Cracovia', 'CRA2', 'Kraków', '#E30613', '#FFFFFF', 'fan', 53], ['Widzew Łódź', 'WID', 'Łódź', '#E30613', '#FFFFFF', 'oil', 53],
    ['GKS Katowice', 'GKS', 'Katowice', '#FFDD00', '#00843D', 'fan', 51], ['Zagłębie Lubin', 'ZAG', 'Lubin', '#F47920', '#00843D', 'youth', 52],
    ['Piast Gliwice', 'PIA', 'Gliwice', '#003DA5', '#E30613', 'fan', 52], ['Motor Lublin', 'MOT', 'Lublin', '#FFDD00', '#003DA5', 'fan', 50],
    ['Korona Kielce', 'KOR', 'Kielce', '#FFDD00', '#E30613', 'fan', 50], ['Radomiak Radom', 'RAD2', 'Radom', '#00843D', '#FFFFFF', 'fan', 50],
    ['Lechia Gdańsk', 'LGD', 'Gdańsk', '#00843D', '#FFFFFF', 'fallen', 50], ['Arka Gdynia', 'ARK', 'Gdynia', '#FFDD00', '#003DA5', 'fan', 48],
    ['Wisła Płock', 'WPL', 'Płock', '#003DA5', '#FFFFFF', 'fan', 49], ['Termalica Nieciecza', 'TER', 'Nieciecza', '#F47920', '#000000', 'fan', 47],
  ];
  FM.D.CLUBS_DK1 = [
    ['FC Copenhagen', 'FCK', 'Copenhagen', '#FFFFFF', '#003DA5', 'giant', 64], ['FC Midtjylland', 'FCM2', 'Herning', '#000000', '#E30613', 'selling', 62],
    ['Brøndby IF', 'BIF', 'Brøndby', '#FFDD00', '#003DA5', 'historic', 58], ['AGF', 'AGF', 'Aarhus', '#FFFFFF', '#003DA5', 'fan', 56],
    ['FC Nordsjælland', 'FCN', 'Farum', '#E30613', '#FFFFFF', 'youth', 56], ['Randers FC', 'RFC', 'Randers', '#003DA5', '#FFFFFF', 'fan', 52],
    ['Silkeborg IF', 'SIL', 'Silkeborg', '#E30613', '#FFFFFF', 'youth', 52], ['Viborg FF', 'VFF', 'Viborg', '#00843D', '#FFFFFF', 'fan', 51],
    ['Odense BK', 'OB', 'Odense', '#003DA5', '#FFFFFF', 'fallen', 51], ['Sønderjyske', 'SJF', 'Haderslev', '#003DA5', '#FFFFFF', 'fan', 49],
    ['Vejle BK', 'VBK', 'Vejle', '#E30613', '#FFFFFF', 'fan', 49], ['FC Fredericia', 'FCF', 'Fredericia', '#E30613', '#FFFFFF', 'fan', 48],
  ];
  FM.D.CLUBS_AT1 = [
    ['Red Bull Salzburg', 'RBS', 'Salzburg', '#FFFFFF', '#E30613', 'oil', 64], ['Sturm Graz', 'STU', 'Graz', '#000000', '#FFFFFF', 'historic', 61],
    ['Rapid Wien', 'RAP2', 'Vienna', '#00843D', '#FFFFFF', 'giant', 58], ['Austria Wien', 'FAK', 'Vienna', '#6A1B9A', '#FFFFFF', 'historic', 56],
    ['LASK', 'LASK', 'Linz', '#000000', '#FFFFFF', 'fan', 56], ['Wolfsberger AC', 'WAC2', 'Wolfsberg', '#000000', '#F47920', 'fan', 51],
    ['TSV Hartberg', 'HAR', 'Hartberg', '#003DA5', '#FFFFFF', 'fan', 49], ['Blau-Weiß Linz', 'BWL', 'Linz', '#003DA5', '#FFFFFF', 'fan', 49],
    ['WSG Tirol', 'WSG', 'Wattens', '#00843D', '#FFFFFF', 'fan', 48], ['SCR Altach', 'ALT', 'Altach', '#000000', '#FFDD00', 'fan', 48],
    ['Grazer AK', 'GAK', 'Graz', '#E30613', '#FFFFFF', 'fallen', 47], ['SV Ried', 'RIE2', 'Ried im Innkreis', '#000000', '#00843D', 'fan', 47],
  ];
  FM.D.CLUBS_CH1 = [
    ['FC Basel', 'BAS', 'Basel', '#E30613', '#003DA5', 'giant', 62], ['BSC Young Boys', 'YB', 'Bern', '#FFDD00', '#000000', 'giant', 62],
    ['Servette FC', 'SER', 'Geneva', '#8A1538', '#FFFFFF', 'historic', 56], ['FC Lugano', 'LUG', 'Lugano', '#000000', '#FFFFFF', 'oil', 56],
    ['FC Luzern', 'LUZ', 'Lucerne', '#003DA5', '#FFFFFF', 'youth', 53], ['FC St. Gallen', 'STG', 'St. Gallen', '#00843D', '#FFFFFF', 'fan', 53],
    ['FC Zürich', 'FCZ', 'Zurich', '#FFFFFF', '#003DA5', 'historic', 54], ['Grasshopper Club', 'GCZ', 'Zurich', '#003DA5', '#FFFFFF', 'fallen', 51],
    ['Lausanne-Sport', 'LS', 'Lausanne', '#003DA5', '#FFFFFF', 'oil', 52], ['FC Sion', 'SIO', 'Sion', '#FFFFFF', '#E30613', 'fan', 51],
    ['FC Winterthur', 'WIN', 'Winterthur', '#E30613', '#FFFFFF', 'fan', 49], ['FC Thun', 'THU', 'Thun', '#E30613', '#FFFFFF', 'fan', 49],
  ];
  FM.D.CLUBS_SC1 = [
    ['Celtic', 'CEL2', 'Glasgow', '#00843D', '#FFFFFF', 'giant', 70], ['Rangers', 'RAN2', 'Glasgow', '#1B458F', '#FFFFFF', 'giant', 68],
    ['Heart of Midlothian', 'HEA', 'Edinburgh', '#8A1538', '#FFFFFF', 'historic', 56], ['Aberdeen', 'ABE', 'Aberdeen', '#E30613', '#FFFFFF', 'historic', 56],
    ['Hibernian', 'HIB', 'Edinburgh', '#00843D', '#FFFFFF', 'historic', 55], ['Motherwell', 'MOT2', 'Motherwell', '#FFB81C', '#8A1538', 'fan', 50],
    ['Dundee United', 'DUN2', 'Dundee', '#F47920', '#000000', 'fan', 51], ['Kilmarnock', 'KIL', 'Kilmarnock', '#003DA5', '#FFFFFF', 'fan', 50],
    ['St Mirren', 'SMI', 'Paisley', '#000000', '#FFFFFF', 'fan', 50], ['Dundee', 'DND', 'Dundee', '#0B1F4B', '#FFFFFF', 'fan', 49],
    ['Livingston', 'LIV2', 'Livingston', '#FFDD00', '#000000', 'fan', 47], ['Falkirk', 'FAL', 'Falkirk', '#0B1F4B', '#FFFFFF', 'fan', 47],
  ];

  // Every league, data-driven, at its real size. repBand = the reputation range a league's clubs drift toward.
  // rules.rounds caps the fixture list where the real format isn't a full double round-robin (MLS: 34 games; Argentina: one round-robin).
  // Continental places: Europe 16 (ENG/ESP/GER/ITA 3, FRA 2, POR 1, NED 1); South America 8; Asia, Africa, North America 8 each.
  FM.D.LEAGUES = [
    { id: 'D1', nat: 'ENG', name: 'Premier League', short: 'PL', tier: 1, sim: 'full', clubs: 'CLUBS_D1', repBand: [88, 61], rules: { relegate: { to: 'D2', n: 3 }, qualify: { to: 'CC', n: 3 } } },
    { id: 'D2', nat: 'ENG', name: 'EFL Championship', short: 'CH', tier: 2, sim: 'full', clubs: 'CLUBS_D2', repBand: [61, 47], rules: { promote: { to: 'D1', auto: 2, playoff: [3, 6] }, relegate: { to: 'D3', n: 3 } } },
    { id: 'D3', nat: 'ENG', name: 'EFL League One', short: 'LO', tier: 3, sim: 'light', clubs: 'CLUBS_D3', repBand: [49, 39], rules: { promote: { to: 'D2', auto: 2, playoff: [3, 6] } } },
    { id: 'ES1', nat: 'ESP', name: 'LaLiga', short: 'LL', tier: 1, sim: 'full', clubs: 'CLUBS_ES1', repBand: [89, 58], rules: { relegate: { to: 'ES2', n: 3 }, qualify: { to: 'CC', n: 3 } } },
    { id: 'ES2', nat: 'ESP', name: 'Segunda División', short: 'SD', tier: 2, sim: 'light', clubs: 'CLUBS_ES2', repBand: [56, 45], rules: { promote: { to: 'ES1', auto: 2, playoff: [3, 6] } } },
    { id: 'DE1', nat: 'GER', name: 'Bundesliga', short: 'BL', tier: 1, sim: 'full', clubs: 'CLUBS_DE1', repBand: [89, 58], rules: { qualify: { to: 'CC', n: 3 } } },
    { id: 'FR1', nat: 'FRA', name: 'Ligue 1', short: 'L1', tier: 1, sim: 'full', clubs: 'CLUBS_FR1', repBand: [90, 57], rules: { qualify: { to: 'CC', n: 2 } } },
    { id: 'BR1', nat: 'BRA', name: 'Brasileirão Série A', short: 'BSA', tier: 1, sim: 'full', clubs: 'CLUBS_BR1', repBand: [85, 62], rules: { qualify: { to: 'CL', n: 5 } } },
    { id: 'IT1', nat: 'ITA', name: 'Serie A', short: 'SA', tier: 1, sim: 'light', clubs: 'CLUBS_IT1', repBand: [86, 58], rules: { qualify: { to: 'CC', n: 3 } } },
    { id: 'PT1', nat: 'POR', name: 'Primeira Liga', short: 'PRL', tier: 1, sim: 'light', clubs: 'CLUBS_PT1', repBand: [83, 53], rules: { qualify: { to: 'CC', n: 1 } } },
    { id: 'NL1', nat: 'NED', name: 'Eredivisie', short: 'ERE', tier: 1, sim: 'light', clubs: 'CLUBS_NL1', repBand: [81, 54], rules: { qualify: { to: 'CC', n: 1 } } },
    { id: 'AR1', nat: 'ARG', name: 'Liga Profesional', short: 'LPF', tier: 1, sim: 'light', clubs: 'CLUBS_AR1', repBand: [79, 53], rules: { rounds: 27, qualify: { to: 'CL', n: 3 } } },
    { id: 'US1', nat: 'USA', name: 'Major League Soccer', short: 'MLS', tier: 1, sim: 'light', clubs: 'CLUBS_US1', repBand: [67, 55], rules: { rounds: 34, qualify: { to: 'NC', n: 4 } } },
    { id: 'JP1', nat: 'JPN', name: 'J1 League', short: 'J1', tier: 1, sim: 'light', clubs: 'CLUBS_JP1', repBand: [64, 53], rules: { qualify: { to: 'AC', n: 4 } } },
    { id: 'MX1', nat: 'MEX', name: 'Liga MX', short: 'LMX', tier: 1, sim: 'minimal', clubs: 'CLUBS_MX1', repBand: [70, 55], rules: { qualify: { to: 'NC', n: 4 } } },
    { id: 'KR1', nat: 'KOR', name: 'K League 1', short: 'K1', tier: 1, sim: 'minimal', clubs: 'CLUBS_KR1', repBand: [60, 51], rules: { qualify: { to: 'AC', n: 2 } } },
    { id: 'TH1', nat: 'THA', name: 'Thai League 1', short: 'T1', tier: 1, sim: 'minimal', clubs: 'CLUBS_TH1', repBand: [56, 44], rules: { qualify: { to: 'AC', n: 2 } } },
    { id: 'NG1', nat: 'NGA', name: 'Nigeria Premier Football League', short: 'NPFL', tier: 1, sim: 'minimal', clubs: 'CLUBS_NG1', repBand: [55, 45], rules: { qualify: { to: 'AF', n: 4 } } },
    { id: 'MA1', nat: 'MAR', name: 'Botola Pro', short: 'BP', tier: 1, sim: 'minimal', clubs: 'CLUBS_MA1', repBand: [59, 46], rules: { qualify: { to: 'AF', n: 4 } } },
    { id: 'RS1', nat: 'SRB', name: 'Serbian SuperLiga', short: 'SSL', tier: 1, sim: 'minimal', clubs: 'CLUBS_RS1', repBand: [64, 46], rules: {} },
    { id: 'BE1', nat: 'BEL', name: 'Belgian Pro League', short: 'JPL', tier: 1, sim: 'minimal', clubs: 'CLUBS_BE1', repBand: [68, 50], rules: {} },
    { id: 'TR1', nat: 'TUR', name: 'Süper Lig', short: 'SL', tier: 1, sim: 'minimal', clubs: 'CLUBS_TR1', repBand: [72, 50], rules: {} },
    { id: 'CZ1', nat: 'CZE', name: 'Czech First League', short: 'CFL', tier: 1, sim: 'minimal', clubs: 'CLUBS_CZ1', repBand: [64, 46], rules: {} },
    { id: 'GR1', nat: 'GRE', name: 'Super League Greece', short: 'SLG', tier: 1, sim: 'minimal', clubs: 'CLUBS_GR1', repBand: [68, 48], rules: {} },
    { id: 'NO1', nat: 'NOR', name: 'Eliteserien', short: 'ES', tier: 1, sim: 'minimal', clubs: 'CLUBS_NO1', repBand: [63, 46], rules: {} },
    { id: 'PL1', nat: 'POL', name: 'Ekstraklasa', short: 'EKS', tier: 1, sim: 'minimal', clubs: 'CLUBS_PL1', repBand: [62, 46], rules: {} },
    { id: 'DK1', nat: 'DEN', name: 'Danish Superliga', short: 'DSL', tier: 1, sim: 'minimal', clubs: 'CLUBS_DK1', repBand: [64, 48], rules: {} },
    { id: 'AT1', nat: 'AUT', name: 'Austrian Bundesliga', short: 'ABL', tier: 1, sim: 'minimal', clubs: 'CLUBS_AT1', repBand: [64, 46], rules: {} },
    { id: 'CH1', nat: 'SUI', name: 'Swiss Super League', short: 'SSL2', tier: 1, sim: 'minimal', clubs: 'CLUBS_CH1', repBand: [63, 48], rules: {} },
    { id: 'SC1', nat: 'SCO', name: 'Scottish Premiership', short: 'SPFL', tier: 1, sim: 'minimal', clubs: 'CLUBS_SC1', repBand: [70, 46], rules: {} },
  ];
  FM.D.CONTINENTALS = [
    { id: 'CC', region: 'Europe', name: 'UEFA Champions League', short: 'UCL', prize: 15e6 },
    { id: 'CL', region: 'South America', name: 'Copa Libertadores', short: 'LIB', prize: 8e6 },
    { id: 'AC', region: 'Asia', name: 'AFC Champions League Elite', short: 'ACLE', prize: 5e6 },
    { id: 'AF', region: 'Africa', name: 'CAF Champions League', short: 'CAF', prize: 3e6 },
    { id: 'NC', region: 'North America', name: 'CONCACAF Champions Cup', short: 'CCC', prize: 4e6 },
  ];
  // Club World Cup: last season's continental finalists (winners only from Africa and North America)
  // [competition, 0 = winner / 1 = runner-up], in seed order
  FM.D.CWC_SEEDS = [['CC', 0], ['CL', 0], ['CC', 1], ['CL', 1], ['AC', 0], ['AF', 0], ['NC', 0], ['AC', 1]];
  // Squad sizes per tier (+ academy prospects)
  FM.D.SQUAD_TIER = {
    full: { GK: 3, CB: 4, FB: 4, DM: 2, CM: 3, AM: 2, W: 3, ST: 2 }, // three keepers: two can be out at once
    light: { GK: 2, CB: 3, FB: 3, DM: 2, CM: 2, AM: 2, W: 2, ST: 2 },
    minimal: { GK: 2, CB: 3, FB: 2, DM: 1, CM: 2, AM: 1, W: 2, ST: 2 },
  };
  FM.D.ACADEMY_TIER = { full: 2, light: 2, minimal: 1 };

  // Nationality mixes for the new leagues
  Object.assign(FM.D.NAT_MIX, {
    IT1: { ITA: 58, ARG: 4, BRA: 4, FRA: 4, SRB: 3, CRO: 3, NED: 2, POR: 2, ESP: 2, DEN: 2, NOR: 2, SEN: 2, NGA: 2, MAR: 2, URU: 2, COL: 2, GER: 2, BEL: 2 },
    NL1: { NED: 64, BEL: 6, MAR: 4, DEN: 3, NOR: 3, GHA: 2, NGA: 2, SEN: 2, BRA: 2, SRB: 2, CRO: 2, JPN: 2, GER: 2, KOR: 1, USA: 1, POR: 1 },
    PT1: { POR: 55, BRA: 18, ARG: 4, URU: 3, COL: 3, ESP: 3, SEN: 2, CIV: 2, NGA: 2, FRA: 2, MAR: 2, GHA: 2, SRB: 1, JPN: 1 },
    AR1: { ARG: 88, URU: 5, COL: 4, BRA: 1, USA: 1, ESP: 1 },
    US1: { USA: 60, MEX: 8, COL: 4, ARG: 4, ENG: 3, GHA: 3, NGA: 2, JPN: 2, KOR: 2, BRA: 2, URU: 2, FRA: 2, GER: 2, ESP: 2, SCO: 1, IRL: 1 },
    JP1: { JPN: 88, KOR: 5, BRA: 4, THA: 2, SRB: 1 },
    MX1: { MEX: 70, ARG: 8, COL: 6, URU: 5, USA: 4, BRA: 3, ESP: 2 },
    NG1: { NGA: 95, GHA: 3, CIV: 1, SEN: 1 },
    KR1: { KOR: 88, BRA: 6, JPN: 3, SRB: 1, USA: 1 },
    TH1: { THA: 80, BRA: 7, JPN: 5, KOR: 5, SRB: 2, NGA: 1 },
    RS1: { SRB: 80, CRO: 4, GHA: 3, NGA: 3, BRA: 3, MAR: 2, SEN: 2, JPN: 1 },
    MA1: { MAR: 88, SEN: 4, CIV: 3, GHA: 2, NGA: 2, FRA: 1 },
  });

  Object.assign(FM.D.NAT_MIX, { BE1: { BEL: 60, NED: 6, FRA: 5, SEN: 3, CIV: 3, GHA: 3, NGA: 3, MAR: 3, DEN: 2, NOR: 2, JPN: 2, COL: 2, BRA: 2, CRO: 2, SRB: 2 }, TR1: { TUR: 62, BRA: 4, NGA: 3, SEN: 3, CIV: 2, GHA: 2, POR: 3, NED: 2, SRB: 2, CRO: 2, ARG: 2, COL: 2, FRA: 2, GER: 2, MAR: 2, POL: 2, CZE: 1, GRE: 1, BEL: 1 }, CZ1: { CZE: 80, POL: 3, SRB: 2, CRO: 2, NGA: 2, GHA: 2, AUT: 2, GER: 1, SEN: 2, CIV: 2, BRA: 1, TUR: 1 }, GR1: { GRE: 58, SRB: 4, POR: 4, BRA: 4, ARG: 3, ESP: 3, CRO: 3, NGA: 2, SEN: 2, CIV: 2, NED: 2, POL: 2, MAR: 2, FRA: 2, COL: 2, URU: 2, CZE: 1, TUR: 1 }, NO1: { NOR: 80, DEN: 4, GHA: 3, NGA: 3, SEN: 2, USA: 2, CIV: 2, NED: 1, BEL: 1, POL: 1, SUI: 1 }, PL1: { POL: 70, CZE: 3, SRB: 3, CRO: 3, POR: 3, ESP: 3, BRA: 2, NGA: 2, GHA: 2, SEN: 2, NOR: 1, DEN: 1, GRE: 1, AUT: 1, TUR: 1, NED: 1, GER: 1 }, DK1: { DEN: 74, NOR: 4, NGA: 3, GHA: 3, SEN: 2, NED: 2, BEL: 2, USA: 2, CIV: 2, JPN: 1, KOR: 1, SUI: 1, POL: 1, AUT: 1, CZE: 1 }, AT1: { AUT: 64, GER: 8, SUI: 3, CRO: 3, SRB: 2, CZE: 2, POL: 2, NGA: 2, GHA: 2, CIV: 2, SEN: 2, MAR: 2, BRA: 2, JPN: 2, KOR: 2, DEN: 1, NOR: 1 }, CH1: { SUI: 62, FRA: 6, GER: 4, ITA: 4, AUT: 3, CRO: 2, SRB: 2, POR: 2, SEN: 2, CIV: 2, GHA: 2, NGA: 2, BRA: 2, COL: 2, CZE: 1, POL: 1, TUR: 1 }, SC1: { SCO: 58, ENG: 12, IRL: 6, WAL: 2, JPN: 3, KOR: 2, NOR: 2, DEN: 2, NED: 2, BEL: 1, NGA: 2, GHA: 2, USA: 2, CIV: 1, CRO: 1, POL: 1 } });
  FM.D.RIVALS.push(['CLB2', 'CER2', 'Brugse derby'], ['AND2', 'STL2', 'Classique'], ['GAL', 'FEN', 'Kıtalararası Derbi'], ['BJK', 'TS', 'Beşiktaş–Trabzon'], ['SLA2', 'SPA', 'Pražské derby'], ['OLY2', 'PAO', 'Derby of the Eternal Enemies'], ['PAOK', 'ARI', 'Thessaloniki derby'], ['RBK', 'MOL', 'Norwegian Clásico'], ['VIF', 'KFU', 'Oslo derby'], ['LEG2', 'LPO', 'Polish Classic'], ['CRA2', 'WID', 'Holy war rivals'], ['FCK', 'BIF', 'New Firm'], ['RAP2', 'FAK', 'Vienna derby'], ['STU', 'GAK', 'Graz derby'], ['BAS', 'FCZ', 'Klassiker'], ['GCZ', 'YB', 'Swiss classic'], ['CEL2', 'RAN2', 'Old Firm'], ['HEA', 'HIB', 'Edinburgh derby'], ['DUN2', 'DND', 'Dundee derby']);

  // ---------- Alpha 1: contracts, agents, promises, badges ----------
  FM.D.AGENTS = {
    Shark: { icon: '🦈', desc: 'Squeezes every dollar. Walks away quickly.', demand: 1.12, patience: 2, fee: 0.08, bonusW: 1 },
    Pragmatic: { icon: '🤝', desc: 'Reasonable, wants a fair deal.', demand: 1.0, patience: 4, fee: 0.05, bonusW: 1 },
    Family: { icon: '🏡', desc: 'A relative looking after him. Values security and long deals.', demand: 0.95, patience: 5, fee: 0.03, bonusW: 0.9, longDeal: true },
    Showman: { icon: '🎤', desc: 'Loves a headline number — big signing bonuses.', demand: 1.04, patience: 3, fee: 0.06, bonusW: 1.6 },
    Rookie: { icon: '🧢', desc: 'New to the game. Easy to deal with.', demand: 0.92, patience: 5, fee: 0.03, bonusW: 1 },
  };
  FM.D.AGENT_FIRMS = ['Apex Sports', 'Stellar Group', 'Blue Line Mgmt', 'Goldfoot Agency', 'Pinnacle Talent', 'Northstar Football', 'Premier Reps', 'Crest & Co.', 'Touchline Talent', 'Wembley Mgmt'];
  // Squad status: promised starts per season share, and what players expect relative to the squad
  FM.D.STATUS = {
    key: { label: 'Key player', share: 0.75, apps: 38 },
    regular: { label: 'Regular starter', share: 0.55, apps: 30 },
    rotation: { label: 'Rotation', share: 0.3, apps: 18 },
    backup: { label: 'Backup', share: 0.1, apps: 8 },
    prospect: { label: 'Prospect', share: 0.05, apps: 4 },
  };
  FM.D.BADGES = ['National C', 'Continental B', 'Continental A', 'Continental Pro'];
  FM.D.BADGE_COURSE = { 'Continental A': { cost: 6e4, days: 12, rep: 3 }, 'Continental Pro': { cost: 1.5e5, days: 18, rep: 5 } };
})();
