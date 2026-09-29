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
        'Gómez, Pérez, Sánchez, Ramírez, Torres, Flores, Ruiz, Castro, Ortiz, Molina, Silva, Rojas, Vega, Giménez, Aguirre, Cabrera, Ledesma, Quiroga, Ponce, Villalba, Peralta, Godoy'],
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

  // ---------- Domestic clubs (fictional) ----------
  // [name, short, city, primary, secondary, identity, rep, stadium, capacity]
  FM.D.CLUBS_D1 = [
    ['Kingsbridge City', 'KBC', 'Kingsbridge', '#6CABDD', '#1C2C5B', 'oil', 88, 'Crown Dock Stadium', 55000],
    ['Northgate Athletic', 'NGA', 'Northgate', '#C8102E', '#FFFFFF', 'giant', 86, 'The Old Forge', 61000],
    ['Westhaven County', 'WHC', 'Westhaven', '#034694', '#F2C200', 'historic', 79, 'Harbour Road', 44000],
    ['Castleton United', 'CAS', 'Castleton', '#7A263A', '#94BEE5', 'historic', 76, 'Castle Park', 42000],
    ['Harrowby Rovers', 'HAR', 'Harrowby', '#1B458F', '#FFFFFF', 'fan', 71, 'Mill Lane', 31000],
    ['Southmere Albion', 'SAL', 'Southmere', '#0057B8', '#FFFFFF', 'youth', 70, 'The Marina', 32000],
    ['Ashford Wanderers', 'ASH', 'Ashford', '#FDB913', '#231F20', 'selling', 68, 'Hopfield Road', 28000],
    ['Redbrook Forest', 'RBF', 'Redbrook', '#DD0000', '#FFFFFF', 'fallen', 67, 'The Glade', 36000],
    ['Eastport Dockers', 'EPD', 'Eastport', '#2B2B2B', '#E8E8E8', 'fan', 64, 'Quayside', 27000],
    ['Millbrook Town', 'MLT', 'Millbrook', '#F47A20', '#0A0A0A', 'selling', 62, 'Waterwheel Ground', 22000],
    ['Colwick Rangers', 'CLW', 'Colwick', '#00843D', '#FFFFFF', 'youth', 61, 'Colwick Green', 21000],
    ['Sheffold Park', 'SHP', 'Sheffold', '#6A1B9A', '#FFD54F', 'historic', 60, 'Steelworks Lane', 30000],
  ];
  FM.D.CLUBS_D2 = [
    ['Blackmoor City', 'BLM', 'Blackmoor', '#111111', '#D4AF37', 'fallen', 63, 'The Moor', 38000],
    ['Lowestone United', 'LOW', 'Lowestone', '#00A3E0', '#FFFFFF', 'oil', 58, 'Lighthouse Park', 18000],
    ['Aldergate Villa', 'ALV', 'Aldergate', '#670E36', '#95BFE5', 'historic', 58, 'Alder Park', 29000],
    ['Ravensworth', 'RAV', 'Ravensworth', '#222244', '#C0C0C0', 'fallen', 56, 'Ravens Nest', 26000],
    ['Greystone Athletic', 'GRA', 'Greystone', '#8A8D8F', '#C8102E', 'selling', 55, 'Quarry Lane', 16000],
    ['Thornbury FC', 'THB', 'Thornbury', '#E30613', '#FFE600', 'youth', 54, 'Thornbury Meadow', 14000],
    ['Saltmarsh City', 'SMC', 'Saltmarsh', '#0E7C86', '#FFFFFF', 'historic', 53, 'Estuary Park', 20000],
    ['Pembury Rovers', 'PEM', 'Pembury', '#1D3C8F', '#FFB81C', 'fan', 52, 'Kiln Road', 15000],
    ['Oakham Wanderers', 'OAK', 'Oakham', '#2E7D32', '#F5DEB3', 'youth', 51, 'The Acorn', 12000],
    ['Hartley Town', 'HRT', 'Hartley', '#B71C1C', '#1A237E', 'fan', 50, 'Hartley Lane', 13000],
    ['Fenwick Borough', 'FEN', 'Fenwick', '#FF6F00', '#004D40', 'selling', 49, 'Fen Road', 11000],
    ['Brackley Rangers', 'BRK', 'Brackley', '#3949AB', '#FFFFFF', 'fan', 48, 'Brackley Common', 10500],
  ];
  // Foreign league (fictional Spanish top flight) — full simulation
  FM.D.CLUBS_ES1 = [
    ['Real Almadena', 'RAL', 'Almadena', '#FFFFFF', '#4B2C85', 'giant', 88, 'Estadio del Rey', 72000],
    ['FC Costa Brava', 'FCB', 'Costa Brava', '#A50044', '#004D98', 'giant', 86, 'Camp de la Costa', 80000],
    ['Atlético Valtierra', 'ATV', 'Valtierra', '#CB3524', '#1B3A7A', 'historic', 80, 'Estadio Metrópoli', 60000],
    ['Athletic Arrieta', 'ATA', 'Arrieta', '#EE2523', '#FFFFFF', 'youth', 74, 'La Catedral Nueva', 50000],
    ['Real Guadalmar', 'RGM', 'Guadalmar', '#FFFFFF', '#D40E14', 'historic', 72, 'Estadio Guadalmar', 42000],
    ['Villaroja CF', 'VRJ', 'Villaroja', '#FFE667', '#005187', 'selling', 70, 'El Madrigalito', 23000],
    ['CF Marbelia', 'MRB', 'Marbelia', '#38BDF8', '#FFFFFF', 'oil', 69, 'Estadio Marítimo', 30000],
    ['Deportivo Galeira', 'DGL', 'Galeira', '#0067B1', '#FFFFFF', 'fallen', 66, 'Riazor Norte', 32000],
    ['RC Atlántico', 'RCA', 'Atlántico', '#8AC3EE', '#FFFFFF', 'selling', 64, 'Estadio Atlántico', 29000],
    ['Unión Levantina', 'ULV', 'Levantina', '#1E3A8A', '#B91C1C', 'fan', 62, 'Ciutat del Mar', 26000],
    ['Rayo Montaña', 'RYM', 'Montaña', '#FFFFFF', '#E11D48', 'fan', 60, 'Campo de la Montaña', 14000],
    ['CD Tenerio', 'TEN', 'Tenerio', '#FFFFFF', '#1D4ED8', 'fan', 58, 'Heliodoro Sur', 22000],
  ];


  // ---------- More leagues (fictional clubs) ----------
  FM.D.CLUBS_D3 = [
    ['Dunmore Athletic', 'DMA', 'Dunmore', '#1A1A1A', '#F2A900', 'fallen', 48, 'The Pit', 14000],
    ['Bramford Town', 'BRT', 'Bramford', '#00539F', '#FFFFFF', 'fan', 47, 'Bramford Road', 9000],
    ['Whitcombe United', 'WCU', 'Whitcombe', '#E4002B', '#FFFFFF', 'youth', 46, 'Mill Field', 8500],
    ['Linford Borough', 'LFB', 'Linford', '#7B2C3A', '#FFFFFF', 'historic', 46, 'Linford Lane', 10000],
    ['Northwick United', 'NWU', 'Northwick', '#C8102E', '#000000', 'fallen', 45, 'Northwick Stadium', 12000],
    ['Harbridge City', 'HBC', 'Harbridge', '#6CACE4', '#0B2265', 'selling', 45, 'Riverside', 8000],
    ['Cresswell Rovers', 'CRR', 'Cresswell', '#007A33', '#FFD100', 'fan', 44, 'Cresswell Park', 7500],
    ['Eldon Park Rangers', 'EPR', 'Eldon', '#0F7B3F', '#F1F1F1', 'historic', 44, 'Eldon Park', 9500],
    ['Marsden Town', 'MDT', 'Marsden', '#F37021', '#002D62', 'youth', 43, 'The Marsh', 6500],
    ['Stanwick FC', 'STW', 'Stanwick', '#003DA5', '#FFCD00', 'selling', 42, 'Stanwick Green', 6000],
    ['Tolbury Wanderers', 'TOL', 'Tolbury', '#5B2C83', '#FFFFFF', 'fan', 41, 'Priory Road', 5500],
    ['Castlegate Town', 'CGT', 'Castlegate', '#1D428A', '#C4CED4', 'youth', 40, 'Castlegate', 5000],
  ];
  FM.D.CLUBS_ES2 = [
    ['CD Montealto', 'MTA', 'Montealto', '#0033A0', '#FFFFFF', 'fallen', 56, 'Estadio Montealto', 24000],
    ['Real Castañar', 'RCS', 'Castañar', '#6A1B9A', '#FFFFFF', 'fallen', 55, 'Castañar', 20000],
    ['Racing Peñaverde', 'RPV', 'Peñaverde', '#00843D', '#FFFFFF', 'historic', 53, 'El Verdeo', 18000],
    ['Real Sierra Norte', 'RSN', 'Sierra Norte', '#37474F', '#FFC107', 'fallen', 52, 'Sierra Norte', 16000],
    ['CD Laguna Azul', 'CLA', 'Laguna Azul', '#0288D1', '#FFFFFF', 'historic', 51, 'La Laguna', 14000],
    ['UD Salinas', 'SLN', 'Salinas', '#FFD100', '#1E3A8A', 'fan', 50, 'Las Salinas', 12000],
    ['UD Costa Dorada', 'UCD', 'Costa Dorada', '#FF8F00', '#0D47A1', 'selling', 49, 'Costa Dorada', 11000],
    ['SD Almenara', 'ALM', 'Almenara', '#D50032', '#FFFFFF', 'youth', 48, 'Almenara', 9000],
    ['CF Torreblanca', 'TRB', 'Torreblanca', '#FFFFFF', '#000000', 'selling', 47, 'Torreblanca', 8000],
    ['Deportivo Arenales', 'DAR', 'Arenales', '#1565C0', '#FFFFFF', 'fan', 46, 'El Pinar', 7000],
    ['CD Robledo', 'ROB', 'Robledo', '#C62828', '#FFEB3B', 'youth', 45, 'Robledo', 6500],
    ['Atlético Ribagorza', 'ARB', 'Ribagorza', '#B71C1C', '#1B5E20', 'fan', 44, 'Ribagorza', 6000],
  ];
  FM.D.CLUBS_DE1 = [
    ['FC Rheinstadt', 'RHS', 'Rheinstadt', '#DC052D', '#FFFFFF', 'giant', 88, 'Rheinarena', 75000],
    ['Borussia Westfalen', 'BWF', 'Westfalen', '#FDE100', '#000000', 'fan', 84, 'Westfalenpark', 81000],
    ['SV Elbhafen', 'SVE', 'Elbhafen', '#00529F', '#FFFFFF', 'historic', 76, 'Elbstadion', 57000],
    ['RB Leinefeld', 'RBL', 'Leinefeld', '#DD0741', '#FFFFFF', 'oil', 75, 'Leine Arena', 47000],
    ['VfB Neckartal', 'VNT', 'Neckartal', '#E32219', '#FFFFFF', 'historic', 74, 'Neckarstadion', 60000],
    ['Eintracht Mainau', 'EMA', 'Mainau', '#000000', '#E1000F', 'fan', 72, 'Waldstadion Süd', 51000],
    ['TSV Isartal', 'TSI', 'Isartal', '#0066B3', '#FFFFFF', 'youth', 66, 'Isartal Park', 30000],
    ['Fortuna Rheinufer', 'FRU', 'Rheinufer', '#D41B2C', '#FFFFFF', 'fallen', 64, 'Rheinufer', 54000],
    ['1. FC Hafenberg', 'FCH', 'Hafenberg', '#7A0019', '#FFFFFF', 'selling', 63, 'Hafenberg', 34000],
    ['SC Schwarzwald', 'SCS', 'Schwarzwald', '#C00000', '#000000', 'youth', 62, 'Dreisamtal', 34000],
    ['VfL Ostheide', 'VFO', 'Ostheide', '#65B32E', '#FFFFFF', 'selling', 61, 'Ostheide Arena', 30000],
    ['Union Spreeufer', 'USU', 'Spreeufer', '#EB1923', '#FFFFFF', 'fan', 60, 'An der Spree', 22000],
  ];
  FM.D.CLUBS_FR1 = [
    ['Paris Olympique', 'POL', 'Paris', '#004170', '#DA291C', 'oil', 89, 'Parc Royal', 48000],
    ['Olympique Marais', 'OMR', 'Marais', '#2FAEE0', '#FFFFFF', 'giant', 82, 'Vélodrome Sud', 67000],
    ['AS Rhône', 'ASR', 'Rhône', '#DA291C', '#0A2240', 'historic', 76, 'Stade du Rhône', 59000],
    ['AS Riviera', 'ASV', 'Riviera', '#E30613', '#FFFFFF', 'oil', 74, 'Stade Riviera', 18000],
    ['Olympique Flandres', 'OFL', 'Flandres', '#E01E13', '#1B2C5A', 'selling', 72, 'Stade Flandres', 50000],
    ['Stade Armorique', 'STA', 'Armorique', '#E2001A', '#000000', 'youth', 70, "Route d'Armor", 29000],
    ['RC Houillères', 'RCH', 'Houillères', '#FFD100', '#E30613', 'fan', 66, 'Stade des Mines', 38000],
    ['FC Loire', 'FCL', 'Loire', '#FCD405', '#009A44', 'historic', 64, 'Stade de la Loire', 35000],
    ['OGC Azur', 'OGA', 'Azur', '#CE1126', '#000000', 'selling', 63, 'Stade Azur', 36000],
    ['FC Alsace', 'FCA', 'Alsace', '#0056A6', '#FFFFFF', 'fan', 61, 'Stade du Rhin', 29000],
    ['SC Garrigue', 'SCG', 'Garrigue', '#FF6A13', '#00247D', 'selling', 60, 'La Garrigue', 32000],
    ['Stade Champagne', 'SCH', 'Champagne', '#E30613', '#FFFFFF', 'youth', 59, 'Stade Auguste', 21000],
  ];
  FM.D.CLUBS_BR1 = [
    ['CR Guanabara', 'CRG', 'Guanabara', '#D6001C', '#000000', 'giant', 84, 'Estádio Guanabara', 78000],
    ['SE Paulistana', 'SEP', 'Paulistana', '#006437', '#FFFFFF', 'giant', 82, 'Arena Paulistana', 43000],
    ['SC Corinto', 'SCC', 'Corinto', '#000000', '#FFFFFF', 'historic', 80, 'Arena Corinto', 49000],
    ['EC Tricolor', 'ECT', 'Tricolor', '#E4002B', '#FFFFFF', 'historic', 78, 'Estádio do Planalto', 66000],
    ['Grêmio Sulino', 'GSU', 'Sulino', '#0D80BF', '#000000', 'historic', 76, 'Arena Sulina', 55000],
    ['SC Colorado', 'SCO', 'Colorado', '#E30613', '#FFFFFF', 'historic', 75, 'Estádio Colorado', 50000],
    ['Atlético Serrano', 'SER', 'Belo Serrano', '#000000', '#FFFFFF', 'historic', 72, 'Estádio Serrano', 46000],
    ['AA Alvinegra', 'AAL', 'Alvinegra', '#000000', '#FFFFFF', 'oil', 71, 'Estádio Alvinegro', 44000],
    ['EC Estrela Azul', 'EEA', 'Estrela', '#0033A0', '#FFFFFF', 'fallen', 70, 'Estádio Estrela', 60000],
    ['EC Porto Verde', 'PVE', 'Porto Verde', '#00A650', '#FFDF00', 'selling', 66, 'Arena Verde', 30000],
    ['EC Nordeste', 'ECN', 'Nordeste', '#1F3B8E', '#E30613', 'fan', 64, 'Arena Nordeste', 63000],
    ['EC Baiano', 'ECB', 'Baiano', '#004A99', '#E30613', 'fan', 63, 'Arena Baiana', 48000],
  ];
  // League list: [compId, clubs, nation] — the world builder reads this
  FM.D.LEAGUE_CLUBS = [['D1', 'CLUBS_D1', 'ENG'], ['D2', 'CLUBS_D2', 'ENG'], ['D3', 'CLUBS_D3', 'ENG'], ['ES1', 'CLUBS_ES1', 'ESP'], ['ES2', 'CLUBS_ES2', 'ESP'], ['DE1', 'CLUBS_DE1', 'GER'], ['FR1', 'CLUBS_FR1', 'FRA'], ['BR1', 'CLUBS_BR1', 'BRA']];
  FM.D.allClubRows = () => FM.D.LEAGUE_CLUBS.flatMap(([, k]) => FM.D[k]);

  // National team kit colours
  FM.D.NT_COLORS = { ENG: ['#FFFFFF', '#CE1124'], BRA: ['#FFDF00', '#009C3B'], ARG: ['#75AADB', '#FFFFFF'], JPN: ['#1B2A6B', '#FFFFFF'], KOR: ['#C60C30', '#003478'], THA: ['#241D4F', '#A51931'], SRB: ['#C6363C', '#0C4076'], FRA: ['#002654', '#ED2939'], ESP: ['#AA151B', '#F1BF00'], NGA: ['#008751', '#FFFFFF'], POR: ['#8B0000', '#006600'], NED: ['#FF6600', '#FFFFFF'], GER: ['#FFFFFF', '#000000'], BEL: ['#E30613', '#000000'], IRL: ['#169B62', '#FFFFFF'], SCO: ['#0065BF', '#FFFFFF'], WAL: ['#C8102E', '#00B140'], URU: ['#5CBFEB', '#000000'], COL: ['#FCD116', '#003893'], SEN: ['#FFFFFF', '#00853F'], GHA: ['#FFFFFF', '#006B3F'], CIV: ['#F77F00', '#009E60'], MAR: ['#C1272D', '#006233'], USA: ['#FFFFFF', '#0A3161'], DEN: ['#C8102E', '#FFFFFF'], NOR: ['#BA0C2F', '#00205B'], CRO: ['#FF0000', '#FFFFFF'], ITA: ['#0066B3', '#FFFFFF'] };

  FM.D.RIVALS = [['RHS', 'BWF', 'Das Gipfeltreffen'], ['SVE', 'FCH', 'Nordderby'], ['VNT', 'SCS', 'Südwest-Derby'], ['EMA', 'FRU', 'Rhein-Main-Derby'], ['RBL', 'USU', 'Ost-Derby'], ['VFO', 'TSI', 'Heide-Derby'],
    ['POL', 'OMR', 'Le Grand Choc'], ['ASR', 'ASV', 'Derby Rhône-Riviera'], ['OFL', 'RCH', 'Derby du Nord'], ['STA', 'FCL', "Derby de l'Ouest"], ['OGA', 'SCG', 'Derby du Sud'], ['SCH', 'FCA', "Derby de l'Est"],
    ['CRG', 'AAL', 'Clássico Carioca'], ['SEP', 'SCC', 'Derby Paulista'], ['GSU', 'SCO', 'Clássico Gaúcho'], ['SER', 'EEA', 'Clássico Mineiro'], ['ECN', 'ECB', 'Clássico do Nordeste'], ['PVE', 'ECT', 'Clássico do Interior'],
    ['DMA', 'NWU', 'Old Mill Derby'], ['BRT', 'CRR', 'County Derby'], ['WCU', 'MDT', 'Moor Derby'], ['LFB', 'EPR', 'Borough Derby'], ['HBC', 'STW', 'Estuary Derby'], ['TOL', 'CGT', 'Priory Derby'],
    ['MTA', 'RSN', 'Derbi Serrano'], ['RCS', 'RPV', 'Derbi Verde'], ['CLA', 'SLN', 'Derbi Costero Sur'], ['UCD', 'TRB', 'Derbi de la Costa'], ['ALM', 'ROB', 'Derbi Rural'], ['DAR', 'ARB', 'Derbi del Pirineo'],['RAL', 'ATV', 'Derbi Capitalino'], ['FCB', 'ULV', 'Derbi Costero'], ['RGM', 'MRB', 'Derbi del Sur'], ['DGL', 'RCA', 'Derbi Atlántico'], ['ATA', 'VRJ', 'Derbi del Norte'], ['TEN', 'RYM', 'Derbi Insular'],['KBC', 'NGA', 'Kingsbridge Derby'], ['CAS', 'RBF', 'Old Road Derby'], ['HAR', 'EPD', 'Dockside Derby'], ['SAL', 'ASH', 'South Coast Derby'], ['WHC', 'BLM', 'Western Derby'], ['MLT', 'CLW', 'Valley Derby'], ['SHP', 'SMC', 'Steel & Salt Derby'], ['ALV', 'GRA', 'Midlands Derby'], ['THB', 'OAK', 'Country Derby'], ['PEM', 'HRT', 'Kiln Derby'], ['LOW', 'RAV', 'Coastal Derby'], ['FEN', 'BRK', 'Fens Derby']];

  // Overseas clubs — "minimal simulation" tier: squads exist for scouting, no fixtures.
  FM.D.CLUBS_OVERSEAS = [
    ['CA Ribera', 'RIB', 'ARG', '#0033A0', '#FFD100', 63], ['Deportivo Pampas', 'PAM', 'ARG', '#D50000', '#FFFFFF', 56],
    ['Mizuho Blaze', 'MIZ', 'JPN', '#E60012', '#000000', 60], ['Kanazawa Sparks', 'KNZ', 'JPN', '#1E3A8A', '#FACC15', 54],
    ['Seongnam Tigers', 'SNT', 'KOR', '#F97316', '#111827', 55], ['Lanna United', 'LAN', 'THA', '#7C3AED', '#FDE047', 48],
    ['FK Dunav', 'DUN', 'SRB', '#B91C1C', '#FFFFFF', 57], ['FK Zvezdara', 'ZVE', 'SRB', '#1F2937', '#E5E7EB', 50],
    ['Olympique Rivage', 'RIV', 'FRA', '#0EA5E9', '#FFFFFF', 62], ['FC Lumière', 'LUM', 'FRA', '#FBBF24', '#1E293B', 55],
    ['CD Serranía', 'SRN', 'ESP', '#16A34A', '#FFFFFF', 59],
    ['Ikoyi Stars', 'IKO', 'NGA', '#15803D', '#FFFFFF', 50], ['Niger Delta FC', 'NDF', 'NGA', '#0369A1', '#F59E0B', 46],
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
    ['Inter Lombarda', 'ILO', 'Lombarda', '#0068A8', '#000000', 'giant', 85, 'Stadio della Scala', 75000],
    ['FC Taurina', 'TAU', 'Taurina', '#FFFFFF', '#000000', 'giant', 84, 'Stadio delle Alpi Nuovo', 41000],
    ['AC Meneghina', 'ACM', 'Meneghina', '#FB090B', '#000000', 'giant', 83, 'Stadio Meneghino', 75000],
    ['SS Partenope', 'PAR', 'Partenope', '#12A0D7', '#FFFFFF', 'historic', 80, 'Stadio del Golfo', 54000],
    ['AS Capitolina', 'CAP', 'Capitolina', '#8E1F2F', '#F0BC42', 'historic', 78, 'Stadio dei Cesari', 70000],
    ['Atletica Orobica', 'ORO', 'Orobica', '#1E71B8', '#000000', 'selling', 76, 'Arena Orobica', 24000],
    ['ACF Gigliata', 'GIG', 'Gigliata', '#482E92', '#FFFFFF', 'historic', 72, 'Stadio del Giglio', 43000],
    ['SS Aquilotti', 'AQU', 'Aquila', '#87D8F7', '#FFFFFF', 'historic', 71, "Stadio dell'Aquila", 50000],
    ['FC Felsinea', 'FEL', 'Felsinea', '#1A2F48', '#A21C26', 'youth', 68, 'Stadio Felsineo', 38000],
    ['CFC Lanterna', 'LTN', 'Lanterna', '#A6192E', '#002E5D', 'fan', 64, 'Stadio della Lanterna', 36000],
  ];
  FM.D.CLUBS_NL1 = [
    ['AFC Amstel', 'AMS', 'Amstel', '#D2122E', '#FFFFFF', 'giant', 80, 'Amstel Arena', 55000],
    ['SV Lichtstad', 'LIC', 'Lichtstad', '#ED1C24', '#FFFFFF', 'oil', 77, 'Lichtstadion', 35000],
    ['SC Maasstad', 'MAA', 'Maasstad', '#FF0000', '#FFFFFF', 'fan', 76, 'Maasstadion', 47000],
    ['AZ Polder', 'AZP', 'Polder', '#DB0021', '#FFFFFF', 'selling', 70, 'Polderstadion', 19000],
    ['FC Twentestad', 'TWS', 'Twentestad', '#E30613', '#FFFFFF', 'historic', 68, 'De Veste', 30000],
    ['FC Domstad', 'DOM', 'Domstad', '#E30613', '#FFFFFF', 'fan', 65, 'Domstadion', 23000],
    ['SC Friesland', 'FRI', 'Friesland', '#0055A4', '#FFFFFF', 'youth', 62, 'Friese Arena', 26000],
    ['SBV Veluwe', 'VEL', 'Veluwe', '#FFD700', '#000000', 'fallen', 60, 'Veluwedome', 21000],
    ['FC Groningerland', 'GRO', 'Groningerland', '#008000', '#FFFFFF', 'historic', 59, 'Noorderpark', 22000],
    ['Sparta Deltastad', 'SPD', 'Deltastad', '#E4002B', '#FFFFFF', 'youth', 56, 'Deltakasteel', 11000],
  ];
  FM.D.CLUBS_PT1 = [
    ['SL Encarnada', 'ENC', 'Encarnada', '#E30613', '#FFFFFF', 'giant', 82, 'Estádio da Águia', 65000],
    ['FC Invicta', 'INV', 'Invicta', '#003893', '#FFFFFF', 'giant', 81, 'Estádio Invicto', 50000],
    ['Sporting Leonino', 'LEO', 'Leonino', '#008057', '#FFFFFF', 'historic', 79, 'Estádio do Leão', 50000],
    ['SC Minho', 'MIN', 'Minho', '#E30613', '#FFFFFF', 'selling', 71, 'Estádio do Minho', 30000],
    ['Vitória Berço', 'BER', 'Berço', '#FFFFFF', '#000000', 'fan', 65, 'Estádio do Berço', 30000],
    ['Axadrezados FC', 'AXA', 'Porto Velho', '#000000', '#FFFFFF', 'fallen', 60, 'Estádio Axadrez', 28000],
    ['CD Madeirense', 'MAD', 'Madeirense', '#006633', '#FFFFFF', 'historic', 58, 'Estádio Insular', 11000],
    ['GD Costa do Sol', 'CSO', 'Costa do Sol', '#FFDD00', '#0038A8', 'youth', 57, 'Estádio da Costa', 8000],
    ['FC Ribeirinho', 'RBE', 'Ribeirinho', '#003DA5', '#FFFFFF', 'selling', 56, 'Estádio Ribeirinho', 5000],
    ['CD Barcelense', 'BCL', 'Barcelense', '#E30613', '#0033A0', 'fan', 54, 'Estádio Cidade', 12000],
  ];
  FM.D.CLUBS_AR1 = [
    ['CA Millonario', 'MIL', 'Millonario', '#FFFFFF', '#E30613', 'giant', 77, 'Estadio del Río', 84000],
    ['CA Ribera', 'RIB', 'Ribera', '#0033A0', '#FFD100', 'giant', 76, 'Estadio de la Ribera', 54000],
    ['Racing Albiceleste', 'RAC', 'Albiceleste', '#6CACE4', '#FFFFFF', 'historic', 68, 'Estadio Cilíndrico', 51000],
    ['CA Independencia', 'IND', 'Independencia', '#E30613', '#FFFFFF', 'fallen', 66, 'Estadio Libertad', 48000],
    ['CA Santo Domingo', 'SDO', 'Santo Domingo', '#0033A0', '#E30613', 'historic', 64, 'Estadio del Gasómetro', 47000],
    ['Estudiantil Platense', 'EST', 'Platense', '#E30613', '#FFFFFF', 'youth', 63, 'Estadio Universitario', 30000],
    ['CA Fortín', 'FOR', 'Fortín', '#FFFFFF', '#0033A0', 'youth', 62, 'Estadio del Fortín', 49000],
    ['CA Canalla', 'CAN', 'Canalla', '#FFD100', '#003DA5', 'fan', 61, 'Gigante Canalla', 41000],
    ['Club Rojinegro', 'ROJ', 'Rojinegro', '#E30613', '#000000', 'fan', 60, 'Coloso del Parque', 42000],
    ['Deportivo Pampas', 'PAM', 'Pampas', '#D50000', '#FFFFFF', 'selling', 56, 'Estadio Pampeano', 22000],
  ];
  FM.D.CLUBS_US1 = [
    ['Los Angeles Stars', 'LAS', 'Los Angeles', '#00245D', '#FFD200', 'oil', 66, 'Starlight Park', 27000],
    ['Miami Flamingos', 'MIA', 'Miami', '#F7B5CD', '#231F20', 'oil', 65, 'Biscayne Park', 21000],
    ['New York Metros', 'NYM', 'New York', '#E31351', '#1A2B4C', 'oil', 64, 'Hudson Arena', 25000],
    ['Seattle Sounds', 'SEA', 'Seattle', '#5D9741', '#005595', 'fan', 63, 'Emerald Field', 37000],
    ['Atlanta Firebirds', 'ATF', 'Atlanta', '#80000A', '#A19060', 'fan', 62, 'Peachtree Stadium', 42000],
    ['Philadelphia Liberty', 'PHL', 'Philadelphia', '#071B2C', '#B19B69', 'youth', 59, 'Liberty Field', 18500],
    ['Columbus Crewmen', 'CLB', 'Columbus', '#FEF200', '#000000', 'historic', 58, 'Buckeye Field', 20000],
    ['Portland Pines', 'PTP', 'Portland', '#004812', '#D69A00', 'fan', 58, 'Timberline Park', 25000],
    ['Kansas City Plains', 'KCP', 'Kansas City', '#91B0D5', '#002F65', 'youth', 57, 'Prairie Park', 18000],
    ['Austin Oaks', 'AUS', 'Austin', '#00B140', '#000000', 'selling', 55, 'Live Oak Stadium', 20000],
  ];
  FM.D.CLUBS_JP1 = [
    ['Mizuho Blaze', 'MIZ', 'Mizuho', '#E60012', '#000000', 'giant', 64, 'Mizuho Stadium', 63000],
    ['Yokohama Anchors', 'YOK', 'Yokohama', '#0033A0', '#FFFFFF', 'oil', 63, 'Minato Arena', 72000],
    ['Ibaraki Stags', 'IBA', 'Ibaraki', '#B8002D', '#1D2088', 'historic', 62, 'Stag Stadium', 40000],
    ['Kawasaki Current', 'KAW', 'Kawasaki', '#1E90FF', '#000000', 'historic', 62, 'Tamagawa Park', 26000],
    ['Osaka Swallows', 'OSA', 'Osaka', '#1A3D8F', '#000000', 'historic', 60, 'Suita Arena', 39000],
    ['Nagoya Shachi', 'NAG', 'Nagoya', '#D6000F', '#F9A61A', 'fan', 58, 'Castle Stadium', 43000],
    ['Hiroshima Arrows', 'HIR', 'Hiroshima', '#50318F', '#FFFFFF', 'youth', 58, 'Peace Park Stadium', 28000],
    ['Kanazawa Sparks', 'KNZ', 'Kanazawa', '#1E3A8A', '#FACC15', 'selling', 55, 'Kenrokuen Field', 20000],
    ['Sapporo Owls', 'SAP', 'Sapporo', '#E60012', '#000000', 'fan', 54, 'Snow Dome', 40000],
    ['Fukuoka Wasps', 'FUK', 'Fukuoka', '#1C1C7C', '#AAAAAA', 'youth', 53, 'Hakata Forest', 21000],
  ];
  // Minimal tier (8 clubs): [name, short, city, primary, secondary, identity, rep]
  FM.D.CLUBS_MX1 = [
    ['Águilas Capitalinas', 'AGC', 'Ciudad Capital', '#FFD100', '#0033A0', 'giant', 68], ['Rayados de la Sultana', 'RAY', 'Sultana', '#0B2240', '#FFFFFF', 'oil', 67],
    ['CD Rebaño', 'REB', 'Tapatía', '#E30613', '#FFFFFF', 'historic', 66], ['Felinos del Norte', 'FNT', 'Nuevo Norte', '#FDB913', '#003DA5', 'oil', 66],
    ['Club Cementeros', 'CEM', 'La Noria', '#0033A0', '#FFFFFF', 'historic', 64], ['Club Universitarios', 'UNI', 'Pedregal', '#0B2240', '#C5A45A', 'youth', 62],
    ['Club Mineros', 'MNR', 'Real del Monte', '#0033A0', '#FFFFFF', 'selling', 61], ['Club Escarlata', 'ESC', 'Valle Alto', '#E30613', '#FFFFFF', 'fan', 60],
  ];
  FM.D.CLUBS_NG1 = [
    ['Aba Elephants', 'ABA', 'Aba', '#003DA5', '#FFFFFF', 'giant', 54], ['Kano Sahel', 'KAN', 'Kano', '#FFD100', '#006400', 'historic', 51],
    ['Ikoyi Stars', 'IKO', 'Lagos', '#15803D', '#FFFFFF', 'selling', 50], ['Enugu Antelopes', 'ENU', 'Enugu', '#E30613', '#FFFFFF', 'historic', 50],
    ['Lagos Lagoon', 'LAG', 'Lagos', '#7C3AED', '#FFFFFF', 'oil', 49], ['Ibadan Comets', 'IBD', 'Ibadan', '#003DA5', '#FFFFFF', 'fan', 48],
    ['Niger Delta FC', 'NDF', 'Port Harcourt', '#0369A1', '#F59E0B', 'fan', 46], ['Jos Highlanders', 'JOS', 'Jos', '#E30613', '#FFD100', 'youth', 46],
  ];
  FM.D.CLUBS_KR1 = [
    ['Jeonju Motors', 'JEO', 'Jeonju', '#00843D', '#FFD100', 'giant', 60], ['Ulsan Whales', 'ULS', 'Ulsan', '#003DA5', '#FFD100', 'oil', 59],
    ['Pohang Ironmen', 'POH', 'Pohang', '#E30613', '#000000', 'historic', 57], ['Seoul Capital FC', 'SEO', 'Seoul', '#E30613', '#000000', 'historic', 57],
    ['Seongnam Tigers', 'SNT', 'Seongnam', '#F97316', '#111827', 'selling', 55], ['Suwon Fortress', 'SUW', 'Suwon', '#003DA5', '#FFFFFF', 'fallen', 54],
    ['Daegu Sky', 'DAE', 'Daegu', '#87CEEB', '#1C2B4F', 'youth', 52], ['Incheon Harbour', 'INC', 'Incheon', '#003DA5', '#000000', 'fan', 51],
  ];
  FM.D.CLUBS_TH1 = [
    ['Buriram Thunder', 'BUR', 'Buriram', '#003DA5', '#FFD100', 'oil', 54], ['Bangkok Tigers', 'BKK', 'Bangkok', '#E30613', '#FFFFFF', 'historic', 50],
    ['Nonthaburi Kirin', 'NON', 'Nonthaburi', '#E30613', '#000000', 'fan', 50], ['Lanna United', 'LAN', 'Chiang Mai', '#7C3AED', '#FDE047', 'youth', 48],
    ['Chonburi Sharks', 'CHB', 'Chonburi', '#0055A4', '#FFFFFF', 'historic', 48], ['Klong Toey Port', 'KLT', 'Klong Toey', '#FF7F00', '#003DA5', 'fan', 47],
    ['Ratchaburi Dragons', 'RAT', 'Ratchaburi', '#E30613', '#FFD100', 'youth', 45], ['Chiang Rai Stars', 'CHR', 'Chiang Rai', '#003DA5', '#FFFFFF', 'youth', 45],
  ];
  FM.D.CLUBS_RS1 = [
    ['FK Crvena Zora', 'CZO', 'Beograd', '#E30613', '#FFFFFF', 'giant', 62], ['FK Stražar', 'STR', 'Beograd', '#000000', '#FFFFFF', 'giant', 60],
    ['FK Dunav', 'DUN', 'Novi Beograd', '#B91C1C', '#FFFFFF', 'historic', 57], ['FK Panonija', 'PAN', 'Novi Sad', '#E30613', '#FFFFFF', 'historic', 55],
    ['TSC Bačka', 'BAC', 'Bačka Topola', '#003DA5', '#FFFFFF', 'oil', 53], ['FK Ada', 'ADA', 'Ada', '#000000', '#FFD100', 'youth', 52],
    ['FK Zvezdara', 'ZVE', 'Zvezdara', '#1F2937', '#E5E7EB', 'youth', 50], ['FK Niška Tvrđava', 'NIS', 'Niš', '#E30613', '#003DA5', 'fan', 50],
  ];
  FM.D.CLUBS_MA1 = [
    ['Casablanca Verts', 'CAV', 'Casablanca', '#00843D', '#FFFFFF', 'giant', 58], ['Casablanca Rouges', 'CAR', 'Casablanca', '#E30613', '#FFFFFF', 'giant', 58],
    ['AS Rabat Capitale', 'RBT', 'Rabat', '#003DA5', '#E30613', 'historic', 55], ['Renaissance Orientale', 'ORI', 'Berkane', '#FF7F00', '#000000', 'oil', 54],
    ['Maghreb Fès', 'FES', 'Fès', '#FFD100', '#000000', 'historic', 50], ['Souss Atlas', 'SOU', 'Agadir', '#E30613', '#FFD100', 'fan', 48],
    ['Détroit Tanger', 'TNG', 'Tanger', '#003DA5', '#FFFFFF', 'youth', 48], ['Atlantique Safi', 'SAF', 'Safi', '#003DA5', '#FFFFFF', 'fan', 46],
  ];
  // Overseas clubs now living in a league tier are removed from the unattached list
  FM.D.CLUBS_OVERSEAS = FM.D.CLUBS_OVERSEAS.filter((r) => ['RIV', 'LUM', 'SRN'].includes(r[1]));

  // Every league, data-driven. repBand = the reputation range a league's clubs drift toward.
  // Continental places: Europe 16 (ENG/ESP/GER/ITA 3, FRA 2, POR 1, NED 1); South America 8; Asia, Africa, North America 8 each.
  FM.D.LEAGUES = [
    { id: 'D1', nat: 'ENG', name: 'Premier Division', short: 'PD', tier: 1, sim: 'full', clubs: 'CLUBS_D1', repBand: [88, 60], rules: { relegate: { to: 'D2', n: 3 }, qualify: { to: 'CC', n: 3 } } },
    { id: 'D2', nat: 'ENG', name: 'The Championship', short: 'CH', tier: 2, sim: 'full', clubs: 'CLUBS_D2', repBand: [62, 46], rules: { promote: { to: 'D1', auto: 2, playoff: [3, 6] }, relegate: { to: 'D3', n: 3 } } },
    { id: 'D3', nat: 'ENG', name: 'League One', short: 'L1', tier: 3, sim: 'full', clubs: 'CLUBS_D3', repBand: [50, 38], rules: { promote: { to: 'D2', auto: 2, playoff: [3, 6] } } },
    { id: 'ES1', nat: 'ESP', name: 'La Primera', short: 'LP', tier: 1, sim: 'full', clubs: 'CLUBS_ES1', repBand: [88, 60], rules: { relegate: { to: 'ES2', n: 3 }, qualify: { to: 'CC', n: 3 } } },
    { id: 'ES2', nat: 'ESP', name: 'La Segunda', short: 'LS', tier: 2, sim: 'full', clubs: 'CLUBS_ES2', repBand: [62, 46], rules: { promote: { to: 'ES1', auto: 2, playoff: [3, 6] } } },
    { id: 'DE1', nat: 'GER', name: 'Erste Liga', short: 'EL', tier: 1, sim: 'full', clubs: 'CLUBS_DE1', repBand: [88, 60], rules: { qualify: { to: 'CC', n: 3 } } },
    { id: 'FR1', nat: 'FRA', name: 'Première Ligue', short: 'PL', tier: 1, sim: 'full', clubs: 'CLUBS_FR1', repBand: [88, 60], rules: { qualify: { to: 'CC', n: 2 } } },
    { id: 'BR1', nat: 'BRA', name: 'Série Nacional', short: 'SN', tier: 1, sim: 'full', clubs: 'CLUBS_BR1', repBand: [84, 62], rules: { qualify: { to: 'CL', n: 5 } } },
    { id: 'IT1', nat: 'ITA', name: 'Serie Maggiore', short: 'SM', tier: 1, sim: 'light', clubs: 'CLUBS_IT1', repBand: [85, 62], rules: { qualify: { to: 'CC', n: 3 } } },
    { id: 'PT1', nat: 'POR', name: 'Divisão de Elite', short: 'DE', tier: 1, sim: 'light', clubs: 'CLUBS_PT1', repBand: [80, 54], rules: { qualify: { to: 'CC', n: 1 } } },
    { id: 'NL1', nat: 'NED', name: 'Nationale Hoofdklasse', short: 'NH', tier: 1, sim: 'light', clubs: 'CLUBS_NL1', repBand: [78, 56], rules: { qualify: { to: 'CC', n: 1 } } },
    { id: 'AR1', nat: 'ARG', name: 'Torneo Nacional', short: 'TN', tier: 1, sim: 'light', clubs: 'CLUBS_AR1', repBand: [76, 56], rules: { qualify: { to: 'CL', n: 3 } } },
    { id: 'US1', nat: 'USA', name: 'Premier Soccer League', short: 'PSL', tier: 1, sim: 'light', clubs: 'CLUBS_US1', repBand: [66, 54], rules: { qualify: { to: 'NC', n: 4 } } },
    { id: 'JP1', nat: 'JPN', name: 'Nippon Premier', short: 'NP', tier: 1, sim: 'light', clubs: 'CLUBS_JP1', repBand: [64, 52], rules: { qualify: { to: 'AC', n: 4 } } },
    { id: 'MX1', nat: 'MEX', name: 'Primera Federal', short: 'PF', tier: 1, sim: 'minimal', clubs: 'CLUBS_MX1', repBand: [68, 58], rules: { qualify: { to: 'NC', n: 4 } } },
    { id: 'KR1', nat: 'KOR', name: 'K-Premier', short: 'KP', tier: 1, sim: 'minimal', clubs: 'CLUBS_KR1', repBand: [60, 50], rules: { qualify: { to: 'AC', n: 2 } } },
    { id: 'TH1', nat: 'THA', name: 'Thai Premier', short: 'TP', tier: 1, sim: 'minimal', clubs: 'CLUBS_TH1', repBand: [54, 44], rules: { qualify: { to: 'AC', n: 2 } } },
    { id: 'NG1', nat: 'NGA', name: 'Nigerian Super League', short: 'NSL', tier: 1, sim: 'minimal', clubs: 'CLUBS_NG1', repBand: [54, 44], rules: { qualify: { to: 'AF', n: 4 } } },
    { id: 'MA1', nat: 'MAR', name: 'Ligue Marocaine Élite', short: 'LME', tier: 1, sim: 'minimal', clubs: 'CLUBS_MA1', repBand: [58, 46], rules: { qualify: { to: 'AF', n: 4 } } },
    { id: 'RS1', nat: 'SRB', name: 'Srpska Elita', short: 'SE', tier: 1, sim: 'minimal', clubs: 'CLUBS_RS1', repBand: [62, 48], rules: {} },
  ];
  FM.D.CONTINENTALS = [
    { id: 'CC', region: 'Europe', name: 'Continental Champions Cup', short: 'CCC', prize: 15e6 },
    { id: 'CL', region: 'South America', name: 'Copa Continental', short: 'CCO', prize: 8e6 },
    { id: 'AC', region: 'Asia', name: 'Asian Champions Cup', short: 'ACC', prize: 5e6 },
    { id: 'AF', region: 'Africa', name: 'African Champions League', short: 'ACL', prize: 3e6 },
    { id: 'NC', region: 'North America', name: 'North American Champions Cup', short: 'NACC', prize: 4e6 },
  ];
  // Club World Cup: last season's continental finalists (winners only from Africa and North America)
  // [competition, 0 = winner / 1 = runner-up], in seed order
  FM.D.CWC_SEEDS = [['CC', 0], ['CL', 0], ['CC', 1], ['CL', 1], ['AC', 0], ['AF', 0], ['NC', 0], ['AC', 1]];
  // Squad sizes per tier (+ academy prospects)
  FM.D.SQUAD_TIER = {
    full: { GK: 2, CB: 4, FB: 4, DM: 2, CM: 3, AM: 2, W: 3, ST: 2 },
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
  FM.D.RIVALS.push(['ILO', 'ACM', 'Derby della Scala'], ['CAP', 'AQU', 'Derby della Capitale'], ['AMS', 'MAA', 'Het Grote Duel'], ['ENC', 'LEO', 'Dérbi da Capital'], ['RIB', 'MIL', 'Superclásico del Río'], ['RAC', 'IND', 'Clásico del Sur'], ['CAN', 'ROJ', 'Clásico del Litoral'], ['NYM', 'PHL', 'Corridor Derby'], ['YOK', 'KAW', 'Keihin Derby'], ['CAV', 'CAR', 'Derby de Casablanca'], ['CZO', 'STR', 'Večiti Derbi'], ['AGC', 'REB', 'Clásico Federal']);

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
