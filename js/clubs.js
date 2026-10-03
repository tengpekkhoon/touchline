// Club data: every league's clubs (real names; identity and reputation are the game's own ratings), rivalries
// and overseas clubs. League rules, nations and everything else static live in data.js.
(function () {
  const FM = window.FM;

  // ---------- Domestic clubs (real names; identity and reputation are the game's own ratings) ----------
  // [name, short, city, primary, secondary, identity, rep, stadium, capacity]
  FM.D.CLUBS_D1 = [
    ['Marstead Victoria', 'MCI', 'Marstead', '#6CABDD', '#1C2C5B', 'oil', 88, 'Marstead Park', 53400],
    ['Harborough County', 'LIV', 'Harborough', '#C8102E', '#00B2A9', 'giant', 88, 'Shafstead Road', 61276],
    ['Ripmouth County', 'ARS', 'Ripmouth', '#EF0107', '#FFFFFF', 'giant', 87, 'Whitbridge Lane', 60704],
    ['Ripmouth Wanderers', 'CHE', 'Ripmouth', '#034694', '#FFFFFF', 'oil', 82, 'Cheling Road', 40343],
    ['Marstead Athletic', 'MUN', 'Marstead', '#DA291C', '#FFFFFF', 'fallen', 80, 'Tunstead Road', 74310],
    ['Sedgefield Borough', 'NEW', 'Sedgefield', '#241F20', '#FFFFFF', 'oil', 78, 'Wynwick Road', 52305],
    ['Ripmouth Albion', 'TOT', 'Ripmouth', '#FFFFFF', '#132257', 'historic', 78, 'Shafgate Road', 62850],
    ['Wexbridge Borough', 'AVL', 'Wexbridge', '#670E36', '#95BFE5', 'historic', 75, 'Shafley Field', 42640],
    ['Ashford Orient', 'BHA', 'Ashford', '#0057B8', '#FFFFFF', 'selling', 72, 'Darham Park', 31876],
    ['Yarwood Wanderers', 'NFO', 'Yarwood', '#DD0000', '#FFFFFF', 'fallen', 71, 'Shafcliff Road', 30404],
    ['Ripmouth Athletic', 'WHU', 'Ripmouth', '#7A263A', '#1BB1E7', 'historic', 68, 'Dorcliff Road', 62500],
    ['Ripmouth United', 'CRY', 'Ripmouth', '#1B458F', '#C4122E', 'historic', 68, 'Redham Park', 25486],
    ['Darminster Rovers', 'BOU', 'Darminster', '#DA291C', '#000000', 'selling', 68, 'Ripbrook Park', 11307],
    ['Ripmouth Town', 'FUL', 'Ripmouth', '#FFFFFF', '#000000', 'historic', 67, 'Ripmouth Park', 29589],
    ['Ripmouth Rangers', 'BRE', 'Ripmouth', '#E30613', '#FFFFFF', 'selling', 67, 'Dargate Field', 17250],
    ['Harborough City', 'EVE', 'Harborough', '#003399', '#FFFFFF', 'fallen', 67, 'Broming Park', 52888],
    ['Wexminster Victoria', 'WOL', 'Wexminster', '#FDB913', '#231F20', 'selling', 66, 'Whitthorpe Park', 31750],
    ['Calwick Athletic', 'LEE', 'Calwick', '#FFFFFF', '#1D428A', 'fallen', 64, 'Penchester Road', 37645],
    ['Gilwick City', 'SUN', 'Gilwick', '#EB172B', '#FFFFFF', 'fallen', 62, 'The Whitthorpe Stadium', 48707],
    ['Branby Orient', 'BUR', 'Branby', '#6C1D45', '#99D6EA', 'youth', 61, 'Gilmere Lane', 21944],
  ];
  FM.D.CLUBS_D2 = [
    ['Branwood Orient', 'LEI', 'Branwood', '#003090', '#FDBE11', 'fallen', 61, 'Branwood Park', 32259],
    ['Shafborough Borough', 'SOU', 'Shafborough', '#D71920', '#FFFFFF', 'youth', 60, 'Keswick Park', 32384],
    ['Sedgebridge Victoria', 'IPS', 'Sedgebridge', '#3A64A3', '#FFFFFF', 'historic', 59, 'The Lanford Stadium', 30311],
    ['Barstead Wanderers', 'SHU', 'Barstead', '#EE2737', '#FFFFFF', 'fan', 58, 'Bexborough Lane', 32050],
    ['Yarhaven City', 'MID', 'Yarhaven', '#E11B22', '#FFFFFF', 'historic', 57, 'Kelton Field', 34742],
    ['Wexbridge County', 'BIR', 'Wexbridge', '#0000FF', '#FFFFFF', 'oil', 57, 'Gilbrook Field', 29409],
    ['Kesmouth Borough', 'WBA', 'Kesmouth', '#122F67', '#FFFFFF', 'historic', 56, 'The Keswood Stadium', 26850],
    ['Barfield Albion', 'NCI', 'Barfield', '#FFF200', '#00A650', 'youth', 56, 'The Thornbrook Stadium', 27359],
    ['Dorminster United', 'COV', 'Dorminster', '#6CABDD', '#FFFFFF', 'fan', 55, 'Salgate Park', 32609],
    ['West Gilton Town', 'WAT', 'West Gilton', '#FBEE23', '#ED2127', 'selling', 55, 'West Gilton Park', 22200],
    ['Bradton Rangers', 'WRX', 'Bradton', '#D6001C', '#FFFFFF', 'oil', 54, 'Glenhaven Field', 12600],
    ['Oakfield Rovers', 'STK', 'Oakfield', '#E03A3E', '#FFFFFF', 'fallen', 54, 'Margate Lane', 30089],
    ['Thornminster County', 'HUL', 'Thornminster', '#F18A01', '#000000', 'fan', 53, 'The Salcliff Stadium', 25586],
    ['Dorport Borough', 'SWA', 'Dorport', '#FFFFFF', '#121212', 'youth', 53, 'Dorport Park', 21088],
    ['Linham County', 'DER', 'Linham', '#FFFFFF', '#000000', 'fallen', 53, 'Dorthorpe Lane', 32956],
    ['Barstead Town', 'SHW', 'Barstead', '#0E00F7', '#FFFFFF', 'fallen', 52, 'Oakbrook Lane', 39732],
    ['Dorgate Borough', 'BLB', 'Dorgate', '#009EE0', '#FFFFFF', 'fallen', 52, 'The Preston Stadium', 31367],
    ['Glenstead United', 'BRC', 'Glenstead', '#E21A23', '#FFFFFF', 'youth', 52, 'Shafham Park', 27000],
    ['Ripmouth Rovers', 'QPR', 'Ripmouth', '#1D5BA4', '#FFFFFF', 'fan', 51, 'Wynport Road', 18439],
    ['West Gildale United', 'PNE', 'West Gildale', '#FFFFFF', '#000080', 'fan', 51, 'Presbridge Road', 23404],
    ['Ripmouth Borough', 'MIL', 'Ripmouth', '#001D5E', '#FFFFFF', 'fan', 51, 'Darminster Road', 20146],
    ['Dardale Orient', 'POM', 'Dardale', '#001489', '#FFFFFF', 'fan', 50, 'Kelbrook Park', 20899],
    ['Ripmouth Orient', 'CHA', 'Ripmouth', '#D4021D', '#FFFFFF', 'historic', 49, 'The Marchester Stadium', 27111],
    ['Sedgeborough Rangers', 'OXF', 'Sedgeborough', '#FFD100', '#001D5E', 'fan', 47, 'Stanbury Lane', 12500],
  ];
  FM.D.CLUBS_ES1 = [
    ['UD Puenteblanca', 'RMA', 'Puenteblanca', '#FFFFFF', '#FEBE10', 'giant', 89, 'Estadio Puentemora', 83186],
    ['Racing Vallegrande', 'FCB', 'Vallegrande', '#A50044', '#004D98', 'giant', 88, 'Estadio Santareal', 99354],
    ['CD Puenteblanca', 'ATM', 'Puenteblanca', '#CB3524', '#272E61', 'historic', 82, 'Estadio Cañadamora', 70460],
    ['Atlético Arroyosur', 'ATH', 'Arroyosur', '#EE2523', '#FFFFFF', 'youth', 76, 'Estadio Lomassur', 53289],
    [
      'Cañadanorte Balompié',
      'VIL',
      'Cañadanorte',
      '#FFE667',
      '#005187',
      'selling',
      74,
      'Nuevo Estadio Cañadanorte',
      23500,
    ],
    ['Real Playagrande', 'RSO', 'Playagrande', '#143C8B', '#FFFFFF', 'youth', 73, 'Nuevo Estadio Playagrande', 39313],
    [
      'Nuevagrande Balompié',
      'BET',
      'Nuevagrande',
      '#0BB363',
      '#FFFFFF',
      'historic',
      72,
      'Estadio Municipal de Nuevagrande',
      60721,
    ],
    ['Unión Nuevagrande', 'SEV', 'Nuevagrande', '#FFFFFF', '#D81E05', 'fallen', 68, 'Estadio Peñabella', 43883],
    ['UD Sanluna', 'GIR', 'Sanluna', '#CD2534', '#FFFFFF', 'oil', 66, 'Estadio Municipal de Sanluna', 14624],
    ['Club Lomassol', 'VAL', 'Lomassol', '#FFFFFF', '#000000', 'fallen', 66, 'Estadio La Puentebella', 49430],
    ['CD Mesareal', 'CEL', 'Mesareal', '#8AC3EE', '#FFFFFF', 'selling', 64, 'Nuevo Estadio Mesareal', 24870],
    ['UD Torrenorte', 'OSA', 'Torrenorte', '#D91A21', '#0A346F', 'fan', 64, 'Estadio Puertosol', 23576],
    ['Deportivo Puenterosa', 'MLL', 'Puenterosa', '#E20613', '#000000', 'fan', 62, 'Estadio Nuevarosa', 26020],
    ['Vallegrande CF', 'RCD', 'Vallegrande', '#007FC8', '#FFFFFF', 'fallen', 62, 'Campo de Vallegrande', 40000],
    ['Racing Puenteblanca', 'RAY', 'Puenteblanca', '#FFFFFF', '#E53027', 'fan', 61, 'Campo de Puenteblanca', 14708],
    ['Real Mesabella', 'GET', 'Mesabella', '#005999', '#FFFFFF', 'selling', 61, 'Campo de Mesabella', 16500],
    ['Mesaalta Balompié', 'ALA', 'Mesaalta', '#0761AF', '#FFFFFF', 'youth', 60, 'Estadio Municipal de Mesaalta', 19840],
    ['Atlético Santaalta', 'OVI', 'Santaalta', '#0033A0', '#FFFFFF', 'fan', 59, 'Nuevo Estadio Santaalta', 30500],
    ['Deportivo Lomassol', 'LEV', 'Lomassol', '#B5123E', '#004F9F', 'fan', 59, 'Estadio Villagrande', 26354],
    ['Racing Pozoverde', 'ELC', 'Pozoverde', '#FFFFFF', '#05642C', 'fan', 58, 'Campo de Pozoverde', 31388],
  ];

  // ---------- More leagues ----------
  FM.D.CLUBS_D3 = [
    ['Tunmere Albion', 'CAR', 'Tunmere', '#0070B5', '#FFFFFF', 'fallen', 49, 'Tunmere Ground', 33280],
    ['Linborough Wanderers', 'LUT', 'Linborough', '#F78F1E', '#002D62', 'fallen', 48, 'Tunminster Park', 12000],
    ['Fenworth Albion', 'HUD', 'Fenworth', '#0E63AD', '#FFFFFF', 'historic', 48, 'Sedgeworth Lane', 24121],
    ['Harham United', 'BWA', 'Harham', '#FFFFFF', '#263C7E', 'fallen', 48, 'Fenstead Field', 28723],
    ['Hexmere Albion', 'PLY', 'Hexmere', '#00563F', '#FFFFFF', 'fan', 46, 'Aldham Park', 17900],
    ['Wexton Orient', 'REA', 'Wexton', '#004494', '#FFFFFF', 'fallen', 46, 'Calbridge Park', 24161],
    ['Barton Rangers', 'BNS', 'Barton', '#D71921', '#FFFFFF', 'youth', 45, 'Barton Park', 23287],
    ['Malby Victoria', 'WIG', 'Malby', '#1D59AF', '#FFFFFF', 'selling', 45, 'Darcombe Park', 25138],
    ['Whithaven Albion', 'STO', 'Whithaven', '#0B4EA2', '#FFFFFF', 'fan', 45, 'Salmere Lane', 10841],
    ['Darham United', 'BFD', 'Darham', '#8E1B3A', '#FFB81C', 'fallen', 44, 'Kesfield Park', 25136],
    ['Great Gilfield Rovers', 'BLP', 'Great Gilfield', '#F68712', '#FFFFFF', 'fan', 44, 'Salstead Park', 16616],
    ['Chelthorpe United', 'PBO', 'Chelthorpe', '#0055A4', '#FFFFFF', 'selling', 44, 'Thornford Park', 15314],
    ['Gilfield City', 'ROT', 'Gilfield', '#D71920', '#FFFFFF', 'fallen', 43, 'Dorford Lane', 12021],
    ['Kelborough City', 'LIN', 'Kelborough', '#E1251B', '#FFFFFF', 'youth', 43, 'Kelborough Ground', 10669],
    ['Great Chelford Victoria', 'DON', 'Great Chelford', '#E21E26', '#FFFFFF', 'fan', 42, 'Norham Lane', 15231],
    ['Ripmouth City', 'LEY', 'Ripmouth', '#C8102E', '#FFFFFF', 'fan', 42, 'Yardale Park', 9271],
    ['Ashbury Victoria', 'WYC', 'Ashbury', '#88C4E6', '#0B1D4F', 'youth', 42, 'Barcliff Park', 10137],
    ['West Lanstead Victoria', 'MNS', 'West Lanstead', '#FEDD00', '#0033A0', 'fan', 41, 'Oakgate Field', 9186],
    ['Norchester Borough', 'EXE', 'Norchester', '#D6001C', '#FFFFFF', 'fan', 40, 'Chelbridge Road', 8696],
    ['Oakfield Albion', 'PVA', 'Oakfield', '#FFFFFF', '#000000', 'fan', 40, 'Elmwick Lane', 15036],
    ['Ripmouth Victoria', 'WIM', 'Ripmouth', '#0033A0', '#FFD100', 'fan', 40, 'The Brombury Stadium', 9215],
    ['Aldbrook Orient', 'STV', 'Aldbrook', '#E30613', '#FFFFFF', 'youth', 40, 'Caldale Road', 7800],
    ['Wynley United', 'NTN', 'Wynley', '#7A263A', '#FFFFFF', 'fan', 39, 'Wynley Park', 7798],
    ['Malcliff Athletic', 'BRT', 'Malcliff', '#FFD100', '#000000', 'selling', 39, 'Malcliff Ground', 6912],
  ];
  FM.D.CLUBS_ES2 = [
    ['Pozoalta Balompié', 'DEP', 'Pozoalta', '#0067B1', '#FFFFFF', 'fallen', 56, 'Estadio Valleluna', 32660],
    ['Racing Peñaalta', 'LPA', 'Peñaalta', '#FFE400', '#0055A5', 'fan', 56, 'Estadio Municipal de Peñaalta', 32400],
    ['Racing Montelara', 'VLD', 'Montelara', '#5B2C83', '#FFFFFF', 'fallen', 56, 'Estadio Llanomora', 27618],
    ['CD Lomasbella', 'MAL', 'Lomasbella', '#0073CF', '#FFFFFF', 'fallen', 55, 'Estadio La Puenteluna', 30044],
    ['Atlético Vegabella', 'ALM', 'Vegabella', '#EE1119', '#FFFFFF', 'oil', 55, 'Estadio Rocaluna', 15274],
    ['UD Rioreal', 'ZAR', 'Rioreal', '#FFFFFF', '#0A3A82', 'fallen', 54, 'Estadio Municipal de Rioreal', 33608],
    ['Altomar Balompié', 'LEG', 'Altomar', '#FFFFFF', '#0B3F8C', 'youth', 54, 'Campo de Altomar', 12454],
    ['Llanosur Balompié', 'GRA', 'Llanosur', '#C8102E', '#FFFFFF', 'selling', 54, 'Nuevo Estadio Llanosur', 19336],
    [
      'Atlético Altogrande',
      'SPG',
      'Altogrande',
      '#E30613',
      '#FFFFFF',
      'historic',
      53,
      'Nuevo Estadio Altogrande',
      29371,
    ],
    ['Unión Rioverde', 'RSA', 'Rioverde', '#FFFFFF', '#00843D', 'historic', 53, 'Estadio Valleblanca', 22222],
    ['CD Peñasol', 'CAD', 'Peñasol', '#FFE400', '#0045A7', 'fan', 53, 'Campo de Peñasol', 20724],
    ['Santanorte CF', 'EIB', 'Santanorte', '#004F9F', '#A6192E', 'youth', 51, 'Campo de Santanorte', 8164],
    ['Villaluna Balompié', 'CAS', 'Villaluna', '#FFFFFF', '#000000', 'oil', 51, 'Estadio Sanmora', 15500],
    ['CD Puenteluna', 'AND', 'Puenteluna', '#0038A8', '#FEDD00', 'oil', 50, 'Estadio La Montereal', 3306],
    ['Mesagrande Balompié', 'HUE', 'Mesagrande', '#003DA5', '#A6192E', 'youth', 49, 'Estadio Arroyolara', 9128],
    ['Real Fuenteverde', 'ALB', 'Fuenteverde', '#FFFFFF', '#000000', 'fan', 49, 'Campo de Fuenteverde', 17524],
    ['Fortínalta CF', 'BGS', 'Fortínalta', '#FFFFFF', '#000000', 'fan', 48, 'Nuevo Estadio Fortínalta', 12200],
    ['Atlético Pradoblanca', 'CCF', 'Pradoblanca', '#FFFFFF', '#00843D', 'fan', 48, 'Estadio Costamora', 21822],
    ['Club Valledorada', 'MIR', 'Valledorada', '#E30613', '#000000', 'youth', 48, 'Estadio La Rocagrande', 5759],
    [
      'Real Playagrande B',
      'RSS',
      'Playagrande',
      '#143C8B',
      '#FFFFFF',
      'youth',
      47,
      'Nuevo Estadio Playagrande',
      2500,
      'RSO',
    ],
    ['Unión Camposur', 'CYD', 'Camposur', '#FFFFFF', '#000000', 'fan', 46, 'Nuevo Estadio Camposur', 13346],
    ['Sporting Ríolara', 'CEU', 'Ríolara', '#FFFFFF', '#000000', 'fan', 45, 'Estadio Mesarosa', 6500],
  ];
  FM.D.CLUBS_DE1 = [
    ['FSV Kirchhausen', 'BAY', 'Kirchhausen', '#DC052D', '#FFFFFF', 'giant', 89, 'Bergsee-Stadion', 75024],
    ['TSV Rheinstadt', 'BVB', 'Rheinstadt', '#FDE100', '#000000', 'fan', 84, 'Stadion am Steiningen', 81365],
    ['SpVgg Unterheim', 'B04', 'Unterheim', '#E32221', '#000000', 'historic', 81, 'Oberau-Stadion', 30210],
    ['FSV Zellhafen', 'RBL', 'Zellhafen', '#FFFFFF', '#DD0741', 'oil', 78, 'Haghafen-Stadion', 47069],
    ['Eichkirchen 04', 'SGE', 'Eichkirchen', '#000000', '#E1000F', 'fan', 74, 'Waldberg-Stadion', 58000],
    ['FC Linddorf', 'VFB', 'Linddorf', '#FFFFFF', '#E32219', 'historic', 74, 'Bergingen-Stadion', 60449],
    ['VfB Lindberg', 'SCF', 'Lindberg', '#C00000', '#000000', 'youth', 69, 'Berghafen-Stadion', 34700],
    ['FC Steinfurt', 'WOB', 'Steinfurt', '#65B32E', '#FFFFFF', 'selling', 66, 'Sportpark Hohensee', 28917],
    ['SpVgg Rheintal', 'BMG', 'Rheintal', '#FFFFFF', '#000000', 'historic', 66, 'Stadion Dorndorf', 54042],
    ['FC Obertal', 'HSV', 'Obertal', '#FFFFFF', '#0A3E8C', 'fallen', 66, 'Lindfeld-Stadion', 57000],
    ['VfB Dornsee', 'KOE', 'Dornsee', '#FFFFFF', '#ED1C24', 'fallen', 64, 'Eichheim-Stadion', 50000],
    ['FSV Lindhausen', 'SVW', 'Lindhausen', '#1D9053', '#FFFFFF', 'historic', 64, 'Sportpark Eichberg', 42100],
    ['Sportfreunde Badberg', 'M05', 'Badberg', '#C3141E', '#FFFFFF', 'fan', 63, 'Stadion am Dornfeld', 33305],
    ['FC Thalhausen', 'FCU', 'Thalhausen', '#EB1923', '#FFFFFF', 'fan', 62, 'Mühlhafen-Stadion', 22012],
    ['TSV Neufurt', 'TSG', 'Neufurt', '#1C63B7', '#FFFFFF', 'selling', 62, 'Sportpark Mühlhafen', 30150],
    ['Sportfreunde Westeringen', 'AUG', 'Westeringen', '#FFFFFF', '#BA3733', 'fan', 61, 'Sportpark Lindfurt', 30660],
    ['VfB Obertal', 'STP', 'Obertal', '#624839', '#FFFFFF', 'fan', 60, 'Sportpark Dorndorf', 29546],
    ['VfL Zelldorf', 'HDH', 'Zelldorf', '#E2001A', '#003B79', 'youth', 58, 'Zelldorf-Arena', 15000],
  ];
  FM.D.CLUBS_FR1 = [
    ['RC Bourlac', 'PSG', 'Bourlac', '#004170', '#DA291C', 'oil', 90, 'Stade Municipal de Bourlac', 47929],
    ['Athlétic Vilens', 'OMA', 'Vilens', '#FFFFFF', '#2FAEE0', 'giant', 82, 'Stade Municipal de Vilens', 67394],
    ['SC Lavlieu', 'ASM', 'Lavlieu', '#E30613', '#FFFFFF', 'oil', 78, 'Complexe Durgnan', 18523],
    ['Athlétic Chales-bains', 'OLY', 'Chales-bains', '#FFFFFF', '#DA291C', 'fallen', 74, 'Stade Lavlac', 59186],
    ['AJ Chaon', 'LIL', 'Chaon', '#E01E13', '#1B2C5A', 'selling', 74, 'Parc des Sports de Chaon', 50186],
    ['SC Lanlieu', 'NIC', 'Lanlieu', '#CE1126', '#000000', 'oil', 70, 'Stade Lansur-mer', 36178],
    ['US Fonac', 'REN', 'Fonac', '#E2001A', '#000000', 'youth', 70, 'Parc des Sports de Fonac', 29778],
    ['AJ Pongnan', 'RCL', 'Pongnan', '#FFD100', '#E30613', 'fan', 69, 'Stade Tourbourg', 38223],
    ['SC Valville', 'RCS', 'Valville', '#0056A6', '#FFFFFF', 'oil', 66, 'Complexe Marens', 29230],
    ['Athlétic Aubac', 'SBR', 'Aubac', '#E30613', '#FFFFFF', 'selling', 62, 'Stade de la Durbourg', 15220],
    ['Belsur-mer FC', 'TFC', 'Belsur-mer', '#6B2C91', '#FFFFFF', 'youth', 62, 'Complexe Monmont', 33150],
    ['AJ Chalac', 'NAN', 'Chalac', '#FCD405', '#009A44', 'historic', 61, 'Stade de la Valsur-mer', 35322],
    ['AS Bourlac', 'PFC', 'Bourlac', '#1B2C5A', '#FFFFFF', 'oil', 60, 'Stade de la Clerlieu', 20000],
    ['FC Roclac', 'LOR', 'Roclac', '#F58025', '#000000', 'fan', 59, 'Stade Marens', 18110],
    ['SC Lanmont', 'AUX', 'Lanmont', '#FFFFFF', '#0033A0', 'fan', 58, 'Parc des Sports de Lanmont', 18541],
    ['AJ Valay', 'HAC', 'Valay', '#1D5EAE', '#89CFF0', 'historic', 58, 'Stade de la Villieu', 25178],
    ['AS Naneau', 'ANG', 'Naneau', '#000000', '#FFFFFF', 'fan', 58, 'Stade Municipal de Naneau', 18752],
    ['Stade Clercourt', 'FCM', 'Clercourt', '#8E1B3A', '#FFFFFF', 'historic', 57, 'Stade Rocgnan', 28786],
  ];
  FM.D.CLUBS_BR1 = [
    ['Racing Montebranca', 'FLA', 'Montebranca', '#C4122E', '#000000', 'giant', 85, 'Estádio Portosol', 78838],
    ['Sãorio EC', 'PAL', 'Sãorio', '#006437', '#FFFFFF', 'giant', 84, 'Estádio Nova Santalua', 43713],
    ['União Sãorio', 'COR', 'Sãorio', '#FFFFFF', '#000000', 'historic', 79, 'Estádio Boamar', 49205],
    ['Clube Sãorio', 'SAO', 'Sãorio', '#FFFFFF', '#E4002B', 'historic', 78, 'Estádio Municipal de Sãorio', 66795],
    ['Montebranca EC', 'BOT', 'Montebranca', '#000000', '#FFFFFF', 'oil', 77, 'Estádio Boareal', 46831],
    ['Atlético Campomar', 'CAM', 'Campomar', '#000000', '#FFFFFF', 'oil', 76, 'Estádio Portomar', 46000],
    ['Torresol FC', 'GRE', 'Torresol', '#0D80BF', '#000000', 'historic', 75, 'Arena Altosol', 55662],
    [
      'Sporting Torresol',
      'SCI',
      'Torresol',
      '#E30613',
      '#FFFFFF',
      'historic',
      75,
      'Estádio Municipal de Torresol',
      50128,
    ],
    [
      'Grémio Montebranca',
      'FLU',
      'Montebranca',
      '#7A1F3D',
      '#00613C',
      'historic',
      74,
      'Estádio Nova Torrealegre',
      78838,
    ],
    ['Sporting Campomar', 'CRU', 'Campomar', '#0033A0', '#FFFFFF', 'fallen', 73, 'Estádio Nova Ribeiramar', 61846],
    ['União Montebranca', 'VAS', 'Montebranca', '#FFFFFF', '#000000', 'fallen', 72, 'Estádio Valverdegrande', 21880],
    ['União Portomar', 'SAN', 'Portomar', '#FFFFFF', '#000000', 'fallen', 71, 'Estádio Municipal de Portomar', 16068],
    ['Atlético Ribeiramar', 'BAH', 'Ribeiramar', '#004A99', '#E30613', 'oil', 70, 'Arena Belamar', 47907],
    ['Grémio Boanova', 'FTZ', 'Boanova', '#1F3B8E', '#E30613', 'fan', 68, 'Arena Praiamar', 63903],
    ['Esporte Clube Torrereal', 'RBB', 'Torrereal', '#FFFFFF', '#D1001F', 'oil', 67, 'Estádio Sãolua', 17022],
    ['Boanova EC', 'CEA', 'Boanova', '#000000', '#FFFFFF', 'fan', 64, 'Estádio Altoverde', 63903],
    ['Esporte Clube Campobranca', 'SPT', 'Campobranca', '#E30613', '#000000', 'fan', 64, 'Estádio Novario', 32983],
    ['Sporting Ribeiramar', 'VIT', 'Ribeiramar', '#E30613', '#000000', 'fan', 63, 'Estádio Nova Boalua', 30793],
    ['Valverdealegre EC', 'JVD', 'Valverdealegre', '#00843D', '#FFFFFF', 'fan', 62, 'Estádio Nova Sãoverde', 19924],
    ['Esporte Clube Altosol', 'MSL', 'Altosol', '#FFE600', '#00843D', 'youth', 62, 'Estádio Monteazul', 15000],
  ];

  // ---------- Lower divisions and B teams (batch 6): minimal simulation; a 10th field names a B team's parent ----------
  FM.D.CLUBS_D4 = [
    ['Bexing Rangers', 'ACS', 'Bexing', '#E2001A', '#FFFFFF', 'fan', 38, 'Ashborough Park', 5450],
    ['Ripmouth 14', 'BNT', 'Ripmouth', '#F79A20', '#000000', 'fan', 36, 'Ripton Field', 6500],
    ['Bexley Athletic', 'BRW', 'Bexley', '#FFFFFF', '#00205B', 'fan', 37, 'Bexley Ground', 5045],
    ['Glenstead Victoria', 'BRR', 'Glenstead', '#0050A0', '#FFFFFF', 'historic', 42, 'Bradbrook Park', 9832],
    ['Ripmouth 15', 'BRO', 'Ripmouth', '#FFFFFF', '#000000', 'fan', 37, 'Norwell Field', 5000],
    ['Bromhaven Rangers', 'CAMU', 'Bromhaven', '#F9A01B', '#000000', 'fan', 40, 'Keswick Road', 8127],
    ['West Norham Town', 'CHT', 'West Norham', '#E2001A', '#FFFFFF', 'fan', 37, 'Harstead Lane', 7066],
    ['Wynbrook County', 'CHF', 'Wynbrook', '#0033A0', '#FFFFFF', 'historic', 40, 'Thornwell Park', 10504],
    ['Wynthorpe Borough', 'COL', 'Wynthorpe', '#0045A0', '#FFFFFF', 'fan', 38, 'Barworth Park', 10105],
    ['Hexport Victoria', 'CRAW', 'Hexport', '#C8102E', '#FFFFFF', 'fan', 39, 'Wynwold Park', 6134],
    ['Keswold Albion', 'CREW', 'Keswold', '#E2001A', '#FFFFFF', 'youth', 38, 'Keswold Park', 10153],
    ['Wynhaven County', 'FLE', 'Wynhaven', '#E2001A', '#FFFFFF', 'fan', 38, 'Tunstead Park', 5327],
    ['Wynwood County', 'GILL', 'Wynwood', '#0033A0', '#FFFFFF', 'historic', 39, 'Presby Field', 11582],
    ['Great Oakhaven Rovers', 'GRI', 'Great Oakhaven', '#000000', '#FFFFFF', 'historic', 39, 'Lanchester Park', 9052],
    ['Prescombe Rangers', 'HARR', 'Prescombe', '#FFD700', '#000000', 'fan', 35, 'Prescombe Ground', 5000],
    ['Fenstead Victoria', 'MKD', 'Fenstead', '#FFFFFF', '#000000', 'selling', 41, 'Fenstead Park', 30500],
    ['Thorncliff City', 'NWP', 'Thorncliff', '#F79A20', '#000000', 'fan', 36, 'Thorncliff Park', 7850],
    ['Yarwood County', 'NCO', 'Yarwood', '#000000', '#FFFFFF', 'historic', 41, 'Yarwood Park', 19841],
    ['Bexham Rangers', 'OLD', 'Bexham', '#0033A0', '#FFFFFF', 'fallen', 38, 'The Aldby Stadium', 13512],
    ['Barwold Wanderers', 'SAL', 'Barwold', '#E2001A', '#FFFFFF', 'oil', 40, 'Kelwold Park', 5108],
    ['Caling Victoria', 'SHR', 'Caling', '#0033A0', '#F9A01B', 'fan', 38, 'Kesbury Lane', 9875],
    ['Elmminster County', 'SWI', 'Elmminster', '#E2001A', '#FFFFFF', 'fallen', 39, 'Fenchester Park', 15728],
    ['Braning Borough', 'TRA', 'Braning', '#FFFFFF', '#0033A0', 'fallen', 37, 'Bradmouth Park', 16587],
    ['South Ashby Wanderers', 'WAL', 'South Ashby', '#E2001A', '#FFFFFF', 'fan', 38, 'Barstead Field', 11300],
  ];
  FM.D.CLUBS_ES3 = [
    ['UD Puenteblanca B', 'RMC', 'Puenteblanca', '#FFFFFF', '#FEBE10', 'youth', 45, 'Estadio Puentemora', 6000, 'RMA'],
    ['Racing Vallegrande B', 'BAT', 'Vallegrande', '#A50044', '#004D98', 'youth', 44, 'Estadio Santareal', 6000, 'FCB'],
    ['Atlético Arroyosur B', 'BIA', 'Arroyosur', '#EE2523', '#FFFFFF', 'youth', 42, 'Estadio Lomassur', 3250, 'ATH'],
    [
      'Deportivo Pradonueva',
      'ZAM',
      'Pradonueva',
      '#FFFFFF',
      '#E2001A',
      'fan',
      37,
      'Estadio Municipal de Pradonueva',
      7813,
    ],
    ['CD Puenteblanca B', 'ATB', 'Puenteblanca', '#CB3524', '#272E61', 'youth', 42, 'Estadio Cañadamora', 2800, 'ATM'],
    [
      'Cañadanorte Balompié B',
      'VIB',
      'Cañadanorte',
      '#FFE667',
      '#005187',
      'youth',
      42,
      'Nuevo Estadio Cañadanorte',
      5000,
      'VIL',
    ],
    ['Unión Nuevagrande B', 'SEB', 'Nuevagrande', '#FFFFFF', '#D81E05', 'youth', 40, 'Estadio Peñabella', 7000, 'SEV'],
    ['CD Mesareal B', 'CEB', 'Mesareal', '#8AC3EE', '#FFFFFF', 'youth', 40, 'Nuevo Estadio Mesareal', 4500, 'CEL'],
    [
      'Nuevagrande Balompié B',
      'BEB',
      'Nuevagrande',
      '#0BB363',
      '#FFFFFF',
      'youth',
      39,
      'Estadio Municipal de Nuevagrande',
      3000,
      'BET',
    ],
    ['CD Vegarosa', 'TEN', 'Vegarosa', '#FFFFFF', '#0046AD', 'fallen', 46, 'Campo de Vegarosa', 22824],
    ['Sporting Mesaluna', 'CTG', 'Mesaluna', '#000000', '#FFFFFF', 'fan', 43, 'Estadio Municipal de Mesaluna', 15105],
    ['Club Mesanorte', 'PON', 'Mesanorte', '#003DA5', '#FFFFFF', 'fan', 41, 'Estadio Municipal de Mesanorte', 8400],
    [
      'Unión Puertobella',
      'NAS',
      'Puertobella',
      '#C8102E',
      '#000000',
      'historic',
      41,
      'Nuevo Estadio Puertobella',
      14591,
    ],
    ['Puentesur Balompié', 'ALC', 'Puentesur', '#FFD700', '#003DA5', 'fan', 39, 'Nuevo Estadio Puentesur', 5100],
    ['CD Pozoblanca', 'MUR', 'Pozoblanca', '#C8102E', '#FFFFFF', 'fallen', 42, 'Nuevo Estadio Pozoblanca', 31179],
    ['Sporting Villablanca', 'HERC', 'Villablanca', '#0033A0', '#FFFFFF', 'fallen', 40, 'Estadio La Montesur', 30000],
    ['Club Peñanorte', 'IBI', 'Peñanorte', '#0057B8', '#FFFFFF', 'oil', 40, 'Estadio Riobella', 4500],
    ['UD Bajorosa', 'CDLU', 'Bajorosa', '#E2001A', '#FFFFFF', 'fan', 38, 'Estadio Cabosol', 7840],
    ['CD Costareal', 'UNS', 'Costareal', '#000000', '#FFFFFF', 'fan', 37, 'Estadio Fortínverde', 4000],
    ['Real Bahíaverde', 'ALG', 'Bahíaverde', '#C8102E', '#FFFFFF', 'fan', 37, 'Estadio La Riomora', 7100],
  ];
  FM.D.CLUBS_DE2 = [
    ['Sportfreunde Thalhausen', 'BSC', 'Thalhausen', '#005CA9', '#FFFFFF', 'fallen', 58, 'Stadion am Rheindorf', 74475],
    ['VfB Waldstadt', 'S04', 'Waldstadt', '#004D9D', '#FFFFFF', 'fallen', 60, 'Waldstadt-Arena', 62271],
    ['Eintracht Zellhausen', 'KSV', 'Zellhausen', '#0033A0', '#FFFFFF', 'youth', 55, 'Sportpark Thalheim', 15034],
    ['Fortuna Oberhausen', 'VFLB', 'Oberhausen', '#005CA9', '#FFFFFF', 'historic', 56, 'Stadion am Thaltal', 26000],
    ['Steinberg SC', 'F95', 'Steinberg', '#E2001A', '#FFFFFF', 'historic', 55, 'Hagberg-Stadion', 54600],
    ['TSV Westerheim', 'H96', 'Westerheim', '#00863D', '#000000', 'historic', 55, 'Sportpark Thalbach', 49000],
    ['SV Neuberg', 'FCKL', 'Neuberg', '#E2001A', '#FFFFFF', 'fallen', 54, 'Sportpark Badberg', 49327],
    ['Lindfurt 04', 'SCPA', 'Lindfurt', '#003DA5', '#000000', 'selling', 51, 'Stadion am Rheinberg', 15000],
    ['Bergdorf SC', 'FCNB', 'Bergdorf', '#9B1B30', '#000000', 'fallen', 54, 'Zellheim-Stadion', 50000],
    ['VfL Unterdorf', 'KSC', 'Unterdorf', '#0033A0', '#FFFFFF', 'historic', 52, 'Unterdorf-Arena', 34302],
    ['Westerhausen SC', 'D98', 'Westerhausen', '#004D9D', '#FFFFFF', 'fan', 52, 'Burgheim-Stadion', 17810],
    ['TSV Altstadt', 'SGF', 'Altstadt', '#00863D', '#FFFFFF', 'youth', 50, 'Sportpark Eichstadt', 16626],
    ['Sportfreunde Rheinfeld', 'FCMA', 'Rheinfeld', '#0033A0', '#FFFFFF', 'fan', 50, 'Grünstadt-Stadion', 30098],
    ['SV Altbach', 'EBS', 'Altbach', '#FFD700', '#004D9D', 'historic', 50, 'Zelldorf-Stadion', 23325],
    ['Eintracht Eichheim', 'PRM', 'Eichheim', '#00863D', '#000000', 'fan', 48, 'Altbach-Stadion', 14300],
    ['VfL Eichbach', 'SVE', 'Eichbach', '#000000', '#FFFFFF', 'selling', 48, 'Stadion Kirchsee', 10000],
    ['SV Hohental', 'DSC', 'Hohental', '#0033A0', '#FFFFFF', 'fan', 50, 'Stadion Neukirchen', 26515],
    ['VfB Bergberg', 'SGD', 'Bergberg', '#FFD700', '#000000', 'fan', 50, 'Stadion Thalhafen', 32066],
  ];
  FM.D.CLUBS_DE3 = [
    ['FC Linddorf B', 'VFS', 'Linddorf', '#FFFFFF', '#E32219', 'youth', 42, 'Bergingen-Stadion', 5000, 'VFB'],
    ['TSV Rheinstadt B', 'BVZ', 'Rheinstadt', '#FDE100', '#000000', 'youth', 43, 'Stadion am Steiningen', 9999, 'BVB'],
    ['TSV Neufurt B', 'TSZ', 'Neufurt', '#1C63B7', '#FFFFFF', 'youth', 41, 'Sportpark Mühlhafen', 6350, 'TSG'],
    ['VfL Kirchhausen', 'M60', 'Kirchhausen', '#6CABDD', '#FFFFFF', 'fallen', 45, 'Stadion am Kirchfeld', 15000],
    ['SpVgg Grüningen', 'FCE', 'Grüningen', '#E2001A', '#FFFFFF', 'fan', 44, 'Stadion am Lindheim', 22528],
    ['Mühlstadt 04', 'FCH', 'Mühlstadt', '#0033A0', '#FFFFFF', 'fallen', 45, 'Sportpark Althausen', 29000],
    ['SpVgg Neuhausen', 'SVWW', 'Neuhausen', '#E2001A', '#000000', 'fan', 43, 'Stadion Eichingen', 15295],
    ['VfL Dornsee', 'VKO', 'Dornsee', '#E2001A', '#FFFFFF', 'fan', 40, 'Westerdorf-Stadion', 8343],
    ['Fortuna Bergfeld', 'SVM', 'Bergfeld', '#0033A0', '#000000', 'fan', 42, 'Stadion Altbach', 24302],
    ['SV Thalburg', 'AUE', 'Thalburg', '#6A0DAD', '#FFFFFF', 'fan', 42, 'Sportpark Neuhausen', 16485],
    ['Steindorf 04', 'AAC', 'Steindorf', '#FFD700', '#000000', 'historic', 43, 'Hagau-Stadion', 32960],
    ['Fortuna Zellkirchen', 'SCV', 'Zellkirchen', '#000000', '#FFFFFF', 'fan', 39, 'Stadion Oberstadt', 5207],
    ['FC Hohenburg', 'OSN', 'Hohenburg', '#6A0DAD', '#FFFFFF', 'fan', 42, 'Sportpark Dornau', 15741],
    ['Eintracht Hagdorf', 'RWE', 'Hagdorf', '#E2001A', '#FFFFFF', 'historic', 44, 'Stadion Waldhafen', 20650],
    ['Steinsee SC', 'JAH', 'Steinsee', '#E2001A', '#FFFFFF', 'fan', 43, 'Rheinheim-Stadion', 15210],
    ['Sportfreunde Freiheim', 'ULM', 'Freiheim', '#000000', '#FFFFFF', 'fan', 42, 'Freiheim-Arena', 17000],
    ['SpVgg Rheinberg', 'MSV', 'Rheinberg', '#005CA9', '#FFFFFF', 'fallen', 44, 'Dornstadt-Stadion', 31500],
    ['SV Hohenheim', 'FCS', 'Hohenheim', '#0033A0', '#000000', 'fan', 43, 'Stadion am Rheinstadt', 16003],
    ['FC Waldfurt', 'FCI', 'Waldfurt', '#E2001A', '#000000', 'selling', 42, 'Stadion am Lindfurt', 15800],
    ['VfL Althafen', 'S05', 'Althafen', '#00863D', '#FFFFFF', 'fan', 38, 'Dornkirchen-Stadion', 15060],
  ];
  FM.D.CLUBS_IT2 = [
    ['Virtus Feria', 'MNZ', 'Feria', '#E2001A', '#FFFFFF', 'selling', 58, 'Stadio Ponago', 16917],
    ['AC Monara', 'VEN', 'Monara', '#000000', '#F18A00', 'selling', 57, 'Arena Casago', 11150],
    ['Venino 1908', 'EMP', 'Venino', '#005CA9', '#FFFFFF', 'youth', 57, 'Stadio Comunale di Venino', 16284],
    ['ASD Venello', 'PAL2', 'Venello', '#F4A6C1', '#000000', 'oil', 56, 'Stadio Borello', 36365],
    ['FC Vilago', 'SAM', 'Vilago', '#1B5EA6', '#FFFFFF', 'fallen', 55, 'Stadio Boria', 36599],
    ['ASD Borate', 'BARI', 'Borate', '#FFFFFF', '#E2001A', 'fallen', 52, 'Stadio Serona', 58270],
    ['US Marento', 'SPE', 'Marento', '#FFFFFF', '#000000', 'selling', 53, 'Stadio Nuovo Valello', 10336],
    ['Virtus Roccaate', 'MOD', 'Roccaate', '#FFD700', '#0033A0', 'fan', 51, 'Stadio Belona', 21151],
    ['Albaello Calcio', 'CTZ', 'Albaello', '#FFD700', '#E2001A', 'fan', 50, 'Stadio Comunale di Albaello', 14650],
    ['US Serezia', 'CES', 'Serezia', '#FFFFFF', '#000000', 'fan', 50, 'Stadio Valia', 23860],
    ['Atletico Venola', 'JST', 'Venola', '#FFD700', '#0033A0', 'fan', 48, 'Stadio Nuovo Albaello', 12800],
    ['Venona Calcio', 'SUD2', 'Venona', '#FFFFFF', '#E2001A', 'selling', 48, 'Stadio Nuovo Ravetto', 5539],
    ['Virtus Vilara', 'REG', 'Vilara', '#8B0000', '#FFFFFF', 'fan', 49, 'Stadio Comunale di Vilara', 21525],
    ['Unione Galago', 'CAR2', 'Galago', '#FFD700', '#0033A0', 'fan', 46, 'Stadio Monento', 9500],
    ['Virtus Albaona', 'PAD', 'Albaona', '#FFFFFF', '#E2001A', 'historic', 47, 'Stadio Ravezia', 32336],
    ['Atletico Pieate', 'MAN', 'Pieate', '#FFFFFF', '#E2001A', 'fan', 46, 'Arena Albaento', 14844],
    ['FC Ravello', 'ENT', 'Ravello', '#005CA9', '#FFFFFF', 'fan', 45, 'Stadio Toria', 5535],
    ['Atletico Ponona', 'AVE', 'Ponona', '#00863D', '#FFFFFF', 'fan', 46, 'Stadio Comunale di Ponona', 26308],
    ['FC Lania', 'PES', 'Lania', '#005CA9', '#FFFFFF', 'fan', 47, 'Stadio Nuovo Marello', 20476],
    ['Serento 1908', 'FRO', 'Serento', '#FFD700', '#005CA9', 'selling', 51, 'Stadio Albaetto', 16227],
  ];
  FM.D.CLUBS_FR2 = [
    ['RC Chaville', 'MHS', 'Chaville', '#F58025', '#1B3A6B', 'selling', 56, 'Stade Municipal de Chaville', 32900],
    ['Courlac FC', 'STE', 'Courlac', '#009A44', '#FFFFFF', 'fallen', 58, 'Stade Valgnan', 41965],
    ['Durbourg FC', 'SDR', 'Durbourg', '#E2001A', '#FFFFFF', 'selling', 56, 'Complexe Chasur-mer', 21029],
    ['SC Courens', 'EAG', 'Courens', '#E2001A', '#000000', 'fan', 50, 'Stade Moncourt', 18378],
    ['SC Nanlieu', 'PAU', 'Nanlieu', '#FFD700', '#005CA9', 'fan', 47, 'Stade de la Lavlieu', 4031],
    ['AS Chagnan', 'ANN', 'Chagnan', '#E2001A', '#FFFFFF', 'fan', 47, 'Complexe Clerens', 15660],
    ['FC Valac', 'LAV', 'Valac', '#F58025', '#000000', 'fan', 47, 'Stade de la Couray', 18467],
    ['Athlétic Ponville', 'GRE2', 'Ponville', '#005CA9', '#FFFFFF', 'fan', 47, 'Stade Municipal de Ponville', 20068],
    ['Belcourt FC', 'AMI', 'Belcourt', '#FFFFFF', '#000000', 'fan', 48, 'Complexe Aubmont', 12097],
    ['US Lavles-bains', 'RSF', 'Lavles-bains', '#00863D', '#FFFFFF', 'fan', 46, 'Stade Valon', 10000],
    ['AJ Lavcourt', 'ROD', 'Lavcourt', '#E2001A', '#FFD700', 'fan', 46, 'Parc des Sports de Lavcourt', 5955],
    ['Athlétic Tourville', 'CF63', 'Tourville', '#E2001A', '#005CA9', 'fan', 49, 'Complexe Mareau', 11980],
    ['RC Coureau', 'USL', 'Coureau', '#005CA9', '#FFFFFF', 'fan', 46, 'Stade Municipal de Coureau', 4933],
    ['AS Bourac', 'SCBA', 'Bourac', '#005CA9', '#FFFFFF', 'historic', 47, 'Stade Municipal de Bourac', 16078],
    ['SC Bellac', 'LMF', 'Bellac', '#E2001A', '#FFD700', 'fallen', 47, 'Stade de la Saintcourt', 25064],
    ['SC Beauens', 'ASN', 'Beauens', '#FFFFFF', '#E2001A', 'fallen', 48, 'Stade de la Marsur-mer', 20087],
    [
      'AS Belles-bains',
      'USB',
      'Belles-bains',
      '#E2001A',
      '#000000',
      'fan',
      44,
      'Stade Municipal de Belles-bains',
      9534,
    ],
    ['Lavay FC', 'ETA', 'Lavay', '#005CA9', '#FFFFFF', 'fallen', 50, 'Stade Villes-bains', 21877],
  ];
  // League list: [compId, clubs, nation] — the world builder reads this
  FM.D.LEAGUE_CLUBS = [
    ['D1', 'CLUBS_D1', 'ENG'],
    ['D2', 'CLUBS_D2', 'ENG'],
    ['D3', 'CLUBS_D3', 'ENG'],
    ['ES1', 'CLUBS_ES1', 'ESP'],
    ['ES2', 'CLUBS_ES2', 'ESP'],
    ['DE1', 'CLUBS_DE1', 'GER'],
    ['FR1', 'CLUBS_FR1', 'FRA'],
    ['BR1', 'CLUBS_BR1', 'BRA'],
  ];
  FM.D.allClubRows = () => FM.D.LEAGUE_CLUBS.flatMap(([, k]) => FM.D[k]);

  FM.D.RIVALS = [
    ['MCI', 'MUN', 'Marstead Derby'],
    ['LIV', 'EVE', 'Harborough Derby'],
    ['ARS', 'TOT', 'Ripmouth Derby'],
    ['CHE', 'FUL', 'Ripmouth Derby'],
    ['NEW', 'SUN', 'Sedgefield–Gilwick Derby'],
    ['AVL', 'BIR', 'Wexbridge Derby'],
    ['NFO', 'DER', 'Yarwood–Linham Derby'],
    ['BHA', 'CRY', 'Ashford–Ripmouth Derby'],
    ['WHU', 'MIL', 'Ripmouth Derby'],
    ['WOL', 'WBA', 'Wexminster–Kesmouth Derby'],
    ['LEE', 'HUD', 'Calwick–Fenworth Derby'],
    ['SOU', 'POM', 'Shafborough–Dardale Derby'],
    ['BRE', 'QPR', 'Ripmouth Derby'],
    ['BUR', 'BLB', 'Branby–Dorgate Derby'],
    ['SHU', 'SHW', 'Barstead Derby'],
    ['IPS', 'NCI', 'Sedgebridge–Barfield Derby'],
    ['LEI', 'COV', 'Branwood–Dorminster Derby'],
    ['STK', 'PVA', 'Oakfield Derby'],
    ['SWA', 'CAR', 'Dorport–Tunmere Derby'],
    ['PNE', 'BLP', 'West Gildale–Great Gilfield Derby'],
    ['WAT', 'LUT', 'West Gilton–Linborough Derby'],
    ['BWA', 'WIG', 'Harham–Malby Derby'],
    ['BNS', 'ROT', 'Barton–Gilfield Derby'],
    ['PLY', 'EXE', 'Hexmere–Norchester Derby'],
    ['PBO', 'NTN', 'Chelthorpe–Wynley Derby'],
    ['RMA', 'FCB', 'Puenteblanca–Vallegrande Derby'],
    ['ATM', 'GET', 'Puenteblanca–Mesabella Derby'],
    ['ATH', 'RSO', 'Arroyosur–Playagrande Derby'],
    ['BET', 'SEV', 'Nuevagrande Derby'],
    ['VAL', 'LEV', 'Lomassol Derby'],
    ['VIL', 'CAS', 'Cañadanorte–Villaluna Derby'],
    ['CEL', 'DEP', 'Mesareal–Pozoalta Derby'],
    ['RCD', 'GIR', 'Vallegrande–Sanluna Derby'],
    ['OVI', 'SPG', 'Santaalta–Altogrande Derby'],
    ['RAY', 'LEG', 'Puenteblanca–Altomar Derby'],
    ['MAL', 'GRA', 'Lomasbella–Llanosur Derby'],
    ['LPA', 'TEN', 'Peñaalta–Vegarosa Derby'],
    ['ZAR', 'HUE', 'Rioreal–Mesagrande Derby'],
    ['ALA', 'EIB', 'Mesaalta–Santanorte Derby'],
    ['VLD', 'BGS', 'Montelara–Fortínalta Derby'],
    ['BAY', 'BVB', 'Kirchhausen–Rheinstadt Derby'],
    ['B04', 'KOE', 'Unterheim–Dornsee Derby'],
    ['SVW', 'HSV', 'Lindhausen–Obertal Derby'],
    ['SGE', 'M05', 'Eichkirchen–Badberg Derby'],
    ['VFB', 'SCF', 'Linddorf–Lindberg Derby'],
    ['RBL', 'FCU', 'Zellhafen–Thalhausen Derby'],
    ['PSG', 'OMA', 'Bourlac–Vilens Derby'],
    ['LIL', 'RCL', 'Chaon–Pongnan Derby'],
    ['NIC', 'ASM', 'Lanlieu–Lavlieu Derby'],
    ['REN', 'NAN', 'Fonac–Chalac Derby'],
    ['OLY', 'STE', 'Chales-bains–Courlac Derby'],
    ['RCS', 'FCM', 'Valville–Clercourt Derby'],
    ['SBR', 'LOR', 'Aubac–Roclac Derby'],
    ['PFC', 'HAC', 'Bourlac–Valay Derby'],
    ['FLA', 'FLU', 'Montebranca Derby'],
    ['PAL', 'COR', 'Sãorio Derby'],
    ['GRE', 'SCI', 'Torresol Derby'],
    ['CAM', 'CRU', 'Campomar Derby'],
    ['SAO', 'SAN', 'Sãorio–Portomar Derby'],
    ['BOT', 'VAS', 'Montebranca Derby'],
    ['BAH', 'VIT', 'Ribeiramar Derby'],
    ['FTZ', 'CEA', 'Boanova Derby'],
    ['INT', 'ACM', 'Borara Derby'],
    ['ROM', 'LAZ', 'Lanara Derby'],
    ['JUV', 'TOR', 'Belezia Derby'],
    ['FIO', 'BOL', 'Toretto–Sanetto Derby'],
    ['GEN', 'PIS', 'Vilago–Ponara Derby'],
    ['AJA', 'FEY', 'Oudwijk–Zuidhorst Derby'],
    ['TWE', 'HER', 'Noordhorst–Westveen Derby'],
    ['GRO', 'HEE', 'Zuidbrug–Noordhoven Derby'],
    ['GAE', 'PEC', 'Oostkerk–Oostdam Derby'],
    ['SPR', 'EXC', 'Zuidhorst Derby'],
    ['BEN', 'SCP', 'Novamar Derby'],
    ['VSC', 'SCB', 'Campogrande–Serragrande Derby'],
    ['RIV', 'BOC', 'Ríonueva Derby'],
    ['RAC', 'IND', 'Bajosol Derby'],
    ['ROS', 'NOB', 'Fuentesur Derby'],
    ['SLO', 'HUR', 'Ríonueva Derby'],
    ['ELP', 'GLP', 'Rocarosa Derby'],
    ['TAL', 'BEL', 'Altoverde Derby'],
    ['LAN', 'BAN', 'Cañadaverde–Vegaalta Derby'],
    ['GOD', 'IRI', 'Costasol Derby'],
    ['LAG', 'LAF', 'Stanhaven Derby'],
    ['SEA', 'PTI', 'Aldby–Hexford Derby'],
    ['NYC', 'NYR', 'Chelminster Derby'],
    ['TRT', 'MTL', 'Barley–Presmouth Derby'],
    ['HOU', 'DAL', 'Stanborough–Linwell Derby'],
    ['RAP', 'RSL', 'Hexwell–Linbridge Derby'],
    ['CIN', 'CLB', 'Ripwell–Gilbridge Derby'],
    ['ATL', 'ORL', 'Aldwood–Harbury Derby'],
    ['GAM', 'CER', 'Haruyama Derby'],
    ['YFM', 'KAW', 'Hokugawa–Akahara Derby'],
    ['FCT', 'TVE', 'Akiura Derby'],
    ['URA', 'KAS', 'Kitahama–Narishima Derby'],
    ['AME', 'CHV', 'Costagrande–Fortínreal Derby'],
    ['MTY', 'TGR', 'Santareal–Villareal Derby'],
    ['CAZ', 'PUM', 'Costagrande Derby'],
    ['ULS', 'POH', 'Gangdong–Namsan Derby'],
    ['SEO', 'ANY', 'Jeonjin–Sincheon Derby'],
    ['BKU', 'PRT', 'Nakhonpur Derby'],
    ['ENY', 'RAN', 'Stangate–New Tunfield Derby'],
    ['WAC', 'RCA', 'Belay Derby'],
    ['FAR', 'FUS', 'Nangnan Derby'],
    ['MAT', 'IRT', 'Chasur-mer–Belac Derby'],
    ['CZV', 'FKP', 'Draovac Derby'],
    ['VOJ', 'SPS', 'Slaica–Malin Derby'],
  ];

  // Overseas clubs — "minimal simulation" tier: squads exist for scouting, no fixtures.
  FM.D.CLUBS_OVERSEAS = []; // Saint-Étienne, Montpellier and Tenerife now play in Ligue 2 and the Primera Federación

  // ---------- Alpha 1: the wider world in three simulation tiers ----------
  // full    — every match in the engine, finances, cups, transfers
  // light   — every fixture played, results from a fast statistical model with per-match player stats
  // minimal — fixtures produce scores only; squads exist for scouting and the market
  // Rows: [name, short, city, primary, secondary, identity, rep, stadium, capacity]
  FM.D.CLUBS_IT1 = [
    ['SSC Borara', 'INT', 'Borara', '#0068A8', '#000000', 'giant', 86, 'Stadio Nuovo Vilara', 75817],
    ['Virtus Belezia', 'JUV', 'Belezia', '#FFFFFF', '#000000', 'giant', 84, 'Stadio Nuovo Santana', 41507],
    ['AC Albaana', 'NAP', 'Albaana', '#12A0D7', '#FFFFFF', 'historic', 83, 'Stadio Comunale di Albaana', 54726],
    ['FC Borara', 'ACM', 'Borara', '#FB090B', '#000000', 'giant', 82, 'Stadio Vilana', 75817],
    ['ASD Lanola', 'ATA', 'Lanola', '#1E71B8', '#000000', 'selling', 78, 'Arena Santate', 24950],
    ['Virtus Lanara', 'ROM', 'Lanara', '#8E1F2F', '#F0BC42', 'historic', 78, 'Stadio Belara', 70634],
    ['ASD Lanara', 'LAZ', 'Lanara', '#87D8F7', '#FFFFFF', 'historic', 74, 'Stadio Pieate', 70634],
    ['Sanetto Calcio', 'BOL', 'Sanetto', '#A21C26', '#1A2F48', 'youth', 73, 'Arena Marello', 36462],
    ['Virtus Toretto', 'FIO', 'Toretto', '#482E92', '#FFFFFF', 'historic', 73, 'Stadio Nuovo Marate', 43147],
    ['AC Albaetto', 'COM', 'Albaetto', '#0E3E8C', '#FFFFFF', 'oil', 70, 'Stadio Comunale di Albaetto', 13602],
    ['ASD Belezia', 'TOR', 'Belezia', '#8A1E03', '#FFFFFF', 'historic', 66, 'Arena Casia', 28177],
    ['Torate 1908', 'UDI', 'Torate', '#FFFFFF', '#000000', 'selling', 64, 'Stadio Serola', 25144],
    ['Vilago Calcio', 'GEN', 'Vilago', '#A6192E', '#002E5D', 'fan', 64, 'Stadio Marona', 36599],
    ['Sanana 1908', 'PAR', 'Sanana', '#FFFFFF', '#FFD100', 'fan', 62, 'Stadio Nuovo Sanello', 22352],
    ['AC Ferino', 'CAG', 'Ferino', '#A6192E', '#002E5D', 'fan', 62, 'Arena Venago', 16416],
    ['ASD Borona', 'SAS', 'Borona', '#00A650', '#000000', 'youth', 61, 'Stadio Nuovo Serello', 21584],
    ['Santia Calcio', 'VER', 'Santia', '#FFD100', '#003DA5', 'youth', 60, 'Arena Albaello', 39211],
    ['Atletico Ponola', 'LEC', 'Ponola', '#FFD100', '#E30613', 'youth', 60, 'Stadio Albaana', 31533],
    ['ASD Ravago', 'CRE', 'Ravago', '#E30613', '#9A9A9A', 'fan', 58, 'Stadio Monola', 16003],
    ['Atletico Ponara', 'PIS', 'Ponara', '#000000', '#0033A0', 'fan', 58, 'Stadio Santezia', 25000],
  ];
  FM.D.CLUBS_NL1 = [
    ['FC Oudwijk', 'AJA', 'Oudwijk', '#FFFFFF', '#D2122E', 'giant', 81, 'Oudwijk Arena', 55865],
    ['SC Dijklo', 'PSV', 'Dijklo', '#ED1C24', '#FFFFFF', 'historic', 80, 'Haarbrug Stadion', 35119],
    ['KV Zuidhorst', 'FEY', 'Zuidhorst', '#FF0000', '#FFFFFF', 'fan', 79, 'Dijkstad Stadion', 47500],
    ['SC Laagkerk', 'AZA', 'Laagkerk', '#DB0021', '#FFFFFF', 'selling', 72, 'De Westveen', 19478],
    ['KV Noordhorst', 'TWE', 'Noordhorst', '#E30613', '#FFFFFF', 'historic', 68, 'Dijklo Stadion', 30205],
    ['RKC Veenhoven', 'UTR', 'Veenhoven', '#E30613', '#FFFFFF', 'fan', 66, 'Westhorst Stadion', 23750],
    ['KV Oostkerk', 'GAE', 'Oostkerk', '#E30613', '#FFD100', 'fan', 62, 'Stadion Veenburg', 10400],
    ['RKC Westburg', 'NEC', 'Westburg', '#E30613', '#00843D', 'fan', 62, 'Hoogdijk Stadion', 12500],
    ['Sparta Noordhoven', 'HEE', 'Noordhoven', '#0055A4', '#FFFFFF', 'youth', 61, 'Noordhoven Arena', 26100],
    ['KV Zuidbrug', 'GRO', 'Zuidbrug', '#008000', '#FFFFFF', 'historic', 60, 'Westzand Stadion', 22525],
    ['FC Zuidhorst', 'SPR', 'Zuidhorst', '#E4002B', '#FFFFFF', 'youth', 58, 'Stadion Haarstad', 11026],
    ['AFC Oostdam', 'PEC', 'Oostdam', '#0055A4', '#FFFFFF', 'fan', 58, 'Stadion Veenbrug', 14000],
    ['SC Kleinstad', 'FSI', 'Kleinstad', '#FFD100', '#00843D', 'fan', 57, 'Kleinstad Arena', 12500],
    ['RKC Kleinkerk', 'NAC', 'Kleinkerk', '#FFD100', '#000000', 'fan', 57, 'Zuidwijk Stadion', 19000],
    ['KV Westveen', 'HER', 'Westveen', '#000000', '#FFFFFF', 'fan', 56, 'De Oudbrug', 12080],
    ['Sparta Westlo', 'VOL', 'Westlo', '#FF7F00', '#000000', 'youth', 55, 'Westlo Arena', 7384],
    ['Victoria Zuidhorst', 'EXC', 'Zuidhorst', '#E30613', '#000000', 'fan', 55, 'Kleinburg Stadion', 4500],
    ['ADO Bergburg', 'TEL', 'Bergburg', '#FFFFFF', '#000000', 'fan', 54, 'Stadion Haardijk', 5200],
  ];
  FM.D.CLUBS_PT1 = [
    ['Novamar FC', 'BEN', 'Novamar', '#E30613', '#FFFFFF', 'giant', 83, 'Arena Praiario', 64642],
    ['Novaverde EC', 'FCP', 'Novaverde', '#003893', '#FFFFFF', 'giant', 82, 'Estádio Praialua', 50033],
    ['Racing Novamar', 'SCP', 'Novamar', '#008057', '#FFFFFF', 'historic', 82, 'Estádio Valverdebranca', 50095],
    ['Atlético Serragrande', 'SCB', 'Serragrande', '#E30613', '#FFFFFF', 'selling', 74, 'Estádio Belabranca', 30286],
    ['Esporte Clube Campogrande', 'VSC', 'Campogrande', '#FFFFFF', '#000000', 'fan', 66, 'Arena Portobela', 30029],
    [
      'Esporte Clube Ribeirasol',
      'SCL',
      'Ribeirasol',
      '#E30613',
      '#FFFFFF',
      'fan',
      60,
      'Estádio Municipal de Ribeirasol',
      13277,
    ],
    ['Esporte Clube Torreverde', 'FAM', 'Torreverde', '#FFFFFF', '#003DA5', 'selling', 60, 'Estádio Sãoreal', 5307],
    ['Sporting Belabela', 'EST', 'Belabela', '#FFDD00', '#0038A8', 'youth', 60, 'Estádio Belabela', 8000],
    ['Esporte Clube Vilasol', 'GIL', 'Vilasol', '#E30613', '#003DA5', 'fan', 58, 'Estádio Belaverde', 12046],
    ['Clube Montenova', 'ARO', 'Montenova', '#FFD100', '#0033A0', 'fan', 58, 'Arena Valverdebela', 5600],
    ['Racing Boareal', 'RAV', 'Boareal', '#00843D', '#FFFFFF', 'oil', 57, 'Estádio Valverdesol', 9065],
    ['Clube Praiabela', 'MOR', 'Praiabela', '#00843D', '#FFFFFF', 'fan', 57, 'Estádio Nova Altoazul', 6153],
    ['Clube Novamar', 'CPI', 'Novamar', '#000000', '#FFFFFF', 'fan', 57, 'Arena Serralua', 3000],
    ['Vilaazul EC', 'CDN', 'Vilaazul', '#000000', '#FFFFFF', 'historic', 55, 'Arena Praiabela', 5132],
    ['Montemar FC', 'AVS', 'Montemar', '#E30613', '#FFFFFF', 'fan', 54, 'Estádio Santaazul', 8560],
    ['Ribeirario FC', 'EAM', 'Ribeirario', '#E30613', '#00843D', 'fan', 54, 'Estádio Nova Torrelua', 9288],
    ['União Valverdegrande', 'ALV', 'Valverdegrande', '#E30613', '#FFFFFF', 'selling', 54, 'Arena Valverdereal', 7705],
    ['Grémio Novasol', 'TON', 'Novasol', '#FFD100', '#00843D', 'fan', 53, 'Estádio Municipal de Novasol', 5000],
  ];
  FM.D.CLUBS_AR1 = [
    ['Ríonueva CF', 'RIV', 'Ríonueva', '#FFFFFF', '#E30613', 'giant', 79, 'Estadio La Cerrosur', 85018],
    ['Atlético Ríonueva', 'BOC', 'Ríonueva', '#0033A0', '#FFD100', 'giant', 78, 'Nuevo Estadio Ríonueva', 54000],
    ['Racing Bajosol', 'RAC', 'Bajosol', '#6CACE4', '#FFFFFF', 'historic', 70, 'Estadio Llanobella', 51389],
    ['UD Bajosol', 'IND', 'Bajosol', '#E30613', '#FFFFFF', 'fallen', 67, 'Estadio Municipal de Bajosol', 48069],
    ['UD Rocarosa', 'ELP', 'Rocarosa', '#E30613', '#FFFFFF', 'youth', 66, 'Nuevo Estadio Rocarosa', 30018],
    ['Racing Ríonueva', 'SLO', 'Ríonueva', '#0033A0', '#E30613', 'historic', 65, 'Estadio Santamar', 47964],
    ['UD Ríonueva', 'VEL', 'Ríonueva', '#FFFFFF', '#0033A0', 'youth', 64, 'Campo de Ríonueva', 49540],
    ['Altoverde CF', 'TAL', 'Altoverde', '#0033A0', '#FFFFFF', 'selling', 63, 'Campo de Altoverde', 57000],
    ['Club Fuentesur', 'ROS', 'Fuentesur', '#003DA5', '#FFD100', 'fan', 63, 'Estadio La Cerronueva', 41654],
    ['Sporting Cañadaverde', 'LAN', 'Cañadaverde', '#8A1538', '#FFFFFF', 'selling', 63, 'Estadio Altomora', 47027],
    ['Ríonueva Balompié', 'ARJ', 'Ríonueva', '#E30613', '#FFFFFF', 'youth', 62, 'Estadio La Lomasluna', 26000],
    ['Real Fuentesur', 'NOB', 'Fuentesur', '#E30613', '#000000', 'fan', 61, 'Estadio Altolara', 42000],
    ['Club Ríonueva', 'HUR', 'Ríonueva', '#FFFFFF', '#E30613', 'fan', 60, 'Estadio Lomasreal', 48314],
    [
      'Deportivo Ríoblanca',
      'DYJ',
      'Ríoblanca',
      '#FFD100',
      '#00843D',
      'selling',
      60,
      'Estadio Municipal de Ríoblanca',
      20000,
    ],
    ['Sporting Altoverde', 'BEL', 'Altoverde', '#6CACE4', '#FFFFFF', 'fan', 60, 'Estadio Rocagrande', 30000],
    ['CD Rocarosa', 'GLP', 'Rocarosa', '#FFFFFF', '#1B2C5A', 'fan', 58, 'Estadio La Pradogrande', 24544],
    ['Club Costasol', 'GOD', 'Costasol', '#0033A0', '#FFFFFF', 'youth', 58, 'Estadio Nuevanorte', 42000],
    ['CD Camporeal', 'TIG', 'Camporeal', '#0033A0', '#E30613', 'fan', 57, 'Estadio Municipal de Camporeal', 26282],
    ['Club Monterosa', 'UNI', 'Monterosa', '#E30613', '#FFFFFF', 'fan', 57, 'Estadio La Cerroalta', 22852],
    ['Altoverde Balompié', 'INS', 'Altoverde', '#E30613', '#FFFFFF', 'fan', 57, 'Estadio Fuentenueva', 26535],
    ['Deportivo Vegaalta', 'BAN', 'Vegaalta', '#00843D', '#FFFFFF', 'youth', 57, 'Estadio La Bajobella', 34901],
    ['Real Costasol', 'IRI', 'Costasol', '#0033A0', '#FFFFFF', 'fan', 56, 'Estadio Puertoblanca', 24000],
    [
      'Deportivo Arroyonorte',
      'ATU',
      'Arroyonorte',
      '#6CACE4',
      '#FFFFFF',
      'fan',
      56,
      'Nuevo Estadio Arroyonorte',
      35200,
    ],
    ['Atlético Cabonorte', 'PLA', 'Cabonorte', '#FFFFFF', '#6B3F1F', 'fan', 56, 'Estadio Llanoreal', 28530],
    ['CD Ríonueva', 'BAR', 'Ríonueva', '#E30613', '#FFFFFF', 'fan', 55, 'Estadio Ríolara', 4500],
    ['Atlético Pozolara', 'CCD', 'Pozolara', '#000000', '#FFFFFF', 'fan', 55, 'Estadio Pradoreal', 30000],
    ['Racing Altoalta', 'SAR', 'Altoalta', '#00843D', '#FFFFFF', 'fan', 54, 'Estadio Playarosa', 22000],
    ['Real Ríonueva', 'RIE', 'Ríonueva', '#000000', '#FFFFFF', 'fan', 53, 'Estadio Municipal de Ríonueva', 3000],
  ];
  FM.D.CLUBS_US1 = [
    ['Redstead Athletic', 'MIA', 'Redstead', '#F7B5CD', '#231F20', 'oil', 67, 'Redstead Ground', 21550],
    ['Stanhaven City', 'LAF', 'Stanhaven', '#000000', '#C39E6D', 'oil', 66, 'Stanhaven Park', 22000],
    ['Stanhaven Athletic', 'LAG', 'Stanhaven', '#FFFFFF', '#00245D', 'historic', 65, 'Oakstead Road', 27000],
    ['Aldby Rangers', 'SEA', 'Aldby', '#5D9741', '#005595', 'fan', 64, 'Bromport Field', 37722],
    ['Ripwell United', 'CIN', 'Ripwell', '#003087', '#FE5000', 'youth', 63, 'Aldgate Field', 26000],
    ['Gilbridge Albion', 'CLB', 'Gilbridge', '#FEDD00', '#000000', 'historic', 62, 'Gilbridge Ground', 20371],
    ['Kelgate County', 'PHI', 'Kelgate', '#071B2C', '#B19B69', 'youth', 62, 'Ashminster Field', 18500],
    ['Chelminster Wanderers', 'NYC', 'Chelminster', '#6CACE4', '#041E42', 'oil', 62, 'Bargate Park', 28743],
    ['Aldwood Rangers', 'ATL', 'Aldwood', '#80000A', '#A19060', 'fan', 61, 'Linfield Park', 42500],
    ['Chelminster City', 'NYR', 'Chelminster', '#FFFFFF', '#BA0C2F', 'oil', 60, 'Chelminster Park', 25000],
    ['Malwell City', 'NSH', 'Malwell', '#ECE83A', '#1F1646', 'fan', 60, 'Malwell Park', 30000],
    ['Harbury City', 'ORL', 'Harbury', '#633492', '#FDE192', 'fan', 60, 'Harbury Ground', 25500],
    ['Branmouth Victoria', 'VAN', 'Branmouth', '#FFFFFF', '#00245E', 'youth', 60, 'Branmouth Park', 22120],
    ['Hexford Wanderers', 'PTI', 'Hexford', '#00482B', '#D69A00', 'fan', 59, 'Hexford Park', 25218],
    ['Linwood City', 'MIN', 'Linwood', '#585958', '#8CD2F4', 'fan', 58, 'The Wynborough Stadium', 19400],
    ['Elmbrook Albion', 'SDG', 'Elmbrook', '#1B1F23', '#6E4C9F', 'oil', 58, 'Wynport Park', 35000],
    ['Linbridge County', 'RSL', 'Linbridge', '#B30838', '#013A81', 'youth', 58, 'Sedgeham Field', 20213],
    ['Linwell County', 'DAL', 'Linwell', '#E81F3E', '#2A4076', 'youth', 58, 'Linwell Ground', 20500],
    ['Ashwell Rovers', 'CLT', 'Ashwell', '#1A85C8', '#000000', 'fan', 57, 'Elmwood Lane', 38000],
    ['Stanborough Town', 'HOU', 'Stanborough', '#FF6B00', '#101820', 'fan', 57, 'Kelstead Road', 22039],
    ['Barmere Rangers', 'SKC', 'Barmere', '#91B0D5', '#002F65', 'fan', 57, 'Darhaven Park', 18467],
    ['Thornbury County', 'STL', 'Thornbury', '#DD004A', '#0A1E2C', 'fan', 57, 'The Elmborough Stadium', 22423],
    ['Hexwell United', 'RAP', 'Hexwell', '#960A2C', '#9CC2EA', 'youth', 56, 'Hexwell Park', 18061],
    ['Hexbury City', 'AUS', 'Hexbury', '#00B140', '#000000', 'fan', 56, 'Malham Lane', 20738],
    ['Lanminster Borough', 'CHI', 'Lanminster', '#7CCDEF', '#FF0000', 'fan', 56, 'Gilbury Park', 61500],
    ['Lanmouth Town', 'DCU', 'Lanmouth', '#000000', '#EF3E42', 'fan', 56, 'Calmere Park', 20000],
    ['Bradhaven Rovers', 'NER', 'Bradhaven', '#0A2240', '#CE0E2D', 'fan', 56, 'Bradhaven Ground', 65878],
    ['Barley Rangers', 'TRT', 'Barley', '#B81137', '#455560', 'fan', 57, 'Saldale Lane', 30991],
    ['Presmouth Athletic', 'MTL', 'Presmouth', '#000000', '#0033A1', 'fan', 55, 'Presmouth Park', 19619],
    ['Lincombe City', 'SJE', 'Lincombe', '#0067B1', '#000000', 'fan', 55, 'Thorncombe Road', 18000],
  ];
  FM.D.CLUBS_JP1 = [
    ['Kawamoto Blaze', 'VIS', 'Kawamoto', '#8B0000', '#FFFFFF', 'oil', 64, 'Miyagawa Stadium', 30132],
    [
      'Narishima Sport Club',
      'KAS',
      'Narishima',
      '#B8002D',
      '#1D2088',
      'historic',
      64,
      'Narishima Sports Complex',
      40728,
    ],
    ['Kitahama Verde', 'URA', 'Kitahama', '#E60012', '#000000', 'giant', 63, 'Sakurata Park', 63700],
    ['Takegawa Sevens', 'SFH', 'Takegawa', '#50318F', '#FFFFFF', 'youth', 63, 'Sakurahama Arena', 28520],
    ['Akahara Sevens', 'KAW', 'Akahara', '#1E90FF', '#000000', 'historic', 62, 'Fujiura Park', 26827],
    ['Hokugawa Verde', 'YFM', 'Hokugawa', '#0033A0', '#FFFFFF', 'historic', 61, 'Miyaura Arena', 72327],
    ['Haruyama City', 'GAM', 'Haruyama', '#1A3D8F', '#000000', 'historic', 60, 'Haruyama Athletic Stadium', 39694],
    ['Takehara Phoenix', 'MAC', 'Takehara', '#002E6E', '#C8A200', 'oil', 60, 'Minamishima Stadium', 15489],
    ['Akiura City', 'FCT', 'Akiura', '#0033A0', '#E60012', 'fan', 60, 'Saimoto Stadium', 49970],
    ['Miyaura Blaze', 'KSW', 'Miyaura', '#FFF000', '#000000', 'selling', 58, 'Miyaura Sports Complex', 15109],
    ['Kawakami Phoenix', 'NAG', 'Kawakami', '#D6000F', '#F9A61A', 'fan', 58, 'Sakuramoto Arena', 44380],
    ['Haruyama Blaze', 'CER', 'Haruyama', '#EC6A9E', '#0A1F5C', 'historic', 58, 'Harukami Arena', 24481],
    ['Harumori United', 'AVI', 'Harumori', '#1C1C7C', '#AAAAAA', 'youth', 56, 'Sakuramori Park', 21562],
    ['Takeyama United', 'KYO', 'Takeyama', '#6A1B9A', '#FFFFFF', 'fan', 56, 'Nishikami Park', 21600],
    ['Shinmoto Phoenix', 'NII', 'Shinmoto', '#FF6600', '#003DA5', 'youth', 55, 'Takayama Stadium', 42300],
    ['Saita Sport Club', 'SBM', 'Saita', '#8CC63F', '#003DA5', 'youth', 55, 'Takakami Arena', 15380],
    ['Akiura Phoenix', 'TVE', 'Akiura', '#00843D', '#FFFFFF', 'fan', 55, 'Akiura Sports Complex', 49970],
    ['Saiyama Phoenix', 'SHI', 'Saiyama', '#FF8200', '#003DA5', 'fan', 55, 'Hokuhama Arena', 19594],
    ['Shinta Phoenix', 'OKA', 'Shinta', '#9E1B32', '#FFFFFF', 'fan', 53, 'Kawakami Park', 15479],
    ['Hokugawa City', 'YFC', 'Hokugawa', '#00A0E9', '#FFFFFF', 'fan', 53, 'Sakurano Arena', 15440],
  ];
  // Minimal tier (8 clubs): [name, short, city, primary, secondary, identity, rep]
  FM.D.CLUBS_MX1 = [
    ['Sporting Costagrande', 'AME', 'Costagrande', '#FFE600', '#0A1F5C', 'giant', 70, 'Estadio Lomasrosa'],
    ['CD Santareal', 'MTY', 'Santareal', '#0B2240', '#FFFFFF', 'oil', 68, 'Estadio Puentesol'],
    ['Atlético Villareal', 'TGR', 'Villareal', '#FDB913', '#003DA5', 'oil', 68, 'Estadio Playablanca'],
    ['UD Fortínreal', 'CHV', 'Fortínreal', '#E30613', '#FFFFFF', 'historic', 67, 'Estadio La Sierrarosa'],
    ['UD Costagrande', 'CAZ', 'Costagrande', '#0033A0', '#FFFFFF', 'historic', 66, 'Estadio Lomasnueva'],
    ['Unión Picoblanca', 'TOL', 'Picoblanca', '#E30613', '#FFFFFF', 'fan', 64, 'Estadio Santamora'],
    ['Club Costagrande', 'PUM', 'Costagrande', '#0B2240', '#C5A45A', 'youth', 63, 'Campo de Costagrande'],
    ['Club Nuevasol', 'PAC', 'Nuevasol', '#FFFFFF', '#0033A0', 'selling', 63, 'Estadio La Playaverde'],
    ['Deportivo Montenueva', 'LEO', 'Montenueva', '#00843D', '#FFFFFF', 'selling', 62, 'Estadio Playaluna'],
    ['Atlético Mesalara', 'SLA', 'Mesalara', '#00843D', '#FFFFFF', 'youth', 60, 'Estadio Villabella'],
    ['Unión Fortínreal', 'ATS', 'Fortínreal', '#E30613', '#000000', 'fan', 60, 'Campo de Fortínreal'],
    ['Sporting Bahíarosa', 'TIJ', 'Bahíarosa', '#E30613', '#000000', 'fan', 58, 'Campo de Bahíarosa'],
    ['Playarosa Balompié', 'NCX', 'Playarosa', '#E30613', '#FFFFFF', 'fan', 57, 'Campo de Playarosa'],
    ['Atlético Ríosol', 'QRO', 'Ríosol', '#0033A0', '#000000', 'fan', 56, 'Estadio Villaalta'],
    ['Sporting Arroyorosa', 'PUE', 'Arroyorosa', '#FFFFFF', '#0033A0', 'fan', 56, 'Estadio Municipal de Arroyorosa'],
    ['CD Vallemar', 'JUA', 'Vallemar', '#00843D', '#E30613', 'fan', 56, 'Estadio Arroyogrande'],
    ['Deportivo Rocadorada', 'ASL', 'Rocadorada', '#E30613', '#003DA5', 'fan', 56, 'Estadio Pozonueva'],
    ['Unión Arroyogrande', 'MAZ', 'Arroyogrande', '#6A1B9A', '#FFFFFF', 'fan', 55, 'Campo de Arroyogrande'],
  ];
  FM.D.CLUBS_NG1 = [
    ['Stangate Orient', 'ENY', 'Stangate', '#003DA5', '#FFFFFF', 'giant', 55, 'Oakham Road'],
    ['New Tunfield Wanderers', 'RAN', 'New Tunfield', '#E30613', '#FFFFFF', 'historic', 52, 'Darcombe Lane'],
    ['Linthorpe Victoria', 'RVU', 'Linthorpe', '#0369A1', '#F59E0B', 'oil', 52, 'Fenport Lane'],
    ['Yarport United', 'REM', 'Yarport', '#15803D', '#FFFFFF', 'selling', 51, 'Ashwold Park'],
    ['Aldborough Victoria', 'KPI', 'Aldborough', '#FFD100', '#006400', 'historic', 51, 'Tuncombe Field'],
    ['Calbrook City', 'SSC', 'Calbrook', '#003DA5', '#FFFFFF', 'fan', 49, 'Presminster Field'],
    ['Redwick Borough', 'LOB', 'Redwick', '#E30613', '#FFFFFF', 'fan', 48, 'Linwood Lane'],
    ['Chelley Rovers', 'PLU', 'Chelley', '#E30613', '#FFD100', 'youth', 48, 'Elmmouth Park'],
    ['Barbridge Athletic', 'BDI', 'Barbridge', '#003DA5', '#FFFFFF', 'historic', 47, 'Yarwell Park'],
    ['Shafstead Rangers', 'HRT', 'Shafstead', '#E30613', '#FFFFFF', 'historic', 47, 'Fenstead Lane'],
    ['Upper Oakbridge Town', 'IKC', 'Upper Oakbridge', '#003DA5', '#FFD100', 'oil', 47, 'Upper Oakbridge Ground'],
    ['Yargate Rovers', 'ABW', 'Yargate', '#00843D', '#FFD100', 'fan', 47, 'Stancliff Park'],
    ['Aldfield Wanderers', 'AKW', 'Aldfield', '#003DA5', '#FFFFFF', 'fan', 47, 'The Cheldale Stadium'],
    ['Marbrook Rovers', 'KWU', 'Marbrook', '#00843D', '#FFFFFF', 'fan', 46, 'Linwold Field'],
    ['Shafworth County', 'NSU', 'Shafworth', '#FFD100', '#00843D', 'fan', 46, 'Bexcliff Field'],
    ['Aldcliff Wanderers', 'NIT', 'Aldcliff', '#FFD100', '#003DA5', 'fan', 46, 'Aldcliff Ground'],
    ['New Penwell Orient', 'BYU', 'New Penwell', '#003DA5', '#E30613', 'fan', 46, 'Kesing Park'],
    ['Fenwell Orient', 'EKW', 'Fenwell', '#00843D', '#FFFFFF', 'fan', 46, 'Wexfield Park'],
    ['Lancombe County', 'KTU', 'Lancombe', '#E30613', '#00843D', 'fan', 45, 'Oakthorpe Park'],
    ['Wynwick Town', 'SUS', 'Wynwick', '#FFD100', '#003DA5', 'fan', 45, 'Wynwick Park'],
  ];
  FM.D.CLUBS_KR1 = [
    ['Gangdong Citizen', 'ULS', 'Gangdong', '#003DA5', '#FFD100', 'oil', 60, 'Gangdong Stadium'],
    ['FC Haeri', 'JBH', 'Haeri', '#00843D', '#FFD100', 'giant', 60, 'Haeri Civic Stadium'],
    ['Namsan Stars', 'POH', 'Namsan', '#E30613', '#000000', 'historic', 57, 'Namjeong Sports Complex'],
    ['Jeonjin Athletic', 'SEO', 'Jeonjin', '#E30613', '#000000', 'historic', 57, 'Jeonjin Stadium'],
    ['Haesan Athletic', 'DJN', 'Haesan', '#6A1B9A', '#00843D', 'oil', 55, 'Daedong Arena'],
    ['Gyeongri Tigers', 'GWA', 'Gyeongri', '#FFD100', '#E30613', 'youth', 54, 'Gyeongri Stadium'],
    ['Jeonsan FC', 'GAN', 'Jeonsan', '#FF7F00', '#003DA5', 'fan', 53, 'Gangdong Arena'],
    ['Daewon Citizen', 'GIM', 'Daewon', '#E30613', '#003DA5', 'fan', 53, 'Jeonhwa Sports Complex'],
    ['Seohwa FC', 'JEJ', 'Seohwa', '#FF6600', '#000000', 'fan', 52, 'Seohwa Civic Stadium'],
    ['Munhwa United', 'DGU', 'Munhwa', '#87CEEB', '#1C2B4F', 'youth', 52, 'Munhwa Civic Stadium'],
    ['Wolyang Dolphins', 'SUW', 'Wolyang', '#E30613', '#003DA5', 'fan', 52, 'Wolyang Stadium'],
    ['Sincheon Citizen', 'ANY', 'Sincheon', '#5B2C83', '#FFFFFF', 'fan', 51, 'Sincheon Civic Stadium'],
  ];
  FM.D.CLUBS_TH1 = [
    ['Nongra City', 'BRU', 'Nongra', '#003DA5', '#FFD100', 'oil', 56, 'Singlek Stadium'],
    ['FC Sriyai', 'BGP', 'Sriyai', '#0A1E5E', '#FFFFFF', 'oil', 52, 'Phusai Stadium'],
    ['Nakhonpur Rangers', 'BKU', 'Nakhonpur', '#E30613', '#FFFFFF', 'historic', 51, 'Nakhonpur Provincial Stadium'],
    ['Nakhonpur United', 'PRT', 'Nakhonpur', '#FF7F00', '#003DA5', 'fan', 50, 'Thasai Stadium'],
    ['Kaopur Rangers', 'MTU', 'Kaopur', '#E30613', '#000000', 'historic', 50, 'Kaopur Provincial Stadium'],
    ['Paklek United', 'CRA', 'Paklek', '#003DA5', '#FFFFFF', 'youth', 48, 'Phranong Sports Park'],
    ['Pakchan Rangers', 'CHB', 'Pakchan', '#0055A4', '#FFFFFF', 'historic', 48, 'Phramai Arena'],
    ['Maethong United', 'RAT', 'Maethong', '#E30613', '#FFD100', 'youth', 47, 'Phunong Sports Park'],
    ['Ubonnong Rangers', 'UTH', 'Ubonnong', '#FF7F00', '#000000', 'fan', 46, 'Srithong Sports Park'],
    ['Thachan Athletic', 'PRA', 'Thachan', '#E30613', '#FFFFFF', 'fan', 46, 'Thachan Stadium'],
    ['Chiangmai Athletic', 'SKT', 'Chiangmai', '#FFD100', '#000000', 'fan', 46, 'Singmai Arena'],
    ['Phusai Athletic', 'KBP', 'Phusai', '#003DA5', '#E30613', 'oil', 46, 'Phralek Sports Park'],
    ['Srichan FC', 'LPW', 'Srichan', '#6A1B9A', '#FFFFFF', 'fan', 45, 'Srichan Provincial Stadium'],
    ['Maenam Rangers', 'AYU', 'Maenam', '#E30613', '#FFFFFF', 'fan', 45, 'Maenam Provincial Stadium'],
    ['Khaosai Athletic', 'RYG', 'Khaosai', '#003DA5', '#FFFFFF', 'fan', 44, 'Bannam Sports Park'],
    ['FC Lamburi', 'NRS', 'Lamburi', '#FF7F00', '#6A1B9A', 'fan', 44, 'Maeburi Arena'],
  ];
  FM.D.CLUBS_RS1 = [
    ['FC Draovac', 'CZV', 'Draovac', '#E30613', '#FFFFFF', 'giant', 64, 'Stadion Novin'],
    ['KS Draovac', 'FKP', 'Draovac', '#000000', '#FFFFFF', 'giant', 61, 'Novina Arena'],
    ['FK Slaica', 'VOJ', 'Slaica', '#E30613', '#FFFFFF', 'historic', 57, 'Slaica Park'],
    ['Mirina Sokol', 'TSC', 'Mirina', '#003DA5', '#FFFFFF', 'oil', 56, 'Stadion Mirek'],
    ['Union Draovac', 'CUK', 'Draovac', '#000000', '#FFD100', 'youth', 53, 'Stadion Bratina'],
    ['SK Novek', 'RAD', 'Novek', '#E30613', '#FFFFFF', 'fan', 53, 'Gradski Stadion Novek'],
    ['Kraina Sokol', 'NPZ', 'Kraina', '#E30613', '#FFFFFF', 'fan', 52, 'Stadion Bratava'],
    ['Slavia Draovac', 'OFK', 'Draovac', '#003DA5', '#FFFFFF', 'historic', 51, 'Stadion Borec'],
    ['Draovac Sokol', 'IMT', 'Draovac', '#1F2937', '#E5E7EB', 'youth', 50, 'Draovac Park'],
    ['NK Malin', 'SPS', 'Malin', '#003DA5', '#FFFFFF', 'fan', 50, 'Malin Park'],
    ['KS Velgrad', 'RNI', 'Velgrad', '#E30613', '#003DA5', 'fan', 50, 'Bogek Arena'],
    ['SK Plesina', 'ZEL', 'Plesina', '#003DA5', '#FFFFFF', 'fan', 49, 'Stadion Gorin'],
    ['KS Gorica', 'NKR', 'Gorica', '#E30613', '#FFFFFF', 'fan', 49, 'Stadion Zelina'],
    ['FK Radina', 'MLU', 'Radina', '#E30613', '#FFFFFF', 'fan', 48, 'Stadion Tarany'],
    ['Union Bratgrad', 'JUB', 'Bratgrad', '#003DA5', '#FFFFFF', 'fan', 46, 'Stadion Tarovo'],
    ['KS Zagpol', 'TEK', 'Zagpol', '#00843D', '#FFFFFF', 'fan', 46, 'Zagpol Park'],
  ];
  FM.D.CLUBS_MA1 = [
    ['Athlétic Belay', 'WAC', 'Belay', '#E30613', '#FFFFFF', 'giant', 59, 'Complexe Nanmont'],
    ['SC Belay', 'RCA', 'Belay', '#00843D', '#FFFFFF', 'giant', 59, 'Stade Courmont'],
    ['Athlétic Nangnan', 'FAR', 'Nangnan', '#E30613', '#000000', 'historic', 57, 'Complexe Foncourt'],
    ['RC Ponlac', 'RSB', 'Ponlac', '#FF7F00', '#000000', 'oil', 56, 'Complexe Chaay'],
    ['US Nangnan', 'FUS', 'Nangnan', '#003DA5', '#FFFFFF', 'youth', 54, 'Complexe Saintay'],
    ['Athlétic Beaulieu', 'MAS', 'Beaulieu', '#FFD100', '#000000', 'historic', 52, 'Complexe Bourac'],
    ['FC Lavville', 'HAG', 'Lavville', '#E30613', '#FFD100', 'fan', 50, 'Stade Vilsur-mer'],
    ['FC Belac', 'IRT', 'Belac', '#003DA5', '#FFFFFF', 'youth', 50, 'Parc des Sports de Belac'],
    ['Athlétic Chasur-mer', 'MAT', 'Chasur-mer', '#E30613', '#FFFFFF', 'historic', 49, 'Complexe Durlac'],
    ['SC Bourles-bains', 'OCS', 'Bourles-bains', '#003DA5', '#FFFFFF', 'fan', 48, 'Parc des Sports de Bourles-bains'],
    ['US Fonville', 'DHJ', 'Fonville', '#00843D', '#FFFFFF', 'fan', 48, 'Stade Municipal de Fonville'],
    ['AJ Lanbourg', 'RSZ', 'Lanbourg', '#00843D', '#FFFFFF', 'fan', 47, 'Stade de la Langnan'],
    ['ES Nangnan', 'UTS', 'Nangnan', '#FF7F00', '#000000', 'fan', 47, 'Stade Beaules-bains'],
    ['US Rocay', 'COD', 'Rocay', '#E30613', '#00843D', 'fan', 47, 'Parc des Sports de Rocay'],
    ['ES Dureau', 'SCC', 'Dureau', '#E30613', '#000000', 'fan', 46, 'Parc des Sports de Dureau'],
    ['US Margnan', 'JSS', 'Margnan', '#003DA5', '#FFFFFF', 'fan', 46, 'Complexe Chaville'],
  ];

  // ---------- More minimal leagues: the next European leagues by UEFA coefficient ----------
  FM.D.CLUBS_BE1 = [
    ['AFC Westbrug', 'CLB2', 'Westbrug', '#0E4DA4', '#000000', 'giant', 68, 'Zuidburg Stadion'],
    ['FC Kleinrade', 'USG', 'Kleinrade', '#FFDD00', '#0033A0', 'selling', 64, 'Wagehoven Stadion'],
    ['AFC Kleinrade', 'AND2', 'Kleinrade', '#4B2C85', '#FFFFFF', 'giant', 65, 'Oostlo Stadion'],
    ['FC Oudveen', 'GNK', 'Oudveen', '#003DA5', '#FFFFFF', 'youth', 63, 'Oudveen Arena'],
    ['Sparta Hoogburg', 'GNT', 'Hoogburg', '#003DA5', '#FFFFFF', 'historic', 61, 'Stadion Nieuwstad'],
    ['Kleinveen Boys', 'ANT', 'Kleinveen', '#E30613', '#FFFFFF', 'oil', 61, 'Kleinveen Arena'],
    ['Sparta Noordstad', 'STL2', 'Noordstad', '#E30613', '#FFFFFF', 'fallen', 59, 'Stadion Bergstad'],
    ['Westbrug Boys', 'CER2', 'Westbrug', '#00843D', '#000000', 'youth', 56, 'De Veenrade'],
    ['AFC Haardijk', 'KVM', 'Haardijk', '#FFDD00', '#E30613', 'fan', 56, 'Stadion Oostdam'],
    ['Veenveen Boys', 'WES', 'Veenveen', '#FFDD00', '#003DA5', 'oil', 55, 'De Dijkburg'],
    ['FC Hooghoven', 'CHL', 'Hooghoven', '#000000', '#FFFFFF', 'fan', 55, 'Stadion Noorddijk'],
    ['Sparta Hoograde', 'OHL', 'Hoograde', '#FFFFFF', '#00843D', 'fan', 54, 'Stadion Veenzand'],
    ['Sparta Weststad', 'STV2', 'Weststad', '#FFDD00', '#003DA5', 'selling', 53, 'Weststad Arena'],
    ['Sparta Dijkdijk', 'DEN2', 'Dijkdijk', '#E30613', '#FFFFFF', 'fan', 51, 'Haarveen Stadion'],
    ['RKC Dijkkerk', 'ZWA', 'Dijkkerk', '#E30613', '#00843D', 'fan', 51, 'Dijkkerk Arena'],
    ['ADO Dijkveen', 'RAAL', 'Dijkveen', '#00843D', '#FFFFFF', 'fan', 50, 'Dijkveen Arena'],
  ];
  FM.D.CLUBS_TR1 = [
    ['Yeni Bozköyspor', 'GAL', 'Bozköy', '#A90432', '#FDB912', 'giant', 72, 'Karadere Stadyumu'],
    ['Bozköy İdman Yurdu', 'FEN', 'Bozköy', '#FFED00', '#004A9F', 'giant', 71, 'Gültepe Arena'],
    ['Bozköy Gençlik', 'BJK', 'Bozköy', '#000000', '#FFFFFF', 'giant', 67, 'Karehir Stadyumu'],
    ['Mersaraygücü', 'TS', 'Mersaray', '#7A1E3A', '#6CABDD', 'historic', 63, 'Esksaray Stadyumu'],
    ['Bozköygücü', 'IBFK', 'Bozköy', '#F47920', '#0B1F4B', 'oil', 60, 'Bozköy Şehir Stadyumu'],
    ['Baypınar FK', 'SAM2', 'Baypınar', '#E30613', '#FFFFFF', 'fan', 57, 'Özova Arena'],
    ['Boztepe Atletik', 'GOZ', 'Boztepe', '#FFDD00', '#E30613', 'fan', 56, 'Özpınar Stadyumu'],
    ['Bozköyspor', 'EYP', 'Bozköy', '#6A1B9A', '#FFDD00', 'oil', 55, 'Mersaray Stadyumu'],
    ['Bozköy Gücü', 'KAS2', 'Bozköy', '#003DA5', '#FFFFFF', 'fan', 54, 'Bozköy Cumhuriyet Stadyumu'],
    ['Karlar Atletik', 'RIZ', 'Karlar', '#00843D', '#003DA5', 'fan', 54, 'Merova Stadyumu'],
    ['Kızkalegücü', 'KON', 'Kızkale', '#00843D', '#FFFFFF', 'fan', 54, 'Kızkale Cumhuriyet Stadyumu'],
    ['Gültepe Gençlik', 'ANT2', 'Gültepe', '#E30613', '#FFFFFF', 'fan', 53, 'Karbahçe Stadyumu'],
    ['Tekehir Belediyespor', 'ALY', 'Tekehir', '#F47920', '#00843D', 'fan', 53, 'Çamköy Stadyumu'],
    ['Özlar Gençlik', 'GAZ', 'Özlar', '#E30613', '#000000', 'fan', 53, 'Özlar Cumhuriyet Stadyumu'],
    ['Eskdere Belediyespor', 'KAY', 'Eskdere', '#FFDD00', '#E30613', 'fan', 52, 'Eskdere Şehir Stadyumu'],
    ['Tekbahçe Gücü', 'KOC', 'Tekbahçe', '#00843D', '#000000', 'fan', 52, 'Tekbahçe Şehir Stadyumu'],
    ['Bozpınar Gençlik', 'GEN2', 'Bozpınar', '#E30613', '#000000', 'youth', 51, 'Bozpınar Cumhuriyet Stadyumu'],
    ['Bozköy Belediyespor', 'FKG', 'Bozköy', '#E30613', '#000000', 'fan', 51, 'Sarova Arena'],
  ];
  FM.D.CLUBS_CZ1 = [
    ['KS Radovac', 'SLA2', 'Radovac', '#E30613', '#FFFFFF', 'giant', 64, 'Stadion Radin'],
    ['FK Radovac', 'SPA', 'Radovac', '#8A1538', '#FFFFFF', 'giant', 63, 'Stadion Plesin'],
    ['Plesava Sokol', 'PLZ', 'Plesava', '#E30613', '#003DA5', 'historic', 61, 'Stadion Velice'],
    ['Novice Sokol', 'BAN2', 'Novice', '#6CABDD', '#FFFFFF', 'fan', 56, 'Stadion Kospol'],
    ['FC Zagany', 'SIG', 'Zagany', '#003DA5', '#FFFFFF', 'youth', 53, 'Stadion Radovac'],
    ['KS Kraava', 'LIB2', 'Kraava', '#FFFFFF', '#003DA5', 'youth', 53, 'Gradski Stadion Kraava'],
    ['MFK Novin', 'HKR', 'Novin', '#000000', '#FFDD00', 'fan', 51, 'Stadion Draec'],
    ['AO Bratec', 'MBO', 'Bratec', '#003DA5', '#FFFFFF', 'selling', 51, 'Stadion Dragrad'],
    ['Radovac Sokol', 'BOH', 'Radovac', '#00843D', '#FFFFFF', 'fan', 50, 'Stadion Plesica'],
    ['SK Bogovo', 'JAB', 'Bogovo', '#00843D', '#000000', 'fan', 50, 'Bogovo Park'],
    ['Slavia Mirovac', 'TEP', 'Mirovac', '#FFDD00', '#003DA5', 'fan', 49, 'Mirovac Park'],
    ['Slavia Slapol', 'PAR2', 'Slapol', '#E30613', '#FFFFFF', 'fan', 48, 'Lubpol Arena'],
    ['AO Zagek', 'KAR', 'Zagek', '#00843D', '#FFFFFF', 'fan', 48, 'Radpol Arena'],
    ['Tarek Sokol', 'SLO2', 'Tarek', '#003DA5', '#FFFFFF', 'fan', 48, 'Gradski Stadion Tarek'],
    ['MFK Radovac', 'DUK', 'Radovac', '#FFDD00', '#8A1538', 'historic', 47, 'Radovac Park'],
    ['Slavia Zagec', 'ZLN', 'Zagec', '#FFDD00', '#000000', 'fan', 47, 'Novice Arena'],
  ];
  FM.D.CLUBS_GR1 = [
    ['AO Zagovac', 'OLY2', 'Zagovac', '#E30613', '#FFFFFF', 'giant', 68, 'Stadion Gorek'],
    ['FK Radin', 'PAO', 'Radin', '#00843D', '#FFFFFF', 'giant', 64, 'Stadion Polany'],
    ['Radin Sokol', 'AEK', 'Radin', '#FFDD00', '#000000', 'giant', 64, 'Radin Park'],
    ['AO Polava', 'PAOK', 'Polava', '#000000', '#FFFFFF', 'historic', 65, 'Polava Park'],
    ['SK Polava', 'ARI', 'Polava', '#FFDD00', '#000000', 'fan', 57, 'Stadion Drapol'],
    ['MFK Kraany', 'OFI', 'Kraany', '#000000', '#FFFFFF', 'fan', 53, 'Gradski Stadion Kraany'],
    ['FK Lubica', 'ATR', 'Lubica', '#003DA5', '#FFFFFF', 'fan', 52, 'Gradski Stadion Lubica'],
    ['Mirice Sokol', 'AST', 'Mirice', '#FFDD00', '#003DA5', 'fan', 51, 'Gradski Stadion Mirice'],
    ['KS Zagovo', 'PNT', 'Zagovo', '#FFDD00', '#003DA5', 'fan', 50, 'Zagovo Park'],
    ['Slavia Mirin', 'VOL2', 'Mirin', '#E30613', '#003DA5', 'fan', 50, 'Velek Arena'],
    ['Bogin Sokol', 'LEV2', 'Bogin', '#00843D', '#FFFFFF', 'fan', 49, 'Gradski Stadion Bogin'],
    ['Slavia Novovac', 'KIF', 'Novovac', '#003DA5', '#FFFFFF', 'fan', 49, 'Stadion Novek'],
    ['Slavia Gorice', 'AEL', 'Gorice', '#8A1538', '#FFFFFF', 'historic', 48, 'Stadion Lubava'],
    ['Union Kosovo', 'PSR', 'Kosovo', '#E30613', '#FFFFFF', 'fan', 48, 'Stadion Lubica'],
  ];
  FM.D.CLUBS_NO1 = [
    ['Fremad Nordnæs', 'BOD', 'Nordnæs', '#FFDD00', '#000000', 'youth', 63, 'Skovvik Stadion'],
    ['Storløkke FK', 'BRA2', 'Storløkke', '#E30613', '#FFFFFF', 'fan', 58, 'Storløkke Arena'],
    ['Gammelnæs IF', 'VIK', 'Gammelnæs', '#003DA5', '#FFFFFF', 'historic', 57, 'Dalsund Stadion'],
    ['Solholm BK', 'RBK', 'Solholm', '#FFFFFF', '#000000', 'giant', 58, 'Solholm Arena'],
    ['IK Vestsund', 'MOL', 'Vestsund', '#003DA5', '#FFFFFF', 'historic', 58, 'Havlund Idrætspark'],
    ['Fremad Dalby', 'S08', 'Dalby', '#003DA5', '#FFFFFF', 'fan', 51, 'Gammelnæs Park'],
    ['Vestvik IF', 'FFK', 'Vestvik', '#FFFFFF', '#E30613', 'historic', 51, 'Solsund Idrætspark'],
    ['Skovvik Boldklub', 'TIL', 'Skovvik', '#E30613', '#FFFFFF', 'fan', 51, 'Østsund Stadion'],
    ['Østby IF', 'SAF2', 'Østby', '#003DA5', '#FFFFFF', 'fan', 49, 'Sydstrup Stadion'],
    ['Fremad Østnæs', 'KFU', 'Østnæs', '#003DA5', '#FFFFFF', 'fan', 49, 'Nordfors Idrætspark'],
    ['Skovø FK', 'HAM', 'Skovø', '#00843D', '#FFFFFF', 'fan', 48, 'Bergsund Stadion'],
    ['BK Solnæs', 'KBK', 'Solnæs', '#003DA5', '#FFFFFF', 'fan', 48, 'Storø Stadion'],
    ['BK Østnæs', 'VIF', 'Østnæs', '#003DA5', '#E30613', 'historic', 52, 'Østnæs Arena'],
    ['Havø IL', 'BRY', 'Havø', '#E30613', '#FFFFFF', 'fan', 46, 'Veststrup Stadion'],
    ['Nordby IL', 'SIF', 'Nordby', '#003DA5', '#FFFFFF', 'fan', 48, 'Vestfors Stadion'],
    ['Fremad Nordløkke', 'FKH', 'Nordløkke', '#003DA5', '#FFFFFF', 'fan', 47, 'Skovnæs Park'],
  ];
  FM.D.CLUBS_PL1 = [
    ['MFK Malice', 'LPO', 'Malice', '#003DA5', '#FFFFFF', 'giant', 60, 'Gradski Stadion Malice'],
    ['FC Kosek', 'RAK', 'Kosek', '#E30613', '#003DA5', 'oil', 59, 'Stadion Zelice'],
    ['Slavia Zelpol', 'JAG', 'Zelpol', '#FFDD00', '#E30613', 'fan', 58, 'Stadion Radovo'],
    ['KS Malek', 'LEG2', 'Malek', '#FFFFFF', '#00843D', 'giant', 60, 'Malek Park'],
    ['NK Bogina', 'POG', 'Bogina', '#003DA5', '#8A1538', 'fan', 55, 'Bogina Park'],
    ['NK Velava', 'GOR', 'Velava', '#FFFFFF', '#003DA5', 'historic', 54, 'Velava Park'],
    ['Union Tarica', 'CRA2', 'Tarica', '#E30613', '#FFFFFF', 'fan', 53, 'Tarica Park'],
    ['MFK Belany', 'WID', 'Belany', '#E30613', '#FFFFFF', 'oil', 53, 'Stadion Malpol'],
    ['AO Belek', 'GKS', 'Belek', '#FFDD00', '#00843D', 'fan', 51, 'Belek Park'],
    ['SK Malec', 'ZAG', 'Malec', '#F47920', '#00843D', 'youth', 52, 'Stadion Draek'],
    ['Union Draina', 'PIA', 'Draina', '#003DA5', '#E30613', 'fan', 52, 'Belin Arena'],
    ['AO Mirovo', 'MOT', 'Mirovo', '#FFDD00', '#003DA5', 'fan', 50, 'Stadion Borovo'],
    ['FK Lubava', 'KOR', 'Lubava', '#FFDD00', '#E30613', 'fan', 50, 'Gradski Stadion Lubava'],
    ['MFK Velica', 'RAD2', 'Velica', '#00843D', '#FFFFFF', 'fan', 50, 'Velica Park'],
    ['SK Draovo', 'LGD', 'Draovo', '#00843D', '#FFFFFF', 'fallen', 50, 'Gradski Stadion Draovo'],
    ['AO Radava', 'ARK', 'Radava', '#FFDD00', '#003DA5', 'fan', 48, 'Gradski Stadion Radava'],
    ['Union Radice', 'WPL', 'Radice', '#003DA5', '#FFFFFF', 'fan', 49, 'Gradski Stadion Radice'],
    ['FK Malovo', 'TER', 'Malovo', '#F47920', '#000000', 'fan', 47, 'Stadion Bratin'],
  ];
  FM.D.CLUBS_DK1 = [
    ['Fremad Østø', 'FCK', 'Østø', '#FFFFFF', '#003DA5', 'giant', 64, 'Bergvik Park'],
    ['Dalnæs BK', 'FCM2', 'Dalnæs', '#000000', '#E30613', 'selling', 62, 'Havstrup Park'],
    ['Fremad Sydfors', 'BIF', 'Sydfors', '#FFDD00', '#003DA5', 'historic', 58, 'Sydfors Arena'],
    ['Vestgård IL', 'AGF', 'Vestgård', '#FFFFFF', '#003DA5', 'fan', 56, 'Gammelløkke Stadion'],
    ['BK Gammelholm', 'FCN', 'Gammelholm', '#E30613', '#FFFFFF', 'youth', 56, 'Gammelholm Arena'],
    ['Stranddal IL', 'RFC', 'Stranddal', '#003DA5', '#FFFFFF', 'fan', 52, 'Soldal Park'],
    ['FC Sydgård', 'SIL', 'Sydgård', '#E30613', '#FFFFFF', 'youth', 52, 'Nydal Park'],
    ['Strandvik IF', 'VFF', 'Strandvik', '#00843D', '#FFFFFF', 'fan', 51, 'Storløkke Park'],
    ['Syddal IL', 'OB', 'Syddal', '#003DA5', '#FFFFFF', 'fallen', 51, 'Berglund Idrætspark'],
    ['Dalløkke IL', 'SJF', 'Dalløkke', '#003DA5', '#FFFFFF', 'fan', 49, 'Strandsund Stadion'],
    ['Fremad Lilleby', 'VBK', 'Lilleby', '#E30613', '#FFFFFF', 'fan', 49, 'Vestby Idrætspark'],
    ['Fremad Østborg', 'FCF', 'Østborg', '#E30613', '#FFFFFF', 'fan', 48, 'Strandborg Park'],
  ];
  FM.D.CLUBS_AT1 = [
    ['FSV Hagkirchen', 'RBS', 'Hagkirchen', '#FFFFFF', '#E30613', 'oil', 64, 'Stadion am Dornstadt'],
    ['Hohenbach SC', 'STU', 'Hohenbach', '#000000', '#FFFFFF', 'historic', 61, 'Hohenbach-Arena'],
    ['SpVgg Neuingen', 'RAP2', 'Neuingen', '#00843D', '#FFFFFF', 'giant', 58, 'Stadion Lindfurt'],
    ['Eintracht Neuingen', 'FAK', 'Neuingen', '#6A1B9A', '#FFFFFF', 'historic', 56, 'Neuingen-Arena'],
    ['VfB Unterburg', 'LASK', 'Unterburg', '#000000', '#FFFFFF', 'fan', 56, 'Stadion am Grünsee'],
    ['TSV Eichhausen', 'WAC2', 'Eichhausen', '#000000', '#F47920', 'fan', 51, 'Sportpark Thalhafen'],
    ['FSV Eichfeld', 'HAR', 'Eichfeld', '#003DA5', '#FFFFFF', 'fan', 49, 'Stadion am Hoheningen'],
    ['FC Unterburg', 'BWL', 'Unterburg', '#003DA5', '#FFFFFF', 'fan', 49, 'Stadion Lindsee'],
    ['Sportfreunde Mühlhafen', 'WSG', 'Mühlhafen', '#00843D', '#FFFFFF', 'fan', 48, 'Stadion am Zellkirchen'],
    ['VfB Baddorf', 'ALT', 'Baddorf', '#000000', '#FFDD00', 'fan', 48, 'Baddorf-Arena'],
    ['Hohenbach 04', 'GAK', 'Hohenbach', '#E30613', '#FFFFFF', 'fallen', 47, 'Stadion am Westerdorf'],
    ['SV Mühlberg', 'RIE2', 'Mühlberg', '#000000', '#00843D', 'fan', 47, 'Mühlberg-Arena'],
  ];
  FM.D.CLUBS_CH1 = [
    ['SV Grünhafen', 'BAS', 'Grünhafen', '#E30613', '#003DA5', 'giant', 62, 'Bergburg-Stadion'],
    ['VfB Hagsee', 'YB', 'Hagsee', '#FFDD00', '#000000', 'giant', 62, 'Hagsee-Arena'],
    ['Unterhafen SC', 'SER', 'Unterhafen', '#8A1538', '#FFFFFF', 'historic', 56, 'Hohenbach-Stadion'],
    ['VfL Burghausen', 'LUG', 'Burghausen', '#000000', '#FFFFFF', 'oil', 56, 'Stadion am Hagheim'],
    ['FC Dorningen', 'LUZ', 'Dorningen', '#003DA5', '#FFFFFF', 'youth', 53, 'Dorningen-Arena'],
    ['Kirchstadt SC', 'STG', 'Kirchstadt', '#00843D', '#FFFFFF', 'fan', 53, 'Stadion Oberhafen'],
    ['Badhausen SC', 'FCZ', 'Badhausen', '#FFFFFF', '#003DA5', 'historic', 54, 'Unterburg-Stadion'],
    ['FSV Badhausen', 'GCZ', 'Badhausen', '#003DA5', '#FFFFFF', 'fallen', 51, 'Eichfeld-Stadion'],
    ['TSV Dornbach', 'LS', 'Dornbach', '#003DA5', '#FFFFFF', 'oil', 52, 'Zellstadt-Stadion'],
    ['SV Rheinbach', 'SIO', 'Rheinbach', '#FFFFFF', '#E30613', 'fan', 51, 'Stadion Burgtal'],
    ['Sportfreunde Thalsee', 'WIN', 'Thalsee', '#E30613', '#FFFFFF', 'fan', 49, 'Stadion Westerkirchen'],
    ['Neuheim 04', 'THU', 'Neuheim', '#E30613', '#FFFFFF', 'fan', 49, 'Stadion am Bergingen'],
  ];
  FM.D.CLUBS_SC1 = [
    ['Little Chelbury City', 'CEL2', 'Little Chelbury', '#00843D', '#FFFFFF', 'giant', 70, 'Barham Field'],
    ['Little Chelbury County', 'RAN2', 'Little Chelbury', '#1B458F', '#FFFFFF', 'giant', 68, 'Salwick Field'],
    ['Glenminster Rovers', 'HEA', 'Glenminster', '#8A1538', '#FFFFFF', 'historic', 56, 'Glenminster Ground'],
    ['Hardale Rangers', 'ABE', 'Hardale', '#E30613', '#FFFFFF', 'historic', 56, 'The Whitmere Stadium'],
    ['Glenminster United', 'HIB', 'Glenminster', '#00843D', '#FFFFFF', 'historic', 55, 'Dorborough Road'],
    ['Yarby Orient', 'MOT2', 'Yarby', '#FFB81C', '#8A1538', 'fan', 50, 'Calchester Park'],
    ['Presley Rangers', 'DUN2', 'Presley', '#F47920', '#000000', 'fan', 51, 'The Tunworth Stadium'],
    ['Dorley Athletic', 'KIL', 'Dorley', '#003DA5', '#FFFFFF', 'fan', 50, 'Bexfield Park'],
    ['Kesham Orient', 'SMI', 'Kesham', '#000000', '#FFFFFF', 'fan', 50, 'Marworth Field'],
    ['Presley Town', 'DND', 'Presley', '#0B1F4B', '#FFFFFF', 'fan', 49, 'Presley Park'],
    ['Lower Yarwood County', 'LIV2', 'Lower Yarwood', '#FFDD00', '#000000', 'fan', 47, 'Stanwood Field'],
    ['Lanworth Albion', 'FAL', 'Lanworth', '#0B1F4B', '#FFFFFF', 'fan', 47, 'Lanworth Park'],
  ];

  FM.D.CLUBS_AU1 = [
    ['Salborough Athletic', 'MCY', 'Salborough', '#6CABDD', '#FFFFFF', 'oil', 57, 'Bromminster Park'],
    ['Dormouth Wanderers', 'SYD', 'Dormouth', '#6CACE4', '#0B1F4B', 'giant', 57, 'Dormouth Park'],
    ['Salborough Wanderers', 'MVC', 'Salborough', '#0B1F4B', '#FFFFFF', 'giant', 55, 'Kelborough Lane'],
    ['Dormouth Town', 'WSW', 'Dormouth', '#E30613', '#000000', 'fan', 53, 'Dorwood Field'],
    ['Ripmere Orient', 'CCM', 'Ripmere', '#FFDD00', '#0B1F4B', 'youth', 52, 'The Yarbrook Stadium'],
    ['Oakham Athletic', 'BRQ', 'Oakham', '#F47920', '#000000', 'historic', 51, 'Oakham Ground'],
    ['Marworth County', 'AUC', 'Marworth', '#0B1F4B', '#00A3E0', 'oil', 51, 'The Marbridge Stadium'],
    ['Sedgeport United', 'ADU', 'Sedgeport', '#E30613', '#FFFFFF', 'fan', 50, 'Sedgeport Park'],
    ['Norwell Albion', 'WPX', 'Norwell', '#FFDD00', '#000000', 'fan', 49, 'The Gilport Stadium'],
    ['Elmworth Town', 'MAF', 'Elmworth', '#000000', '#FFFFFF', 'selling', 48, 'The Marcombe Stadium'],
    ['Harton Rovers', 'NJE', 'Harton', '#003DA5', '#E30613', 'fan', 48, 'Harton Park'],
    ['Elmborough Wanderers', 'PGL', 'Elmborough', '#6A1B9A', '#FFFFFF', 'fallen', 47, 'Elmborough Park'],
  ];
  FM.D.CLUBS_HU1 = [
    ['NK Bratava', 'FTC', 'Bratava', '#00843D', '#FFFFFF', 'giant', 62, 'Zelin Arena'],
    ['KS Lubice', 'PAK', 'Lubice', '#00843D', '#FFFFFF', 'selling', 53, 'Stadion Polica'],
    ['AO Bratek', 'ETO', 'Bratek', '#00843D', '#FFFFFF', 'historic', 52, 'Stadion Zelec'],
    ['FK Polin', 'DVS', 'Polin', '#E30613', '#FFFFFF', 'historic', 53, 'Novek Arena'],
    ['Kosany Sokol', 'PUS', 'Kosany', '#003DA5', '#FFFFFF', 'youth', 53, 'Gradski Stadion Kosany'],
    ['Slavia Polec', 'ZTE', 'Polec', '#003DA5', '#FFFFFF', 'fan', 51, 'Gradski Stadion Polec'],
    ['MFK Bratava', 'UJP', 'Bratava', '#6A1B9A', '#FFFFFF', 'historic', 52, 'Bratava Park'],
    ['FC Zelek', 'DIO', 'Zelek', '#E30613', '#FFFFFF', 'fan', 49, 'Zelava Arena'],
    ['KS Belin', 'KIS', 'Belin', '#E30613', '#003DA5', 'fan', 48, 'Gradski Stadion Belin'],
    ['FK Bratava', 'MTK', 'Bratava', '#003DA5', '#FFFFFF', 'historic', 49, 'Stadion Bogava'],
    ['Slavia Borica', 'NYI', 'Borica', '#E30613', '#FFFFFF', 'fan', 46, 'Borica Park'],
    ['AO Kosec', 'KTE', 'Kosec', '#E30613', '#FFFFFF', 'fan', 46, 'Stadion Slaovo'],
  ];
  FM.D.CLUBS_IE1 = [
    ['Yarbrook United', 'SHL', 'Yarbrook', '#E30613', '#FFFFFF', 'historic', 51, 'The Penton Stadium'],
    ['Yarbrook Wanderers', 'SRO', 'Yarbrook', '#00843D', '#FFFFFF', 'giant', 51, 'Malwood Field'],
    ['North Bexwold County', 'DRY', 'North Bexwold', '#E30613', '#FFFFFF', 'fan', 48, 'North Bexwold Ground'],
    ['Yarbrook City', 'BHI', 'Yarbrook', '#E30613', '#000000', 'fan', 47, 'Whitton Lane'],
    ['Yarbrook Victoria', 'SPAT', 'Yarbrook', '#E30613', '#FFFFFF', 'fan', 47, 'The Aldstead Stadium'],
    ['Upper Malthorpe City', 'DRO', 'Upper Malthorpe', '#003DA5', '#FFFFFF', 'fan', 44, 'The Maring Stadium'],
    ['Barcliff Rovers', 'GAU', 'Barcliff', '#8A1538', '#FFFFFF', 'fan', 43, 'Bromchester Field'],
    ['Glenwick Albion', 'SLR', 'Glenwick', '#E30613', '#FFFFFF', 'fan', 43, 'The Gilcombe Stadium'],
    ['Glengate City', 'WFI', 'Glengate', '#003DA5', '#FFFFFF', 'fan', 42, 'The Lanmere Stadium'],
    ['Upper Salwood Town', 'DDK', 'Upper Salwood', '#FFFFFF', '#000000', 'fallen', 44, 'Stanmere Field'],
  ];
  FM.D.CLUBS_WA1 = [
    ['Wexthorpe Town', 'TNS', 'Wexthorpe', '#00843D', '#FFFFFF', 'oil', 49, 'Bexham Lane'],
    ['Whitley Athletic', 'BAL', 'Whitley', '#FFFFFF', '#000000', 'fan', 42, 'Dorwood Road'],
    ['Aldwold Athletic', 'CQN', 'Aldwold', '#FFFFFF', '#003DA5', 'fan', 41, 'Shafwold Park'],
    ['Shafley Victoria', 'PEN', 'Shafley', '#E30613', '#FFFFFF', 'fan', 41, 'Wynley Field'],
    ['Aldton Victoria', 'HAV', 'Aldton', '#003DA5', '#FFFFFF', 'fan', 40, 'The Calchester Stadium'],
    ['Lower Shafwold Athletic', 'BTU', 'Lower Shafwold', '#FFDD00', '#000000', 'fan', 40, 'Barley Lane'],
    ['Broming Rovers', 'CMU', 'Broming', '#FFDD00', '#000000', 'youth', 40, 'Dorley Park'],
    ['Gilwell City', 'LLA', 'Gilwell', '#E30613', '#FFFFFF', 'fan', 38, 'The Ashwood Stadium'],
    ['Great Bradton Victoria', 'CAE', 'Great Bradton', '#E30613', '#FFFFFF', 'fan', 38, 'Barbrook Lane'],
    ['Oaking Rovers', 'NEW2', 'Oaking', '#E30613', '#FFFFFF', 'fan', 38, 'Oaking Park'],
    ['Darworth Victoria', 'COL2', 'Darworth', '#FFDD00', '#003DA5', 'fan', 38, 'Presdale Field'],
    ['Ripham Athletic', 'FLI', 'Ripham', '#FFFFFF', '#E30613', 'fan', 37, 'Darminster Park'],
  ];

  // Real-life abbreviations (as on the league's broadcasts) and nicknames, by the club's code (the part of its id
  // after c_). An empty abbreviation keeps the code; no nickname means there is no widely used one.
  FM.D.CLUB_INFO = Object.fromEntries(
    `MCI|MAR|Eagles
LIV|HAR|Badgers
ARS|RIP|Reds
CHE|RIH|Eagles
MUN|MAD|Reds
NEW|SED|Lions
TOT|RTH|Lions
AVL|WEX|Wolves
BHA|ASH|Blues
NFO|YAR|Reds
WHU|RIPM|Maroons
CRY|RIP2|Blues
BOU|DAR|Herons
FUL|RIP3|Rams
BRE|RIP4|Chargers
EVE|HAH|Blues
WOL|WER|Yellows
LEE|CAL|Ironmen
SUN|GIL|Reds
BUR|BRA|Otters
LEI|BRD|Badgers
SOU|SHA|Reds
IPS|SEE|Blues
SHU|BAR|Lions
MID|YAN|Reds
BIR|WEE|Eagles
WBA|KES|Navy
NCI|BAD|Yellows
COV|DOR|Sky Blues
WAT|WES|Mariners
WRX|BRN|Reds
STK|OAK|Reds
HUL|THO|Spartans
SWA|DOT|Falcons
DER|LIN|Whites
SHW|BARS|Otters
BLB|DOE|Mariners
BRC|GLE|Reds
QPR|RIP5|Stags
PNE|WLE|Whites
MIL|RIP6|Falcons
POM|DAE|Mariners
CHA|RIP7|Herons
OXF|SEH|Wolves
CAR|TUN|Badgers
LUT|LIH|Chargers
HUD|FEN|Lions
BWA|HAM|Whites
PLY|HEX|Greens
REA|WEN|Blues
BNS|BAN|Reds
WIG|MAL|Blues
STO|WHI|Blues
BFD|DAM|Maroons
BLP|GRE|Spartans
PBO|CHE|Blues
ROT|GID|Ironmen
LIN|KEL|Foresters
DON|GRD|Spartans
LEY|RIP8|Miners
WYC|ASY|Sky Blues
MNS|WED|Yellows
EXE|NOR|Wolves
PVA|OAD|Whites
WIM|RIP9|Badgers
STV|ALD|Badgers
NTN|WYN|Maroons
BRT|MAF|Yellows
ACS|BEX|Falcons
BNT|RIP10|Mariners
BRW|BEY|Ironmen
BRR|GLD|Herons
BRO|RIP11|Whites
CAMU|BRO|Oranges
CHT|WEM|Reds
CHF|WYK|Ironmen
COL|WYE|Drovers
CRAW|HET|Reds
CREW|KED|Reds
FLE|WYNH|Drovers
GILL|WYD|Blues
GRI|GRN|Drovers
HARR|PRE|Yellows
MKD|FED|Whites
NWP|THF|Oranges
NCO|YAD|Blacks
OLD|BEM|Blues
SAL|BLD|Spartans
SHR|CAG|Miners
SWI|ELM|Rams
TRA|BRG|Whites
WAL|SOU|Reds
RMA|PUE|Blancos
FCB|VAL|Leones
ATM|PUA|Venados
ATH|ARR|Rojos
VIL|CAÑ|Amarillos
RSO|PLA|Azules
BET|NUE|Verdes
SEV|NDE|Blancos
GIR|SAN|Rojos
VAL|LOM|Gladiadores
CEL|MES|Celestes
OSA|TOR|Jaguares
MLL|PSA|Gladiadores
RCD|VAE|Azules
RAY|PCA|Cóndores
GET|MEA|Azules
ALA|MTA|Azules
OVI|SAA|Azules
LEV|LOL|Jaguares
ELC|POZ|Marineros
DEP|POA|Azules
LPA|PEÑ|Alacranes
VLD|MON|Granates
MAL|LOA|Azules
ALM|VEG|Halcones
ZAR|RIO|Blancos
LEG|ALT|Halcones
GRA|LLA|Rojos
SPG|ALE|Rojos
RSA|RIE|Blancos
CAD|PEL|Amarillos
EIB|SAE|Cóndores
CAS|VIL|Marineros
AND|PNA|Azules
HUE|MEE|Azules
ALB|FUE|Águilas
BGS|FOR|Blancos
CCF|PRA|Blancos
MIR|VAA|Rojos
RSS|PLAB|
CYD|CAM|Blancos
CEU|RÍO|Blancos
RMC|PUEB|
BAT|VALB|
BIA|ARRB|
ZAM|PVA|Blancos
ATB|PUAB|
VIB|CAÑB|
SEB|NDEB|
CEB|MESB|
BEB|NUEB|
TEN|VEA|Blancos
CTG|MNA|Tiburones
PON|MTE|Azules
NAS|PUER|Rojos
ALC|PUR|Jaguares
MUR|POZO|Toros
HERC|VIA|Azules
IBI|PEE|Azules
CDLU|BAJ|Águilas
UNS|COS|Negros
ALG|BAH|Rojos
BAY|KIR|Roten
BVB|RHE|Pioniere
B04|UNT|Löwen
RBL|ZEL|Falken
SGE|EIC|Bären
VFB|LIF|Löwen
SCF|LIG|Roten
WOB|STE|Grünen
BMG|RHL|Bären
HSV|OBE|Löwen
KOE|DEE|Weißen
SVW|LEN|Grünen
M05|BAG|Falken
FCU|THA|Roten
TSG|NEU|Blauen
AUG|WEST|Adler
STP|OBL|Weinroten
HDH|ZEF|Roten
BSC|THN|Ritter
S04|WAL|Blauen
KSV|ZEN|Blauen
VFLB|OBN|Blauen
F95|STG|Löwen
H96|WIM|Grünen
FCKL|NEG|Schmiede
SCPA|LIT|Schmiede
FCNB|BER|Roten
KSC|UNF|Blauen
D98|WES2|Füchse
SGF|ADT|Adler
FCMA|RHD|Blauen
EBS|ALH|Gelben
PRM|EIM|Wölfe
SVE|EIH|Schwarzen
DSC|HOH|Wölfe
SGD|BEG|Gelben
VFS|LIFB|
BVZ|RHEB|
TSZ|NEUB|
M60|KIN|Fischer
FCE|GRÜ|Schmiede
FCH|MÜH|Fischer
SVWW|NEN|Bergleute
VKO|DORN|Roten
SVM|BED|Blauen
AUE|THG|Adler
AAC|STF|Gelben
SCV|ZELL|Wölfe
OSN|HOG|Wölfe
RWE|HAG|Bären
JAH|STEI|Bergleute
ULM|FRE|Schwarzen
MSV|RHG|Blauen
FCS|HOM|Blauen
FCI|WAT|Roten
S05|ALN|Grünen
PSG|BOU|Faucons
OMA|VIS|Blancs
ASM|LAV|Rouges
OLY|CHA|Blancs
LIL|CHN|Rouges
NIC|LAN|Lions
REN|FON|Rouges
RCL|PON|Jaunes
RCS|VLE|Mineurs
SBR|AUB|Rouges
TFC|BEL|Grenats
NAN|CHC|Jaunes
PFC|BOC|Cerfs
LOR|ROC|Cerfs
AUX|LAT|Mineurs
HAC|VAY|Bleus
ANG|NAN|Forgerons
FCM|CLE|Grenats
MHS|CHAV|Cigognes
STE|COU|Lynx
SDR|DUR|Rouges
EAG|CNS|Lynx
PAU|NAU|Mineurs
ANN|CAN|Rouges
LAV|VAC|Cerfs
GRE2|POE|Bleus
AMI|BET|Blancs
RSF|LAS|Cigognes
ROD|LRT|Rouges
CF63|TOU|Rouges
USL|CAU|Lions
SCBA|BAC|Bleus
LMF|BEC|Lynx
ASN|BEA|Blancs
USB|BES|Lynx
ETA|LAY|Bleus
FLA|MOA|Rubro-Negros
PAL|SÃO|Verdes
COR|SIO|Mineiros
SAO|SÃOR|Brancos
BOT|MCA|Leões
CAM|CAR|Pretos
GRE|TOL|Azuis
SCI|TORR|Rubro-Negros
FLU|MONT|Grenás
CRU|CAMP|Tigres
VAS|MON2|Gaviões
SAN|POR|Mineiros
BAH|RIB|Azuis
FTZ|BOA|Azuis
RBB|TAL|Mineiros
CEA|BVA|Pretos
SPT|CAA|Rubro-Negros
VIT|RIR|Rubro-Negros
JVD|VRE|Lobos
MSL|ALL|Lobos
INT|BOR|Azzurri
JUV|BIA|Minatori
NAP|ALB|Celesti
ACM|BORA|Rossi
ATA|LAA|Azzurri
ROM|LRA|Granata
LAZ|LANA|Cervi
BOL|SAO|Lupi
FIO|TOO|Grifoni
COM|ALO|Azzurri
TOR|BELE|Granata
UDI|TOE|Bianchi
GEN|VIO|Rossi
PAR|SNA|Bianchi
CAG|FER|Tori
SAS|BNA|Verdi
VER|SIA|Gialli
LEC|PONO|Gialli
CRE|RAV|Rossi
PIS|PONA|Neri
MNZ|FEA|Rossi
VEN|MRA|Neri
EMP|VEN|Azzurri
PAL2|VEO|Bianchi
SAM|VGO|Cervi
BARI|BOE|Bianchi
SPE|MAO|Cavalieri
MOD|ROE|Grifoni
CTZ|ALBA|Gialli
CES|SER|Bianchi
JST|VLA|Gialli
SUD2|VNA|Bianchi
REG|VRA|Marinai
CAR2|GAL|Gialli
PAD|ALA|Lupi
MAN|PIE|Bianchi
ENT|RAO|Azzurri
AVE|PON2|Fabbri
PES|LIA|Leoni
FRO|SEO|Marinai
BEN|NOV|Rubro-Negros
FCP|NOE|Veados
SCP|NAR|Verdes
SCB|SDE|Rubro-Negros
VSC|CAE|Marinheiros
SCL|RIL|Rubro-Negros
FAM|TDE|Brancos
EST|BLA|Corvos
GIL|VOL|Lobos
ARO|MVA|Leões
RAV|BOL|Verdes
MOR|PRAI|Verdes
CPI|NOVA|Gaviões
CDN|VUL|Corvos
AVS|MOR|Rubro-Negros
EAM|RIBE|Rubro-Negros
ALV|VDE|Rubro-Negros
TON|NOL|Amarelos
AJA|OUD|Witten
PSV|DIJ|Rooien
FEY|ZUI|Bijen
AZA|LAK|Rooien
TWE|NOO|Rooien
UTR|VEE|Zwanen
GAE|OOS|Stieren
NEC|WEG|Stieren
HEE|NON|Leeuwen
GRO|ZUG|Groenen
SPR|ZUT|Rooien
PEC|OOM|Blauwen
FSI|KLE|Geelen
NAC|KLK|Geelen
HER|WES3|Zwarten
VOL|WEO|Oranjes
EXC|ZST|Kikkers
TEL|BERG|Witten
RIV|RÍA|Alacranes
BOC|RVA|Águilas
RAC|BAL|Celestes
IND|BAJO|Rojos
ELP|ROA|Rojos
SLO|RÍON|Gladiadores
VEL|RÍO2|Toros
TAL|ADE|Azules
ROS|FUR|Azules
LAN|CDE|Granates
ARJ|RÍO3|Rojos
NOB|FUEN|Rojos
HUR|RÍO4|Blancos
DYJ|RCA|Amarillos
BEL|ALTO|Celestes
GLP|RSA|Lobos
GOD|COL|Azules
TIG|CAM2|Marineros
UNI|MSA|Rojos
INS|ALT2|Rojos
BAN|VTA|Verdes
IRI|COST|Cóndores
ATU|ARE|Celestes
PLA|CAB|Águilas
BAR|RÍO5|Venados
CCD|POZ2|Negros
SAR|ATA|Gladiadores
RIE|RÍO6|Cóndores
MIA|RED|Foresters
LAF|STA|Blacks
LAG|STN|Whites
SEA|ALY|Stags
CIN|RLL|Blues
CLB|GIE|Yellows
PHI|KEE|Blacks
NYC|CHR|Sky Blues
ATL|AOD|Herons
NYR|CER|Badgers
NSH|MLL|Yellows
ORL|HAY|Maroons
VAN|BRH|Whites
PTI|HED|Blacks
MIN|LID|Badgers
SDG|ELK|Blacks
RSL|LIE|Reds
DAL|LIL|Reds
CLT|ASL|Blues
HOU|STH|Oranges
SKC|BAE|Kestrels
STL|THY|Reds
RAP|HEL|Maroons
AUS|HEY|Herons
CHI|LAR|Sky Blues
DCU|LAH|Eagles
NER|BEN|Herons
TRT|BAY|Foresters
MTL|PRH|Blacks
SJE|LBE|Blues
VIS|KAW|Hawks
KAS|NAA|Reds
URA|KIT|Hawks
SFH|TAK|Tigers
KAW|AKA|Sky Blues
YFM|HOK|Blues
GAM|HAA|Bears
MAC|TAA|Phoenixes
FCT|AKI|Blues
KSW|MIY|Yellows
NAG|KAI|Warriors
CER|HMA|Phoenixes
AVI|HAI|Tigers
KYO|TMA|Crimsons
NII|SHI|Phoenixes
SBM|SAI|Yellows
TVE|ARA|Dragons
SHI|SMA|Oranges
OKA|SHIN|Reds
YFC|HOA|Tigers
AME|COE|Amarillos
MTY|SAL|Azulones
TGR|VILL|Amarillos
CHV|FOL|Rojos
CAZ|COS2|Azules
TOL|PIC|Leones
PUM|COS3|Azulones
PAC|NUL|Blancos
LEO|MON3|Verdes
SLA|MESA|Leones
ATS|FAL|Venados
TIJ|BAA|Rojos
NCX|PLAY|Rojos
QRO|RÍL|Azules
PUE|ASA|Blancos
JUA|VAR|Leones
ASL|RDA|Rojos
MAZ|ARRO|Toros
ULS|GAN|Bears
JBH|HAE|Greens
POH|NAM|Bears
SEO|JEO|Reds
DJN|HAN|Hawks
GWA|GYE|Yellows
GAN|JEN|Oranges
GIM|DAN|Bears
JEJ|SEA|Eagles
DGU|MUN|Bears
SUW|WOL|Reds
ANY|SIN|Phoenixes
BRU|NOA|Blues
BGP|SRI|Navy
BKU|NAK|Hornbills
PRT|NUR|Lions
MTU|KAO|Reds
CRA|PAK|Blues
CHB|PAN|Eagles
RAT|MAE|Reds
UTH|UBO|Oranges
PRA|TAN|Reds
SKT|CHI|Elephants
KBP|PHU|Blues
LPW|SRN|Crimsons
AYU|MAM|Lions
RYG|KHA|Elephants
NRS|LAM|Oranges
ENY|STAN|Blues
RAN|NEW|Reds
RVU|LPE|Blues
REM|YAT|Lions
KPI|AGH|Yellows
SSC|CAK|Blues
LOB|REK|Lions
PLU|CHY|Reds
BDI|BGE|Miners
HRT|SHD|Reds
IKC|UPP|Mariners
ABW|YAE|Mariners
AKW|ALDF|Drovers
KWU|MAK|Lions
NSU|SHH|Spartans
NIT|ALF|Eagles
BYU|NEL|Blues
EKW|FEL|Greens
KTU|LAE|Herons
SUS|WCK|Yellows
WAC|BELA|Rouges
RCA|BEL2|Verts
FAR|NANG|Rouges
RSB|POC|Oranges
FUS|NAN2|Bleus
MAS|BEU|Jaunes
HAG|LLE|Aigles
IRT|BEL3|Bleus
MAT|CHAS|Loups
OCS|BOS|Lynx
DHJ|FOE|Verts
RSZ|LAG|Verts
UTS|NAN3|Oranges
COD|ROY|Forgerons
SCC|DUU|Rouges
JSS|MAN|Bleus
CZV|DRA|Lavovi
FKP|DRC|Rakete
VOJ|SLA|Crveni
TSC|MIR|Plavi
CUK|DAC|Vukovi
RAD|NOK|Crveni
NPZ|KRA|Crveni
OFK|DRAO|Plavi
IMT|DRA2|Gavranovi
SPS|MIN|Plavi
RNI|VEL|Baroni
ZEL|PLE|Plavi
NKR|GOR|Crveni
MLU|RAD|Crveni
JUB|BRAT|Plavi
TEK|ZAG|Zeleni
CLB2|WUG|Blauwen
USG|KDE|Geelen
AND2|KLEI|Donkerblauwen
GNK|OUN|Blauwen
GNT|HOO|Wolven
ANT|KLN|Ruiters
STL2|NOD|Rooien
CER2|WES4|Ruiters
KVM|HAK|Geelen
WES|VEEN|Valken
CHL|HON|Wolven
OHL|HOE|Witten
STV2|WAD|Ruiters
DEN2|DIK|Stieren
ZWA|DRK|Rooien
RAAL|DIN|Wolven
GAL|BOZ|Kırmızılar
FEN|BOY|Aslanlar
BJK|BÖY|Siyahlar
TS|MER|Bordolar
IBFK|BOZK|Boğalar
SAM2|BAYP|Şahinler
GOZ|BPE|Sarılar
EYP|BOZ2|Bordolar
KAS2|BOZ3|Mavililer
RIZ|KAR|Kaplanlar
KON|KZK|Yeşiller
ANT2|GÜL|Aslanlar
ALY|TEK|Yıldızlar
GAZ|ÖZL|Kırmızılar
KAY|ESK|Atmacalar
KOC|TEE|Şahinler
GEN2|BOZP|Kırmızılar
FKG|BOZ4|Aslanlar
SLA2|RAC|Zmajevi
SPA|RADO|Bordo
PLZ|PLES|Crveni
BAN2|NCE|Svetloplavi
SIG|ZAY|Plavi
LIB2|KVA|Beli
HKR|NIN|Crni
MBO|BRC|Sokolovi
BOH|RAD2|Zeleni
JAB|BOG|Zeleni
TEP|MIC|Žuti
PAR2|SLL|Orlovi
KAR|ZAK|Bikovi
SLO2|TAR|Plavi
DUK|RAD3|Žuti
ZLN|ZAC|Žuti
OLY2|ZAGO|Rakete
PAO|RAN|Vukovi
AEK|RIN|Žuti
PAOK|POL|Crni
ARI|POLA|Baroni
OFI|KRY|Sokolovi
ATR|LUB|Plavi
AST|MIE|Žuti
PNT|ZAO|Žuti
VOL2|MIRI|Crveni
LEV2|BON|Baroni
KIF|NOC|Zmajevi
AEL|GOE|Bordo
PSR|KOS|Rakete
BOD|NOS|De Gule
BRA2|STO|De Røde
VIK|GAM|De Blå
RBK|SOL|Falke
MOL|VES|Rever
S08|DAL|De Blå
FFK|VEK|De Hvide
TIL|SKO|Elge
SAF2|ØST|Løver
KFU|ØSS|De Blå
HAM|SKØ|De Grønne
KBK|SOS|De Blå
VIF|ØÆS|Bæverne
BRY|HAV|Elge
SIF|NOY|De Blå
FKH|NKE|Bæverne
LPO|MCE|Plavi
RAK|KOK|Crveni
JAG|ZOL|Rakete
LEG2|MEK|Gavranovi
POG|BOGI|Plavi
GOR|VVA|Beli
CRA2|TCA|Crveni
WID|BNY|Crveni
GKS|BEK|Žuti
ZAG|MAC|Narandžasti
PIA|DNA|Plavi
MOT|MIO|Vukovi
KOR|LUA|Sokolovi
RAD2|VCA|Rakete
LGD|DRO|Zeleni
ARK|RAA|Žuti
WPL|RAE|Gavranovi
TER|MVO|Narandžasti
FCK|ØSØ|De Hvide
FCM2|DAS|De Sorte
BIF|SYD|De Gule
AGF|VED|De Hvide
FCN|GLM|De Røde
RFC|STR|Bjørne
SIL|SRD|Svaner
VFF|STK|De Grønne
OB|SYL|Ørne
SJF|DKE|De Blå
VBK|LIY|De Røde
FCF|ØSG|De Røde
RBS|HEN|Weißen
STU|HCH|Schmiede
RAP2|NEUI|Hirsche
FAK|NEU2|Schmiede
LASK|UNG|Schwarzen
WAC2|EIN|Pioniere
HAR|EID|Pioniere
BWL|URG|Blauen
WSG|MÜN|Grünen
ALT|BAF|Schmiede
GAK|HOHE|Falken
RIE2|MÜG|Schwarzen
BAS|GEN|Roten
YB|HEE|Gelben
SER|UNN|Weinroten
LUG|BUR|Füchse
LUZ|DON|Löwen
STG|KDT|Grünen
FCZ|BADH|Weißen
GCZ|BAD2|Falken
LS|DOH|Bergleute
SIO|RHH|Weißen
WIN|THE|Roten
THU|NEM|Wölfe
CEL2|LRY|Greens
RAN2|LITT|Blues
HEA|GLR|Maroons
ABE|HLE|Reds
HIB|GER|Greens
MOT2|YAY|Yellows
DUN2|PRY|Oranges
KIL|DOY|Spartans
SMI|KEM|Lions
DND|PEY|Navy
LIV2|LOW|Yellows
FAL|LTH|Navy
MCY|SAH|Sky Blues
SYD|DTH|Sky Blues
MVC|SGH|Navy
WSW|DORM|Reds
CCM|RRE|Eagles
BRQ|OAM|Oranges
AUC|MAH|Navy
ADU|SET|Reds
WPX|NLL|Ironmen
MAF|ELH|Blacks
NJE|HART|Blues
PGL|EGH|Maroons
FTC|BRA2|Gavranovi
PAK|LUE|Gavranovi
ETO|BRK|Zeleni
DVS|PIN|Crveni
PUS|KOY|Plavi
ZTE|PEC|Baroni
UJP|BRA3|Bordo
DIO|ZEK|Vukovi
KIS|BIN|Rakete
MTK|BRA4|Plavi
NYI|BCA|Baroni
KTE|KOC|Zmajevi
SHL|YAK|Foresters
SRO|YOK|Greens
DRY|NLD|Herons
BHI|YARB|Reds
SPAT|YAR2|Rams
DRO|UPE|Kestrels
GAU|BFF|Chargers
SLR|GLK|Reds
WFI|GTE|Blues
DDK|UPD|Drovers
TNS|WPE|Greens
BAL|WHY|Whites
CQN|ALDW|Wolves
PEN|SHY|Kestrels
HAV|AON|Blues
BTU|LOD|Falcons
CMU|BNG|Spartans
LLA|GLL|Reds
CAE|GON|Reds
NEW2|OAG|Reds
COL2|DAH|Yellows
FLI|RIM|Whites`
      .split('\n')
      .map((l) => l.split('|'))
      .map(([code, abbr, nick]) => [code, [abbr, nick]]),
  );

  FM.D.RIVALS.push(
    ['CLB2', 'CER2', 'Westbrug Derby'],
    ['AND2', 'STL2', 'Kleinrade–Noordstad Derby'],
    ['GAL', 'FEN', 'Bozköy Derby'],
    ['BJK', 'TS', 'Bozköy–Mersaray Derby'],
    ['SLA2', 'SPA', 'Radovac Derby'],
    ['OLY2', 'PAO', 'Zagovac–Radin Derby'],
    ['PAOK', 'ARI', 'Polava Derby'],
    ['RBK', 'MOL', 'Solholm–Vestsund Derby'],
    ['VIF', 'KFU', 'Østnæs Derby'],
    ['LEG2', 'LPO', 'Malek–Malice Derby'],
    ['CRA2', 'WID', 'Tarica–Belany Derby'],
    ['FCK', 'BIF', 'Østø–Sydfors Derby'],
    ['RAP2', 'FAK', 'Neuingen Derby'],
    ['STU', 'GAK', 'Hohenbach Derby'],
    ['BAS', 'FCZ', 'Grünhafen–Badhausen Derby'],
    ['GCZ', 'YB', 'Badhausen–Hagsee Derby'],
    ['CEL2', 'RAN2', 'Little Chelbury Derby'],
    ['HEA', 'HIB', 'Glenminster Derby'],
    ['DUN2', 'DND', 'Presley Derby'],
    ['MCY', 'MVC', 'Salborough Derby'],
    ['SYD', 'WSW', 'Dormouth Derby'],
    ['SYD', 'MVC', 'Dormouth–Salborough Derby'],
    ['FTC', 'UJP', 'Bratava Derby'],
    ['FTC', 'MTK', 'Bratava Derby'],
    ['SHL', 'BHI', 'Yarbrook Derby'],
    ['SRO', 'SPAT', 'Yarbrook Derby'],
    ['DRY', 'SRO', 'North Bexwold–Yarbrook Derby'],
    ['TNS', 'BAL', 'Wexthorpe–Whitley Derby'],
    ['CQN', 'FLI', 'Aldwold–Ripham Derby'],
  );
})();
