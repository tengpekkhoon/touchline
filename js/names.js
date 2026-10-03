// Names and heritage. Every nation's own pool of first names and surnames is widened from culture pools (a few hundred
// names a culture, so thousands of players do not run out of combinations), and a player can have a family heritage that
// differs from the country he plays for: a Frenchman of Algerian descent has a first name from the Maghrebi pool and a
// surname from it or from France; a Dutchman of Surinamese descent from the Caribbean pool. The mix per nation is rough
// real-world demographics of its professional players, not a quota. p.heritage is set only when it differs from the
// nation's own culture; names are for variety, they say nothing about a player's ability.
(function () {
  const FM = window.FM,
    D = FM.D;
  // "de_Jong" is one surname with a space in it
  const P = (fn, ln) => ({
    fn: fn
      .trim()
      .split(/\s+/)
      .map((s) => s.replace(/_/g, ' ')),
    ln: ln
      .trim()
      .split(/\s+/)
      .map((s) => s.replace(/_/g, ' ')),
  });

  D.NAME_POOLS = {
    english: P(
      `James Oliver Harry Jack George Charlie Thomas William Henry Joshua Daniel Samuel Joseph Benjamin Edward Lewis Alfie Archie Jacob Callum Connor Jordan Luke Ryan Adam Nathan Liam Declan Mason Reece Kieran Tyler Dominic Gareth Craig Lee Stuart Darren Wayne Ashley Jamie Scott Mark Paul Andrew Matthew Michael Robert David Richard Simon Peter Ian Steven Carl Aaron Brandon Kyle Ben Sam Max Finley Oscar Logan Theo Freddie Albie Rhys Jude Elliot Harvey Louis Toby Jake Joel Josh Alex Nick Ollie Danny Jonny Billy Charlie Reuben Bradley Dean Ricky Gary Neil Kevin Terry Graham Stephen Phil Rob Tom Will Ed Lloyd Marcus Perry Brett Calum Cameron Dylan Evan Gabriel Hugo Isaac Jasper Kai Leon Miles Noah Rory Seth Tobias Zachary Anthony Barry Colin Derek Eric Frank Geoff Glenn Howard Keith Kenneth Leighton Malcolm Norman Roy Trevor Vincent`,
      `Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Turner Hughes Edwards Hill Moore Clark Harrison Scott Young Morgan Baker Lee Patel King Phillips Parker Cooper Bailey Bell Cook Murray Fox Ward Watson Carter Mitchell Collins Richardson Cox Shaw Marshall Palmer Harvey Mills Bennett Fisher Hunt Dixon Holmes Gibson Webb Barker Gordon Hudson Armstrong Foster Knight Lawrence Hayes Perry Reynolds Spencer Stone Barnes Fletcher Newton Burton Gardner Lloyd Pearce Rogers Simpson Sutton Tucker Wells Austin Banks Booth Bradley Carr Chapman Dawson Ellis Fuller Grant Hart Hawkins Hopkins Howard Jenkins Kelly Lambert Lewis Little Lowe Matthews May Nash Owen Page Pearson Porter Price Ross Russell Saunders Sharp Spooner Stevens Stewart Walsh Warren Weaver West Whitehead Wilkinson Willis Winter Woods Abbott Ainsworth Alderton Ashworth Atkinson Bamford Beckett Bentley Birch Blackburn Bolton Bowen Bradshaw Brennan Briggs Brooks Buckley Burgess Butler Calvert Chambers Charlton Cole Compton Cross Crowther Dalton Daly Dennis Doyle Draper Duffy Dunn Eastwood Eaton Elliott Farrell Fenton Finch Flynn Ford Forrest Garner Gill Goodwin Graham Gregory Griffin Hamilton Hammond Hancock Hardy Harper Haynes Henderson Hewitt Hobbs Hodgson Holt Hope Horton Hutchinson Ingram Jarvis Keane Kemp Lacey Lancaster Larkin Lees Lister Lomas Lord Lynch Mace Mann Marsden Maxwell McCarthy Miller Moss Naylor Nicholls Norris Oakley Osborne Parsons Peacock Pickering Poole Potter Powell Pratt Preston Quinn Rainford Ramsey Rawlings Reeves Rhodes Rice Riley Rowe Rudd Sanderson Seymour Sheridan Slater Snow Stanton Stott Sweeney Tate Tomlinson Townsend Tyler Vaughan Wade Wallace Walters Watts Whittle Wilde Winters Wyatt Yates`,
    ),
    scottish: P(
      `Callum Fraser Ross Angus Euan Hamish Lachlan Craig Kenny Gordon Alasdair Duncan Iain Stuart Murray Scott Graeme Kyle Cameron Ewan Rory Struan Calum Dougie Fergus Jock Archie Blair Brodie Dylan Findlay Innes Kieran Lewis Magnus Niall Ruaridh Torquil Alistair Colin Donald Gregor Neil Malcolm Greig Darren Gavin Barry Ally Aidan Jamie`,
      `McGregor MacLeod Campbell Stewart Robertson Anderson Murray Ross McDonald Fraser Cameron Henderson MacKenzie Buchanan Sinclair Gordon Grant Hamilton Wallace Kerr Duncan Munro Gibson Boyd Reid Muir Dunlop Lennox McLean MacIntyre Rennie Crawford Baird Lindsay Napier Hay Carmichael Drummond Kennedy Maxwell Menzies Ogilvie Rutherford Shearer Hunter Johnstone Cunningham Gillespie McAllister McCall McBride McNeill McKay McLaren McPherson McKinnon Nicol Rankin Ritchie Thomson Wishart Gray Auld Brodie Cochrane Dickson Forsyth Galbraith Imrie Jardine Lawson Logan Mathieson Paton Sim Tait Weir Yule`,
    ),
    welsh: P(
      `Rhys Gareth Owain Dafydd Iwan Llewelyn Gethin Huw Emyr Aled Bryn Cai Dylan Elis Evan Gwilym Idris Ioan Ifor Kieran Lloyd Mathew Morgan Osian Rhodri Tomos Trystan Wyn Cian Dewi Geraint Glyn Gruffydd Hywel Ianto Jac Meirion Meredith Nye Rhydian Steffan Taliesin Tudor Berwyn Cadfan Dilwyn`,
      `Williams Jones Davies Evans Thomas Roberts Hughes Lewis Morgan Griffiths Edwards Owen Price Phillips Rees Powell Jenkins James Bevan Pugh Llewellyn Howells Richards Bowen Probert Parry Pritchard Vaughan Gwynne Humphreys Prosser Meredith Rhys Lloyd Watkins Bellis Gethin Brychan Cadwallader Ellis Gittins Harries Isaac Maddocks Mathias Nicholas Protheroe Rowlands Samuel Tudor Wyn`,
    ),
    irish: P(
      `Seán Patrick Liam Conor Cian Darragh Eoin Fionn Oisín Ronan Cillian Donnacha Kieran Declan Niall Brendan Colm Dara Diarmuid Eamon Fergal Finbarr Padraig Rory Shane Tadhg Aidan Cathal Colin Dermot Gearóid Ruairí Séamus Ciarán Daithí Emmet Kevin Lorcan Mícheál Nialler Oran Peadar Robbie Ruadhan Sean Tiernan Turlough Barry Dónal Enda`,
      `Murphy Kelly O'Sullivan Walsh Smith O'Brien Byrne Ryan O'Connor O'Neill O'Reilly Doyle McCarthy Gallagher Doherty Kennedy Lynch Murray Quinn Moore McLoughlin O'Carroll Connolly Daly Connell Wilson Dunne Brennan Burke Collins Campbell Clarke Johnston Hughes O'Farrell Fitzgerald Brown Martin Maguire Nolan Flynn Thompson O'Donnell Duffy Mahony Boyle Healy O'Shea White Sweeney Hayes Kavanagh Power Mc_Grath Moran Brady Stewart Casey Foley Fitzpatrick O'Leary McDonnell MacMahon Donnelly Regan Donovan Burns Flanagan Mullan Barry Kane Robinson McCabe Hickey O'Callaghan Whelan Egan Cullen Lyons Keane Coughlan Devlin Dillon Carey Hegarty Heffernan Keogh Meehan Nugent Rooney Tierney`,
    ),
    french: P(
      `Lucas Louis Hugo Léo Gabriel Jules Adam Raphaël Arthur Nathan Théo Mathis Maxime Antoine Thomas Alexandre Enzo Clément Baptiste Paul Victor Romain Pierre Julien Nicolas Quentin Florian Kévin Dylan Bastien Rémi Yann Corentin Sébastien Anthony Benjamin Guillaume Loïc Mathieu Valentin Vincent Xavier Étienne Fabien Gaël Jérémy Johan Lilian Morgan Axel Aurélien Cédric Damien Dorian Évan Flavien Grégory Hervé Jordan Killian Laurent Ludovic Marius Matthieu Olivier Pascal Sacha Stéphane Tristan Alexis Alan Brice Cyril Denis Éric Franck Gilles Jonathan Jean-Baptiste Jean-Pierre Marc Mickaël Noé Patrick Raphaël Samuel Sylvain Teddy Yoann Yves Adrien Alban Anatole Auguste Bruno Christophe Emmanuel Fabrice Gérard Hector Jérôme Lucien Martin Maurice Noël Philippe René Thibault Ulysse`,
      `Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard André Lefèvre Mercier Dupont Lambert Bonnet François Martinez Legrand Garnier Faure Rousseau Blanc Guerin Muller Henry Roussel Nicolas Perrin Morin Mathieu Clément Gauthier Dumont Lopez Fontaine Chevalier Robin Masson Sanchez Gérard Nguyen Boyer Denis Lemaire Duval Joly Gautier Roger Roche Roy Noël Meyer Lucas Meunier Jean Pérez Marchand Dufour Blanchard Marie Barbier Brun Dumas Brunet Schmitt Leroux Colin Fernandez Pierre Renard Arnaud Rolland Caron Aubert Giraud Leclerc Vidal Bourgeois Renaud Lemoine Picard Gaillard Philippe Leclercq Lacroix Fabre Dupuis Olivier Rodriguez Da_Silva Hubert Louis Charles Guillot Rivière Le_Gall Guillaume Adam Rey Moulin Gonzalez Berger Lecomte Menard Fleury Deschamps Carpentier Julien Benoit Paris Maillard Marchal Aubry Vasseur Le_Roux Renault Jacquet Collet Prevost Poirier Charpentier Royer Huet Baron Dupuy Pons Paul Laine Carre Breton Remy Schneider Perrot Guyot Barre Marty Cordier`,
    ),
    spanish: P(
      `Javier Carlos Miguel Alejandro Daniel David Pablo Sergio Adrián Álvaro Diego Iván Rubén Jorge Fernando Marcos Raúl Óscar Alberto Antonio Francisco José Manuel Juan Luis Pedro Rafael Andrés Ángel Víctor Gonzalo Hugo Mario Nacho Roberto Rodrigo Santiago Tomás Unai Aitor Asier Borja Cristian Dani Eduardo Enrique Ernesto Fabián Gabriel Guillermo Ignacio Isaac Jaime Jesús Joaquín Jonathan Julián Lorenzo Martín Mateo Nicolás Pol Ramón Saúl Samuel Sebastián Tito Vicente Xavi Aleix Bruno Cesc Eloy Ferran Gerard Jordi Josep Marc Oriol Pau Roger Arnau Aritz Beñat Gorka Iker Imanol Josu Mikel Xabi Joan Albert Alfonso Amador Armando Cayetano Clemente Dídac Emilio Esteban Félix Gerardo Gregorio Héctor Ismael Julio Leandro Lucas Marcelo Matías Maximiliano Nelson Néstor Pascual Ricardo Salvador Teodoro Tirso`,
      `García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez Ortega Delgado Castro Ortiz Rubio Marín Sanz Núñez Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero Cano Prieto Méndez Cruz Calvo Gallego Vidal León Márquez Herrera Peña Flores Cabrera Campos Vega Fuentes Carrasco Diez Caballero Reyes Nieto Aguilar Pascual Santana Herrero Lorenzo Montero Hidalgo Giménez Ibáñez Ferrer Durán Santiago Benítez Mora Vicente Vargas Arias Carmona Crespo Román Pastor Soto Sáez Velasco Moya Soler Parra Esteban Bravo Gallardo Rojas Echeverría Zubizarreta Etxeberria Goikoetxea Aguirre Arrieta Ugarte Urrutia Iraola Mendizábal Olazábal Uriarte Alsina Bosch Casals Coll Ferrán Font Pujol Roca Sala Soler Vila Camps Costa Fabregat Grau Marsal Oliver Puig Riera Rovira Serra Vidal_i_Sala Roig Ribas Guasch Mas Pons Torrent Valls`,
    ),
    portuguese: P(
      `João Pedro Tiago Diogo Rui Miguel André Bruno Ricardo Nuno Hugo Rafael Gonçalo Francisco Filipe Daniel David Fábio Gustavo Vítor Luís Manuel José António Carlos Paulo Sérgio Rúben Tomás Afonso Duarte Martim Salvador Santiago Leonardo Henrique Rodrigo Mateus Vasco Cristiano Eder Danilo Nélson Renato Hélder Jaime Joaquim Júlio Lucas Marco Mário Pascoal Raúl Telmo Zé Abel Álvaro Artur Baltasar Cláudio Domingos Eurico Fernão Gil Heitor Ivo Jorge Leandro Lourenço Mauro Orlando Rolando Valter Wilson Yuri Edgar`,
      `Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha Raposo Neves Coelho Cruz Cabral Melo Matos Moura Barbosa Tavares Lourenço Reis Antunes Freitas Pires Araújo Batista Campos Duarte Faria Guerreiro Henriques Leal Magalhães Miranda Nogueira Pacheco Pimentel Ramos Sampaio Tomé Valente Xavier Barros Brito Calado Dias Esteves Figueiredo Garcia Guimarães Lima Machado Morais Peixoto Queirós Resende Salgado Simões Vaz Veiga Albuquerque Amaral Azevedo Bastos Cavaco Dantas Estrela Fonseca Furtado Lacerda Macedo Medeiros Palma Prates Quaresma Seabra Telles`,
    ),
    italian: P(
      `Marco Luca Andrea Matteo Alessandro Giuseppe Francesco Davide Simone Federico Lorenzo Riccardo Stefano Antonio Giovanni Paolo Roberto Fabio Daniele Gabriele Emanuele Nicola Michele Salvatore Vincenzo Claudio Massimo Alberto Giorgio Cristian Domenico Enrico Filippo Giacomo Leonardo Manuel Mattia Pietro Raffaele Samuele Tommaso Valerio Edoardo Gianluca Ivan Jacopo Lamberto Mauro Nino Orazio Pasquale Rocco Sandro Tiziano Ugo Vittorio Alfredo Angelo Carlo Ciro Dario Elia Fausto Franco Gaetano Gennaro Gino Lucio Mario Mirko Remo Renato Rosario Sergio Walter Achille Aldo Amedeo Bruno Cesare Dino Ennio Ettore Fabrizio Guido Lino Mirco Piero Romeo Silvio Teodoro Ubaldo Zeno`,
      `Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De_Santis D'Angelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri Bianco Marini Grasso Valentini Messina Sala De_Angelis Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo Morelli Amato Silvestri Mazza Testa Grassi Pellegrino Carbone Giuliani Benedetti Barone Rossetti Caputo Montanari Guerra Palmieri Bernardi Martino Fiore De_Rosa Ferretti Bellini Basile Riva Donati Piras Vitali Battaglia Sartori Neri Costantini Milani Pagano Ruggiero Sorrentino D'Amico Orlando Damico Negri Pace Cardinale Leoni Bellucci Brambilla Caselli Duse Fumagalli Gualtieri Lanza Maggi Nardi Orsini Pepe Quaranta Rota Sabatini Tedesco Ventura Zanetti Zoppi`,
    ),
    german: P(
      `Lukas Leon Finn Jonas Maximilian Felix Paul Elias Noah Luis Tim Jan Niklas Tom Moritz Julian David Philipp Fabian Sebastian Tobias Florian Daniel Alexander Marcel Dominik Patrick Kevin Marvin Steffen Christian Matthias Michael Andreas Thomas Stefan Markus Martin Jens Jörg Dirk Bernd Uwe Klaus Frank Ralf Holger Henrik Jannik Kilian Linus Malte Nico Oliver Robin Silas Timo Vincent Yannick Benedikt Constantin Emil Ferdinand Gustav Hannes Ingo Joachim Karl Lennart Manuel Nils Oskar Rasmus Sven Torben Ulrich Wolfgang Axel Bastian Christoph Detlev Erik Fritz Georg Heiko Jürgen Konrad Lars Mario Norbert Rainer Stephan Till Volker Walter`,
      `Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn Schubert Vogel Friedrich Keller Günther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht Schuster Simon Ludwig Böhm Winter Kraus Martin Schumacher Krämer Vogt Stein Jäger Otto Sommer Groß Seidel Heinrich Brandt Haas Schreiber Graf Schulte Dietrich Ziegler Kuhn Kühn Pohl Engel Horn Busch Bergmann Thomas Voigt Sauer Arnold Wolff Pfeiffer Brinkmann Ahrens Bader Baier Bender Bohn Brenner Dreher Ebert Falk Gebhardt Gerber Haupt Heil Hesse Kellner Kessler Klose Kluge Kramer Kunz Lenz Maurer Metzger Nagel Pfeifer Reuter Rieger Rupp Sander Schaefer Seifert Specht Stoll Ulrich Vollmer Wendt Zander`,
    ),
    dutch: P(
      `Daan Sem Lucas Levi Finn Luuk Mees Bram Milan Jesse Thijs Tim Ruben Stijn Joris Niels Sander Bart Rick Rob Kevin Dennis Mark Patrick Erik Marcel Jeroen Wouter Gijs Koen Jelle Tom Thomas Ties Cas Floris Guus Hidde Jurre Lars Max Noud Olaf Pepijn Quinten Rens Siem Teun Wessel Youri Aart Bas Cor Dirk Evert Frans Gerrit Hans Jan Kees Menno Nick Pim Ron Ruud Sjoerd Wim Arjen Bertus Casper Danny Davy Emiel Folkert Geert Hendrik Ivo Jochem Karel Laurens Maarten Nout Otto Peter Quirijn Remco Sybren Taco Vincent Wilco`,
      `de_Jong Jansen de_Vries van_den_Berg van_Dijk Bakker Janssen Visser Smit Meijer de_Boer Mulder de_Groot Bos Vos Peters Hendriks van_Leeuwen Dekker Brouwer de_Wit Dijkstra Smits de_Graaf van_der_Meer van_der_Linden Kok Jacobs de_Haan Vermeulen van_den_Heuvel van_der_Veen van_den_Broek de_Bruijn de_Bruin van_der_Heijden Schouten van_Beek Willems van_Vliet van_de_Ven Hoekstra Maas Verhoeven Koster Prins Huisman Peeters Kuipers van_Veen van_Dam van_der_Wal Scholten Hoogland Kramer Veldhuizen Wolters Zwart Zijlstra Baars Bergsma Blom Boon Bosman Brands Colijn Dikken Doorn Evers Franken Groen Hofman Jonker Kamphuis Klaassen Lammers Lindeboom Mooij Noordhoek Oosterhuis Pot Rademaker Rutten Slot Timmermans Valk Verbeek Wijnands Zeeman`,
    ),
    nordic: P(
      `Magnus Mikkel Emil Oliver Mathias Lucas Frederik Oscar Noah Victor Rasmus Christian Jonas Simon Kasper Andreas Anders Lars Henrik Morten Jesper Nikolaj Søren Thomas Jakob Mads Peter Martin Kristian Marcus Sebastian Alexander Erik Johan Kristoffer Håkon Sander Sindre Eirik Even Torbjørn Ola Kjetil Ole Per Jørgen Trond Vegard Bjørn Stian Fredrik Ruben Tobias Daniel Kasper Mikael Niels Jens Svend Gustav Viggo Aksel Alf Arne Bendt Dag Egil Gunnar Haakon Ingvar Knut Leif Nils Odd Rolf Sverre Terje Ulf Viktor`,
      `Jensen Nielsen Hansen Pedersen Andersen Christensen Larsen Sørensen Rasmussen Jørgensen Petersen Madsen Kristensen Olsen Thomsen Christiansen Poulsen Johansen Møller Mortensen Knudsen Jakobsen Jacobsen Mikkelsen Olesen Frederiksen Laursen Henriksen Lund Schmidt Eriksen Kristiansen Simonsen Clausen Andreasen Iversen Svendsen Christoffersen Mathiesen Bak Gregersen Bruun Dahl Berg Holm Nygaard Strand Haugen Johannessen Pettersen Eriksen Berge Halvorsen Solberg Moen Karlsen Jacobsen Aasen Lie Kristoffersen Mathisen Lunde Bakken Nilsen Hagen Martinsen Paulsen Amundsen Rønning Tangen Sæther Fjeld Dalen Vik Brekke Myhre Skog Aas Bjerke Foss Hegge Kvam Lien Moe Rud Sand Tvedt Ulvestad Vold`,
    ),
    polish: P(
      `Jakub Kacper Szymon Filip Michał Mateusz Piotr Paweł Marcin Łukasz Tomasz Krzysztof Adam Bartosz Dawid Patryk Jan Wojciech Rafał Kamil Damian Mariusz Sebastian Grzegorz Robert Karol Maciej Dominik Przemysław Artur Daniel Marek Tadeusz Zbigniew Andrzej Stanisław Wiktor Oskar Antoni Igor Nikodem Julian Fabian Ignacy Błażej Cezary Emil Hubert Leszek Maksymilian Norbert Oliwier Radosław Sylwester Tymon Wawrzyniec Zdzisław`,
      `Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk Piotrowski Grabowski Nowakowski Pawłowski Michalski Nowicki Adamczyk Dudek Zając Wieczorek Jabłoński Król Majewski Olszewski Jaworski Wróbel Malinowski Pawlak Witkowski Walczak Stępień Górski Rutkowski Michalak Sikora Ostrowski Baran Duda Szewczyk Tomaszewski Pietrzak Marciniak Wróblewski Zalewski Jakubowski Jasiński Zawadzki Sadowski Bąk Chmielewski Włodarczyk Borkowski Czarnecki Sawicki Sokołowski Urbański Kubiak Maciejewski Szczepański Kucharski Wilk Kalinowski Lis Mazurek Wysocki Adamski Kaźmierczak Wasilewski Sobczak Czerwiński Andrzejewski Cieślak Głowacki Zakrzewski Kołodziej Sikorski Krajewski Gajewski Szymczak Szulc Baranowski Laskowski Brzeziński Makowski Ziółkowski Przybylski`,
    ),
    czech: P(
      `Jan Jakub Tomáš Lukáš Martin Petr Pavel Jiří Ondřej Michal David Marek Filip Adam Vojtěch Matěj Dominik Daniel Josef Karel Radek Roman Zdeněk Milan Stanislav Václav Vladimír Jaroslav Miroslav Aleš Antonín Bohumil Ctibor Denis Eduard František Hynek Igor Kamil Libor Oldřich Patrik Richard Šimon Štěpán Vít`,
      `Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec Marek Pokorný Pospíšil Hájek Král Jelínek Růžička Beneš Fiala Sedláček Doležal Zeman Kolář Navrátil Čermák Urban Vaněk Blažek Kříž Kovář Bartoš Kopecký Vlček Polák Musil Šimek Konečný Malý Holub Štěpánek Tichý Soukup Mareš Havlík Kadlec Čech Jirásek Moravec Tesař Matoušek Dostál Vacek Pavlík Šafránek Bureš Beran Kratochvíl Žák Janda Slavík Wagner Ševčík Zelenka`,
    ),
    hungarian: P(
      `Bence Máté Dávid Péter Gábor Zsolt Balázs Ádám Zoltán Tamás Attila Csaba László István János Ferenc József Gergő Levente Norbert Richárd Roland Szabolcs Viktor Dániel Márk Milán Botond Dominik Krisztián András Barnabás Benedek Csongor Dezső Ernő Géza Imre Kálmán Lajos Miklós Olivér Patrik Sándor Tibor Vilmos`,
      `Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas Balogh Papp Takács Juhász Lakatos Mészáros Oláh Simon Rácz Fekete Szilágyi Török Fehér Balázs Gál Kis Szűcs Kocsis Pintér Fodor Orsós Sipos Magyar Lukács Gulyás Biró Király Katona László Jakab Sándor Antal Orbán Bogdán Vincze Pál Fazekas Budai Illés Hegedűs Nemes Bodnár Szalai Boros Bálint Somogyi Jónás Szekeres Sárközi Vörös Lengyel Szántó Veres Mezei Deák Kerekes Gyurcsány Hajdú`,
    ),
    southslav: P(
      `Marko Nikola Stefan Luka Filip Nemanja Miloš Aleksandar Dušan Vladimir Ivan Petar Mihajlo Lazar Đorđe Bojan Darko Goran Dragan Zoran Milan Branko Mladen Slobodan Predrag Vuk Nenad Igor Danilo Andrej Josip Ante Mateo Ivo Tomislav Domagoj Karlo Mario Dino Davor Dario Matija Antonio Zvonimir Hrvoje Krešimir Luka Tin Bruno Fran Jure Lovro Roko Vedran Zlatko Mislav Damir Edin Emir Haris Jasmin Kenan Mirza Samir Tarik Zlatan Adnan Amar Armin Dženan`,
      `Jovanović Petrović Nikolić Marković Đorđević Stojanović Ilić Stanković Pavlović Milošević Popović Mitrović Kostić Lazić Simić Todorović Živković Vasić Radović Jović Ristić Mladenović Savić Tomić Obradović Lukić Filipović Matić Babić Kovačević Horvat Novak Marić Perić Knežević Božić Vuković Tadić Jurić Pavić Blažević Grgić Vidović Ćosić Šimunić Bilić Mikić Šarić Delić Hodžić Mujić Kovač Rukavina Rakić Mandić Pejić Vranješ Bogdanović Dragić Pantić Radulović Stević Zorić Gavrilović Janković Vulić Cvetković Maksimović Dimitrijević Rađenović Kršić Lukač Mrkonjić Tešić`,
    ),
    greek: P(
      `Giorgos Dimitris Nikos Kostas Giannis Panagiotis Christos Vasilis Thanasis Michalis Stelios Alexandros Evangelos Spyros Antonis Manolis Lefteris Pavlos Petros Sotiris Theodoros Argyris Charalampos Dionysis Fotis Ilias Kyriakos Leonidas Makis Nektarios Orestis Periklis Stavros Tasos Vangelis Xenofon Yiannis Zisis Aris Haris Lambros Savvas Stratos Thodoris`,
      `Papadopoulos Vlachos Angelopoulos Nikolaidis Georgiou Petridis Konstantinidis Dimitriou Ioannou Papadakis Antoniou Karagiannis Alexiou Makris Pappas Lazaridis Papanikolaou Vasiliadis Christodoulou Theodorou Samaras Katsaros Oikonomou Kalogeropoulos Zografos Mavridis Stamatis Manolas Galanopoulos Panagiotopoulos Triantafyllou Sideris Theocharis Andreadis Anagnostou Apostolou Chatzis Charalambous Dragoumis Economou Fotiadis Gerakis Kaloudis Kyriakou Leventis Mitsakis Nikolopoulos Orfanos Pavlidis Sakellariou Tsakiris Vasileiou Zafeiriou`,
    ),
    turkish: P(
      `Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim Yusuf Emre Burak Can Cem Kerem Oğuz Okan Volkan Serkan Selçuk Tolga Uğur Ümit Barış Berkay Deniz Eren Furkan Gökhan Halil Kaan Murat Onur Orhan Ozan Recep Sinan Tarık Taner Tuncay Yasin Yunus Zeki Arda Doğan Ege Enes Fatih Hakan İlhan Kemal Levent Metin Necati Rıza Salih Veli Yiğit`,
      `Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Korkmaz Özer Çakır Erdoğan Yavuz Can Acar Şen Aksoy Aktaş Tekin Güneş Güler Kaplan Bulut Karaca Taş Ünal Ateş Bozkurt Erdem Eren Sezer Turan Tunç Uçar Yalçın Altın Bayram Duman Ekinci Güven Kahraman Karahan Karakaya Kocabaş Mutlu Önder Sarı Soylu Tuna Uysal Yazıcı Zorlu`,
    ),
    maghrebi: P(
      `Mohamed Ahmed Youssef Karim Amine Mehdi Yassine Hamza Bilal Omar Walid Rachid Samir Nabil Sofiane Ismaël Adil Anas Brahim Driss Fouad Hicham Ilyes Jamal Khalid Mourad Nassim Othmane Rayan Saïd Tarik Zakaria Abdel Achraf Aymen Badr Chakib Elias Fares Ghali Hakim Idriss Jawad Kamel Lotfi Malik Noureddine Oussama Redouane Salim Taha Yanis Younes Zinedine Abdelkader Amir Ayoub Djamel Farid Habib Hocine Larbi Mounir Rabah Slimane Yacine`,
      `Benali Bouzid Haddad Mansouri Belhadj Cherif Idrissi Alaoui Amrani Bennani Chraibi El_Idrissi Fassi Lahlou Mrabet Ouazzani Tazi Bakkali Benmoussa Benslimane Berrada Bouazza Boukhari Brahimi Chaoui Daoudi El_Amrani El_Fassi Fennich Guerraoui Hamidi Jabri Kadiri Lamrani Mahjoub Naciri Oualid Rahmani Sebti Tahiri Zerouali Belkacem Bensaid Boudjema Boumediene Bouras Djebbar Ferhat Hamdi Kaci Larbi Meziane Rezgui Sahraoui Saidi Taleb Toumi Yahiaoui Ayari Ben_Ali Ben_Salah Bouazizi Chebbi Dridi Gharbi Jlassi Karoui Mejri Nasri Sassi Trabelsi Zouari`,
    ),
    nigerian: P(
      `Chukwuemeka Oluwaseun Chinedu Ikechukwu Emeka Obinna Ifeanyi Nnamdi Uche Kelechi Chidi Tobenna Tochukwu Chigozie Ebuka Ugochukwu Somtochukwu Olamide Babatunde Adewale Ayodele Olusegun Oluwafemi Segun Tunde Temitope Kayode Femi Bola Dapo Gbenga Kunle Lekan Sola Wale Yemi Musa Ibrahim Abubakar Yakubu Danjuma Aminu Garba Haruna Sani Umar Bashir Kabiru Tijani Suleiman Ahmadu Mohammed Ismail Emmanuel Samuel Victor Godwin Moses Isaac Joseph Daniel Blessing Prince Wisdom Sunday Ejike Eze Okechukwu Nwankwo Chima Dozie Ogechi Osita Uzochukwu Chiedozie Tosin Taiwo`,
      `Okafor Okonkwo Eze Nwosu Obi Adeyemi Balogun Adebayo Ogunleye Olawale Akinola Fashola Salami Lawal Bello Abdullahi Musa Ibrahim Yusuf Ahmed Danladi Adamu Ojo Ogbonna Nwachukwu Uchenna Iwu Anyanwu Okoye Chukwu Onuoha Igwe Nnadi Ugwu Ezeh Chinwuba Okeke Ibe Mba Odogwu Osagie Idowu Adeleke Afolabi Oyewole Olabode Olatunji Akande Bamidele Fagbemi Ogundipe Oladipo Oladele Falade Adesanya Adegoke Odunsi Aina Obiora Nwafor Egbuna Ikenna Nwankwo Nwoye Onyema Udoh Etim Effiong Bassey Inyang Ekpo Asuquo`,
    ),
    ghanaian: P(
      `Kwame Kofi Kwesi Kwabena Yaw Kojo Kwaku Nana Akwasi Ebo Fiifi Papa Samuel Daniel Emmanuel Isaac Joseph Francis Richard Michael Benjamin Prince Kingsley Mohammed Ibrahim Abdul Rashid Alhassan Issah Seidu Iddrisu Baba Dauda Jordan Thomas Raphael Gideon Felix Stephen Ernest Patrick Nicholas Albert Eric Collins Majeed Hamza Nuhu Salisu Wakaso Yussif Mubarak Haruna Inusah Fuseini Zakaria Abdul-Aziz Kamaldeen Elisha Joe Andre Alexander Ransford Caleb Bernard`,
      `Mensah Boateng Owusu Appiah Asante Ofori Agyeman Amoah Antwi Danso Frimpong Gyasi Kuffour Mintah Osei Quaye Sarpong Tetteh Yeboah Acheampong Adjei Agyei Amankwah Annan Ansah Atta Badu Bonsu Darko Donkor Fosu Gyamfi Kumi Larbi Lamptey Nyarko Opoku Pappoe Quartey Sackey Tagoe Twumasi Wiredu Addo Adu Aidoo Akoto Amponsah Baffoe Dwamena Kyei Manu Okyere Baidoo Opare Konadu Anokye Ampofo Asiedu Bempah Dankwa Duah Ennin Gyan Kontoh Obeng Poku Sarfo Tawiah`,
    ),
    senegalese: P(
      `Mamadou Cheikh Moussa Ibrahima Ousmane Abdoulaye Pape Babacar Saliou Idrissa Boubacar Lamine Samba Alioune Demba Aliou Bamba Birame Daouda Elhadji Famara Gora Habib Insa Khadim Malick Modou Moustapha Omar Papis Serigne Souleymane Tidiane Youssou Mbaye Amadou Assane Badou Bouna Diadie Doudou Ismaïla Kalidou Mame Massamba Pathé Sadio Sidy Thierno Abdou Mbagnick Ndiaga`,
      `Diop Ndiaye Fall Sow Diallo Gueye Sarr Ba Cissé Faye Mbaye Sy Seck Thiam Toure Camara Niang Kane Sané Mané Diouf Dieng Badji Bathily Coly Dione Diatta Gomis Mendy Sagna Sene Sonko Tall Wade Bocar Kouyaté Samb Mbengue Ndoye Dia Diedhiou Sabaly Koulibaly Gassama Keita Bamba Diakhaby Cissokho Sakho Gana Kara Gningue Niasse Ndour Sylla Traore Kebe Bop Dramé Ka Lô Marone Ndao Pouye Tambedou Wane Yade`,
    ),
    ivorian: P(
      `Kouadio Kouassi Yao Konan Koffi Kouamé Yves Serge Didier Cédric Wilfried Franck Arthur Jean-Philippe Ismaël Seko Salomon Max Jonathan Eric Hervé Stéphane Gervais Evariste Habib Maxime Nicolas Ibrahim Moussa Souleymane Mamadou Lassina Yacouba Abdoulaye Aboubakar Adama Bakary Drissa Fousseni Karim Lacina Sekou Siaka Zié Amad Willy Ghislain Gervinho Christian Emmanuel Parfait Martial Blaise Désiré Hyacinthe Landry Mathias Noël Patrice Rodrigue`,
      `Kouassi Koffi Kouadio Konan Yao Kouamé Traoré Coulibaly Touré Ouattara Diomandé Bamba Doumbia Sangaré Konaté Cissé Diabaté Soro Silué Koné Fofana Sanogo Kanté Diallo Tiéné Boli Kalou Diarrassouba Tapé Kramo Ndri Djaha Bi Gnagne Bakayoko Kouyaté Doukouré Ouedraogo Dao Kader Sylla Ouédraogo Yéo Brou Ahoua Aka Amani Assi Ble Diby Djédjé Gnahoré Kacou Lago N'Guessan Tano Zadi Zagbayou`,
    ),
    centralafrican: P(
      `Fabrice Dieudonné Patrick Christian Jean-Claude Jean-Pierre Joël Marcel Mbemba Mputu Gaël Cédric Blaise Hervé Yannick Stéphane Rodrigue Guy Serge Eric Alain Albert Gédéon Guelor Héritier Jeff Junior Kévin Larry Merveille Naomi Pitchou Rémy Samuel Trésor Wilfried Yves Elie Alphonse Aristide Clément Crépin Fiston Glody Hervé Ilunga Josué Landry Lomomba Michel Nathanaël Ruben Tonton`,
      `Mbemba Mputu Kabongo Mukendi Kalala Tshimanga Ilunga Mwamba Kasongo Kanda Kayembe Mbuyi Mulumba Ngoy Nkulu Mbala Bakola Ekambi Kunde Ngadeu Njie Djoum Etame Ebimbe Mandjeck Siani Mvogo Oyongo Nlend Fai Zambo Mabiala Matondo Kiala Lukoki Mavungu Nsimba Kimbembe Landu Makanda Kapita Lutumba Mazamba Nzuzi Bokamba Eboa Foe Atangana Biyik Fotso Kouam Manga Mbida Ndzie Nana Tchakounté Tchoumi Wamba`,
    ),
    eastafrican: P(
      `Abdi Mohamed Ahmed Hassan Yusuf Omar Ali Ibrahim Abdullahi Farah Liban Mustafa Said Salah Dawit Yonas Tesfaye Habtom Samuel Daniel Elias Kidus Mulugeta Henok Amanuel Biniam Fitsum Michael Kenneth Brian Dennis Victor Joseph Collins Eric Allan Michael Patrick Isaac Moses Jonathan Nelson Peter Paul Simon Samson Wycliffe Kevin Austin Moi Dismas Ayub`,
      `Abdi Mohamud Hassan Farah Warsame Ali Dirie Hersi Jama Nur Aden Omar Osman Egal Yusuf Abdullahi Gebreselassie Tadesse Alemu Bekele Haile Mekonnen Tesfaye Kebede Girma Woldemichael Teklu Berhane Okello Omondi Otieno Ochieng Wanjala Wafula Mutua Kamau Njoroge Kipchoge Kiplagat Kipruto Chebet Cheruiyot Mwangi Kariuki Waweru Karanja Ouma Oduor Odhiambo Owino`,
    ),
    caribbean: P(
      `Marcus Trevor Dwayne Leon Wayne Delroy Winston Clive Errol Lloyd Desmond Garfield Kemar Omar Andre Shaun Nathaniel Raheem Jermaine Tyrone Jamal Kirk Rohan Devon Corey Dexter Damian Jason Junior Kevin Kieran Ricardo Romario Rashid Tyrell Darnell Isaiah Jahmal Jordan Joel Kai Khari Malachi Mikel Nathan Quincy Reece Rhys Roy Sheldon Theo Tristan Troy Vernon Xavier Zane Leroy Everton Frank Gary Ian Neville Paul Ricky Steve Clyde Cleveland Linford Lennox Ossie Ronald Courtney Brendon Dillon`,
      `Campbell Brown Williams Thompson Clarke Johnson Morgan Lewis Reid Grant Henry Bailey Francis Gordon Walker Anderson Harris Edwards Simpson Samuels Richards Blake Palmer Powell Wright Murray Ellis Allen Bennett Nelson Powell Rowe Stewart Marshall McKenzie Miller Rose Foster Barrett Bryan Bryant Burke Chambers Christie Clayton Coke Daley Davis Dawkins Dixon Ennis Forbes Fraser Gibbs Gooden Green Hamilton Hibbert Hinds Hylton Jackson James Kerr Lawrence Lindsay Lyons Martin McFarlane McLean Mitchell Moore Morrison Myers Nicholson Parkes Patterson Pinnock Robinson Rodney Sinclair Smith Spence Stephenson Walters Watson White Whyte Wilson Wint Wynter`,
    ),
    surinamese: P(
      `Quincy Royston Georginio Virgil Jetro Memphis Gregory Urby Nigel Kenneth Rodney Glenn Ruud Patrick Edgar Clarence Aron Jeremain Sheraldo Ryan Jurgen Gianni Giovanni Shaquille Tyrone Denzel Lorenzo Steven Cuco Mitchell Danny Rajiv Sunil Ravi Nicky`,
      `Ramdin Jagernath Sewdien Ramlal Mahabier Pinas Vyent Tjon Lieveld Maynard Kartosen Soekhai Ramsaran Hoefdraad Bhoendie Sital Oemrawsingh Doerga Lachman Kisoensingh Paal Wijdenbosch Nurmohamed Brunings Starke Sno Sedoc Bouterse Rellum Eersel Misiedjan Kromopawiro Amatstam Venetiaan Fernandes Bruma Tjin_A_Djie Lie_A_Fo Monsanto Sabajo Bipat Dwarka Mohan Lall Rambaran Doebé Pengel Lewis`,
    ),
    southasian: P(
      `Aaron Amit Anil Arjun Ashok Deepak Dev Harpreet Hari Imran Jaspal Kabir Karan Kiran Manoj Mohammed Naveed Nikhil Parminder Rahul Raj Rajesh Ravi Rohan Sachin Sam Sanjay Sunil Tariq Vikram Yusuf Zain Adnan Asif Bilal Faisal Hamza Irfan Junaid Kamran Nadeem Naseer Omar Rizwan Sajid Saleem Shahid Tahir Usman Waqar Zeeshan Aman Amar Gurpreet Jagdeep Kuldeep Navdeep Sandeep Tarsem Ranjit`,
      `Patel Singh Khan Ahmed Ali Hussain Hussein Shah Sharma Kumar Gill Dhillon Sandhu Bains Chopra Kapoor Mehta Joshi Desai Reddy Iyer Nair Menon Chaudhry Malik Butt Mirza Qureshi Siddiqui Sheikh Akhtar Anwar Aslam Bashir Iqbal Javed Mahmood Rashid Rehman Saeed Sultan Yaqoob Ghosh Banerjee Chatterjee Mukherjee Das Roy Sen Bose Bhatia Grewal Johal Sidhu Rai Thakur Verma Gupta Agarwal Jain Pillai`,
    ),
    japanese: P(
      `Takumi Haruto Sota Yuto Ren Riku Hiroto Yuki Kaito Daiki Shota Kenta Ryota Takeshi Hiroshi Kazuki Naoki Tomoya Yusuke Masato Shun Koki Shinji Keisuke Yuya Taiki Ryo Sho Tsubasa Hayato Minato Kosuke Toru Akira Daisuke Genki Gaku Hidetoshi Junya Kyogo Maya Mitsuru Nagatomo Reo Satoshi Takehiro Wataru Yoshito Atsuto Eiji Hajime Ichiro Jiro Kenji Makoto Noboru Osamu Ryuji Shigeru Tatsuya Yasuhiro`,
      `Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi Matsumoto Inoue Kimura Hayashi Shimizu Yamazaki Mori Abe Ikeda Hashimoto Ishikawa Ogawa Goto Okada Hasegawa Murakami Kondo Ishii Saito Sakamoto Endo Aoki Fujii Nishimura Fukuda Ota Miura Fujita Okamoto Matsuda Nakagawa Nakano Harada Ono Tamura Takeuchi Kaneko Wada Nakayama Ishida Ueda Morita Hara Shibata Sakai Kudo Yokoyama Miyazaki Miyamoto Uchida Takagi Ando Taniguchi Ohno Maruyama Imai Takada Fujimoto Takeda Murata Ueno Sugiyama Masuda Sugawara Hirano Kojima Otsuka Chiba Kubo Matsui Iwasaki Kuroda`,
    ),
    korean: P(
      `Min-jun Seo-jun Do-yun Ye-jun Si-woo Ha-jun Joo-won Ji-ho Jun-seo Hyun-woo Sung-min Jae-hyun Dong-hyun Young-jae Tae-yang Hyeon-gyu Kang-in In-beom Woo-young Seung-ho Chang-hoon Ui-jo Jin-su Min-hyuk Seung-wook Bo-gyeong Hee-chan Jong-min Jun-ho Kyung-won Tae-seok Yong-jun Ji-sung Dong-won Hyun-soo Bum-geun Ha-neul Sang-ho Won-sik Joon-hyuk Dae-sung Il-lok Myung-bo Seong-ryong Cheol-woong Gi-hyeok`,
      `Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Oh Seo Shin Kwon Hwang Ahn Song Yoo Hong Jeon Ko Moon Yang Son Bae Baek Heo Nam Shim Noh Ha Kwak Sung Cha Joo Woo Min Ryu Na Jin Ji Eom Won Chae Cheon Bang Gong Hyun Ham Byun Yeom`,
    ),
    thai: P(
      `Chanathip Teerasil Theerathon Supachok Sarach Tristan Adisak Pokklaw Kawin Bordin Sasalak Pansa Weerathep Ekanit Suphanan Jonathan Elias Thitiphan Peeradol Manuel Nattapong Sumanya Tanaboon Chatchai Worachit Jakkit Piyapong Saharat Philip Pichitchai Kritsada Narubadin Ratthanakorn Sittichok Thanawat Weerawatnodom Pathomchai Apiwat Anan Chaiwat Decha Eakkapong Itthipol Kasidit Kroekrit Montri Nakarin Pakorn Rangsan Sakda Teeraphol Wuttichai`,
      `Chaiyasit Boonmee Srisai Wongsa Kaewmanee Phansuwan Suksawat Jaidee Phetchara Somchai Sombat Thongdee Saetang Chuenchit Ratchaburi Phumphet Intharat Boonyarit Kanchanapa Wattana Prasert Sirisuk Charoenchai Phongphan Nakhonratsima Kingkaew Thanasan Sripan Boonsin Ruangsri Khamkaew Jirapan Muangthong Pattamawan Songsuk Tapanya Yimsiri Rattanakul Intasen Srisawat Phromsri Yodkaew Suwannarat Piyawong Chantra Chanthong Sawangsri Srichaiyo Duangmala Inthanon Maneerat`,
    ),
    africanamerican: P(
      `DeAndre Jamal Tyrone Marcus Darius Terrance Malik Jalen Isaiah Elijah Jaylen Tyrell Devonte Deshawn Marquise Reggie Antoine Cedric Lamar Rashad Demetrius Kareem Tariq Jerome Calvin Darnell Maurice Reginald Xavier Nigel Terrell Trevon Cameron Brandon Ricky Lonnie Shawn Dominic Corey Darrell Jordan Kendrick Quincy Roderick Terrence Wendell Zachary Clarence Jabari`,
      `Washington Jefferson Robinson Jackson Johnson Williams Brown Davis Jones Harris Thomas Moore Taylor Anderson Wilson Walker Hill Allen Young King Wright Scott Green Baker Adams Nelson Carter Mitchell Roberts Turner Phillips Campbell Parker Evans Edwards Collins Stewart Morris Rogers Reed Cook Morgan Bell Murphy Bailey Cooper Richardson Cox Howard Ward Peterson Gray James Watson Brooks Kelly Sanders Price Bennett Wood Barnes Ross Henderson Coleman Jenkins Perry Powell Long Patterson Hughes Flores Butler Simmons Foster Bryant Alexander Russell Griffin Hayes`,
    ),
    pacific: P(
      `Sione Tomasi Viliami Mosese Siaosi Manu Josefa Ioane Peni Lemeki Tevita Isaia Filipe Aisake Sefo Seru Epeli Ratu Joeli Ropate Savenaca Maika Anare Waisea Kolinio Rusiate Penaia Semi Kalaveti Lote Taniela Tupou Alapati Petelo Sailosi Samu Salesi Fonua Ofa Latu Vaea Tuilagi Penitani Moli Ta'ala Mose Iosefa Alofa Fetu`,
      `Tupou Faleafa Fonoti Kaufusi Latu Lolohea Mafi Moala Naufahu Pulu Taufa Tuitupou Vaea Fifita Havili Leiataua Lealamanu Malietoa Matagi Penitani Sapolu Seumanutafa Soliai Tagaloa Tuala Tuilagi Tuiasosopo Faumuina Afoa Ioane Lefiti Aumua Fa'amausili Kerisiano Ioasa Manu Matau Nonu Savea Tuipulotu Vunipola Naholo Radradra Nayacalevu Tuisova Waqa Ravai Vulavou Koroibete Ledua Kunatani Nawaqanitawase`,
    ),
    latin: P(
      `Santiago Mateo Matías Nicolás Joaquín Benjamín Lautaro Thiago Emiliano Bautista Facundo Franco Lucas Sebastián Tomás Valentín Agustín Alan Ángel Brian Cristian Damián Ezequiel Federico Gastón Germán Gonzalo Ignacio Iván Jonathan Julián Kevin Leandro Maximiliano Nahuel Pablo Ramiro Rodrigo Ulises Walter Alexis Braian Claudio Darío Diego Esteban Fabián Gabriel Guillermo Hernán Jorge Leonel Marcelo Mauricio Rafael Ricardo Rubén Sergio Víctor Yair Zacarías Camilo Cristóbal Duván Edwin Fredy Harold Jhon Juan_Camilo Luis_Fernando Mauro Wilmar Yerry`,
      `Fernández González Rodríguez Gómez López Díaz Martínez Pérez Romero Sánchez García Sosa Torres Álvarez Ruiz Ramírez Flores Benítez Acosta Medina Herrera Suárez Aguirre Giménez Gutiérrez Pereyra Rojas Molina Castro Ortiz Silva Núñez Luna Juárez Cabrera Ríos Morales Domínguez Moreno Peralta Vega Carrizo Godoy Gallardo Rivero Montenegro Lucero Quiroga Maldonado Paz Ledesma Villalba Barrios Correa Cardozo Ojeda Delgado Ávila Figueroa Funes Guzmán Ibarra Leiva Mansilla Navarro Ocampo Palacios Quintero Ramos Salinas Toledo Ugarte Valdez Vargas Zabala Valencia Ospina Mina Muriel Borja Zapata Murillo Mojica Cuesta Arias Uribe Barrera Cardona Campaz`,
    ),
    uruguayan: P(
      `Luis Edinson Diego Federico Maximiliano Martín José Rodrigo Nahitan Matías Giorgian Lucas Agustín Facundo Santiago Mauricio Sebastián Brian Cristian Gonzalo Nicolás Jonathan Joaquín Ronald Darwin Facu Fernando Walter Álvaro Diego_Alejandro Marcelo Gastón Guillermo Emiliano Maxi Gianluca Abel Bruno Hugo Gabriel`,
      `Pereira Rodríguez Fernández Techera Píriz Silveira Lemos Ferreira Machado Cabrera Olivera Rivero Barrios Sosa Núñez Acosta Cardozo Correa Delgado Gómez Giménez Méndez Olivera Pérez Rocha Rosas Sánchez Techera Viera Zeballos Aguirre Amorín Ayala Bentos Carballo Castro Cedrés Chiappara Dutra Echeverría Etcheverry Fagúndez Gadea Gerosa Ibáñez Larrosa Lazzaro Maidana Marrero Moreira Moreno Oliva Pastorino Rivas Salvo Tabárez Urrutia Valdez Varela Vidal Zunino`,
    ),
    mexican: P(
      `Hugo Javier Carlos Raúl Luis Guillermo Hirving Jesús Héctor Andrés Edson Diego Jorge Miguel Alexis Orbelín Uriel Rodolfo Henry Johan Erick Alan Roberto César Carlos_Alberto Marco Oribe Jonathan Fernando Gerardo Efraín Ángel Omar Santiago Gilberto Rogelio Isaac Eduardo Julio Ricardo Rubén Leonel Víctor Armando`,
      `Hernández González Martínez López Herrera Pineda Montes Moreno Gallardo Sánchez Chávez Córdova Antuna Alvarado Salcedo Corona Rodríguez Peralta Reyes Jiménez Quiñones Romo Cortés Vargas Rangel Torres Aguirre Ortiz Rosales Mendoza Ibarra Cabrera Domínguez Medina Ruiz Zamora Cárdenas Delgado Muñoz Cuéllar Valdés Escobedo Barajas Cervantes Ávila Bautista Camacho Carrillo Contreras Esquivel Fuentes Galindo Guerrero Gutiérrez Ibáñez Lara Macías Maldonado Mejía Nava Orozco Padilla Pérez Quintana Robles Rojas Salazar Soto Trejo Uribe Valenzuela Villalobos Zavala`,
    ),
    chinese: P(
      `Wei Jun Hao Lei Ming Chen Yu Xin Tao Peng Bo Kai Long Feng Hua Jian Qiang Yang Zhi Lin Rui Cheng Xiang Yi Zhen Gang Jie Liang Bin Fei Hui`,
      `Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo He Lin Gao Luo Zheng Liang Xie Song Tang Han Feng Deng Cao Peng Zeng Xiao Tian Dong Pan Yuan Cai Jiang Yu Du Ye Cheng Wei Su Lu Ding Ren`,
    ),
  };

  // ---------- Each nation's own culture ----------
  D.NATIVE_POOL = {
    ENG: 'english',
    SCO: 'scottish',
    WAL: 'welsh',
    IRL: 'irish',
    FRA: 'french',
    ESP: 'spanish',
    POR: 'portuguese',
    BRA: 'portuguese',
    ITA: 'italian',
    GER: 'german',
    AUT: 'german',
    SUI: 'german',
    NED: 'dutch',
    BEL: 'dutch',
    DEN: 'nordic',
    NOR: 'nordic',
    POL: 'polish',
    CZE: 'czech',
    HUN: 'hungarian',
    SRB: 'southslav',
    CRO: 'southslav',
    GRE: 'greek',
    TUR: 'turkish',
    MAR: 'maghrebi',
    NGA: 'nigerian',
    GHA: 'ghanaian',
    SEN: 'senegalese',
    CIV: 'ivorian',
    JPN: 'japanese',
    KOR: 'korean',
    THA: 'thai',
    ARG: 'latin',
    COL: 'latin',
    URU: 'uruguayan',
    MEX: 'mexican',
    USA: 'english',
    AUS: 'english',
  };
  // a second pool a nation's native pool is widened with (Argentine and Uruguayan names are Spanish and Italian; Swiss ones
  // German, French and Italian; Belgian ones Dutch and French; Austrian and others German)
  D.NATIVE_EXTRA = {
    ARG: ['spanish', 'italian'],
    URU: ['spanish', 'italian'],
    COL: ['spanish'],
    MEX: ['spanish'],
    SUI: ['french', 'italian'],
    BEL: ['french'],
    AUT: ['czech'],
    USA: ['spanish'],
    AUS: ['italian', 'greek'],
    IRL: ['english'],
    SCO: ['english'],
    WAL: ['english'],
    BRA: ['italian', 'german'],
    CRO: ['italian'],
    NOR: ['german'],
  };

  // ---------- Heritage: who the players of each nation descend from (weights; 'native' = the nation's own) ----------
  D.HERITAGE_LABEL = {
    caribbean: 'Caribbean',
    westafrican: 'West African',
    centralafrican: 'Central African',
    eastafrican: 'East African',
    maghrebi: 'North African (Maghreb)',
    turkish: 'Turkish',
    southasian: 'South Asian',
    southslav: 'Balkan',
    surinamese: 'Surinamese',
    africanamerican: 'African American',
    pacific: 'Pacific Islander',
    latin: 'Latin American',
    spanish: 'Spanish',
    italian: 'Italian',
    portuguese: 'Portuguese',
    greek: 'Greek',
    polish: 'Polish',
    french: 'French',
    irish: 'Irish',
    english: 'English',
    german: 'German',
    dutch: 'Dutch',
    korean: 'Korean',
    chinese: 'Chinese',
    japanese: 'Japanese',
    nigerian: 'Nigerian',
    ghanaian: 'Ghanaian',
    senegalese: 'Senegalese',
    ivorian: 'Ivorian',
  };
  // heritage keys that name a region rather than a pool map to one of the pools above
  D.HERITAGE_POOL = {
    westafrican: ['nigerian', 'ghanaian', 'senegalese', 'ivorian'],
    caribbean: ['caribbean'],
    eastafrican: ['eastafrican'],
  };
  D.DEMOGRAPHICS = {
    ENG: [
      ['native', 78],
      ['caribbean', 6],
      ['westafrican', 5],
      ['southasian', 2],
      ['irish', 3],
      ['centralafrican', 1.5],
      ['eastafrican', 1.5],
      ['maghrebi', 1],
      ['polish', 0.5],
      ['southslav', 0.5],
      ['spanish', 0.5],
      ['portuguese', 0.5],
    ],
    SCO: [
      ['native', 90],
      ['irish', 3],
      ['westafrican', 2],
      ['caribbean', 1.5],
      ['southasian', 1.5],
      ['polish', 1],
      ['italian', 1],
    ],
    WAL: [
      ['native', 92],
      ['caribbean', 2],
      ['westafrican', 2],
      ['southasian', 1.5],
      ['irish', 1.5],
      ['polish', 1],
    ],
    IRL: [
      ['native', 90],
      ['westafrican', 3],
      ['polish', 2],
      ['english', 3],
      ['southasian', 1],
      ['centralafrican', 1],
    ],
    FRA: [
      ['native', 52],
      ['maghrebi', 14],
      ['westafrican', 13],
      ['centralafrican', 8],
      ['caribbean', 5],
      ['portuguese', 2.5],
      ['spanish', 1.5],
      ['italian', 1.5],
      ['turkish', 1],
      ['southslav', 1],
      ['polish', 0.5],
    ],
    ESP: [
      ['native', 88],
      ['latin', 4],
      ['westafrican', 2],
      ['maghrebi', 2.5],
      ['centralafrican', 1.5],
      ['portuguese', 1],
    ],
    POR: [
      ['native', 72],
      ['westafrican', 12],
      ['centralafrican', 8],
      ['latin', 3],
      ['eastafrican', 1],
      ['southslav', 1],
      ['caribbean', 1],
      ['southasian', 1],
      ['french', 1],
    ],
    ITA: [
      ['native', 91],
      ['westafrican', 3],
      ['maghrebi', 2],
      ['southslav', 2],
      ['latin', 1.5],
      ['centralafrican', 0.5],
    ],
    GER: [
      ['native', 70],
      ['turkish', 9],
      ['polish', 5],
      ['southslav', 4],
      ['westafrican', 3.5],
      ['maghrebi', 2],
      ['greek', 1.5],
      ['italian', 1.5],
      ['eastafrican', 1],
      ['centralafrican', 1.5],
      ['southasian', 0.5],
      ['latin', 0.5],
    ],
    AUT: [
      ['native', 78],
      ['southslav', 11],
      ['turkish', 5],
      ['polish', 2],
      ['westafrican', 2],
      ['maghrebi', 1],
      ['czech', 1],
    ],
    SUI: [
      ['native', 66],
      ['southslav', 10],
      ['portuguese', 5],
      ['italian', 5],
      ['turkish', 3],
      ['westafrican', 3],
      ['centralafrican', 2],
      ['maghrebi', 2],
      ['latin', 2],
      ['spanish', 2],
    ],
    NED: [
      ['native', 66],
      ['surinamese', 6],
      ['caribbean', 3],
      ['maghrebi', 8],
      ['turkish', 4],
      ['westafrican', 3],
      ['centralafrican', 2],
      ['southasian', 1.5],
      ['southslav', 1],
      ['latin', 1.5],
      ['polish', 1],
      ['eastafrican', 1],
    ],
    BEL: [
      ['native', 58],
      ['centralafrican', 12],
      ['maghrebi', 11],
      ['turkish', 4],
      ['westafrican', 4],
      ['italian', 3],
      ['southslav', 2],
      ['portuguese', 2],
      ['polish', 1],
      ['dutch', 3],
    ],
    DEN: [
      ['native', 85],
      ['turkish', 3],
      ['maghrebi', 2],
      ['eastafrican', 2],
      ['southslav', 3],
      ['westafrican', 2],
      ['polish', 1.5],
      ['southasian', 1.5],
    ],
    NOR: [
      ['native', 86],
      ['eastafrican', 3],
      ['southasian', 2],
      ['westafrican', 2],
      ['polish', 2],
      ['southslav', 2],
      ['maghrebi', 1.5],
      ['turkish', 1.5],
    ],
    POL: [
      ['native', 98],
      ['westafrican', 1],
      ['latin', 0.5],
      ['eastafrican', 0.5],
    ],
    CZE: [
      ['native', 97],
      ['polish', 1],
      ['southslav', 1],
      ['westafrican', 0.5],
      ['latin', 0.5],
    ],
    HUN: [
      ['native', 97],
      ['southslav', 1.5],
      ['westafrican', 0.5],
      ['latin', 1],
    ],
    SRB: [
      ['native', 96],
      ['eastafrican', 1],
      ['westafrican', 1],
      ['latin', 1],
      ['greek', 1],
    ],
    CRO: [
      ['native', 95],
      ['italian', 2],
      ['westafrican', 1],
      ['latin', 2],
    ],
    GRE: [
      ['native', 94],
      ['southslav', 2],
      ['westafrican', 2],
      ['eastafrican', 1],
      ['latin', 1],
    ],
    TUR: [
      ['native', 93],
      ['southslav', 2],
      ['westafrican', 2],
      ['maghrebi', 1.5],
      ['eastafrican', 1.5],
    ],
    MAR: [
      ['native', 94],
      ['westafrican', 3],
      ['spanish', 1.5],
      ['french', 1.5],
    ],
    NGA: [['native', 100]],
    GHA: [['native', 100]],
    SEN: [
      ['native', 96],
      ['maghrebi', 2],
      ['french', 2],
    ],
    CIV: [
      ['native', 97],
      ['maghrebi', 1.5],
      ['french', 1.5],
    ],
    BRA: [
      ['native', 92],
      ['italian', 2.5],
      ['german', 2],
      ['japanese', 1.5],
      ['westafrican', 1],
      ['spanish', 1],
    ],
    ARG: [
      ['native', 78],
      ['italian', 15],
      ['southslav', 1.5],
      ['german', 2],
      ['latin', 3.5],
    ],
    URU: [
      ['native', 85],
      ['italian', 10],
      ['westafrican', 2],
      ['german', 1.5],
      ['spanish', 1.5],
    ],
    COL: [
      ['native', 90],
      ['westafrican', 6],
      ['italian', 1],
      ['spanish', 3],
    ],
    MEX: [
      ['native', 95],
      ['spanish', 3],
      ['german', 1],
      ['italian', 1],
    ],
    USA: [
      ['native', 50],
      ['africanamerican', 14],
      ['latin', 17],
      ['southasian', 3],
      ['korean', 2],
      ['chinese', 3],
      ['italian', 3],
      ['german', 3],
      ['irish', 3],
      ['westafrican', 1.5],
      ['eastafrican', 0.5],
    ],
    AUS: [
      ['native', 70],
      ['greek', 4],
      ['italian', 4],
      ['pacific', 4],
      ['southasian', 3],
      ['chinese', 3],
      ['southslav', 3],
      ['maghrebi', 1],
      ['eastafrican', 2],
      ['westafrican', 1],
      ['korean', 1],
      ['polish', 1],
    ],
    JPN: [
      ['native', 98],
      ['korean', 1.5],
      ['latin', 0.5],
    ],
    KOR: [
      ['native', 99],
      ['chinese', 1],
    ],
    THA: [
      ['native', 94],
      ['chinese', 5],
      ['westafrican', 1],
    ],
  };
  D.mkPool = P;
  // The nation's own culture widens its first-name and surname pools (no duplicates); nations added later (js/nations.js)
  // call it again
  const dedupe = (a) => [...new Set(a)];
  D.widenNames = function () {
    for (const [nat, N] of Object.entries(D.NATIONS)) {
      const own = D.NAME_POOLS[D.NATIVE_POOL[nat]],
        extra = (D.NATIVE_EXTRA[nat] || []).map((k) => D.NAME_POOLS[k]).filter(Boolean);
      if (!own) continue;
      N.fn = dedupe(N.fn.concat(own.fn, ...extra.map((e) => e.fn.slice(0, 40))));
      N.ln = dedupe(N.ln.concat(own.ln, ...extra.map((e) => e.ln.slice(0, 60))));
    }
  };
  D.widenNames();
  // Pools of a heritage (a region may draw on several cultures)
  D.heritagePool = function (key, rnd) {
    const keys = D.HERITAGE_POOL[key] || [key];
    return D.NAME_POOLS[keys[Math.floor(rnd() * keys.length)]] || null;
  };
})();
