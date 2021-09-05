function add_points(table, team, goals_for, goals_against) {
    if (!(team in table)) {
        table[team] = {
            'team': team,
            'games': 0,
            'wins': 0,
            'draws': 0,
            'losses': 0,
            'for': 0,
            'against': 0,
            'points': 0,
            'gd': 0
        }
    }
    table[team]['games'] ++;
    table[team]['for'] += goals_for;
    table[team]['against'] += goals_against;
    table[team]['gd'] = table[team]['for'] - table[team]['against'];
    if (goals_for > goals_against) {
        table[team]['wins']++;
        table[team]['points'] += 3;
    } else if (goals_for == goals_against) {
        table[team]['draws']++;
        table[team]['points'] += 1;
    } else {
        table[team]['losses']++;
    }

    return table
}

function populate_select(data) {
    sorted_seasons = data.sort(function(a, b) {
        a_competition = a['country'] + a['name']
        b_competition = b['country'] + b['name']
        if (a_competition === b_competition) {
            let a_year = a['season'].split('-')[0]
            let b_year = b['season'].split('-')[0]
            return b_year - a_year;
        }
      return a_competition > b_competition ? 1 : -1;
    });
    let seasons = sorted_seasons.map(function(s) {
        return s['country'] + ' ' + s['name'] + ' ' + s['season']
    });
    config = {
        placeHolder: "Search for seasons",
        data: {
            src: seasons,
            cache: false
        },
        resultItem: {
            highlight: {
                render: true
            }
        },
        searchEngine: "loose",
         events: {
            input: {
                selection: (event) => {
                    const selection = event.detail.selection.value;
                    load_season(selection, 0, null, data)
                }
            }
        }
    }
    const autoCompleteJS = new autoComplete(config);
    $('#autoComplete').show();
}


function calculate_league_table(results) {
    var table = {};
    for (const index in results) {
        let result = results[index];
        table = add_points(table, result['home_team'], result['home_goals'], result['away_goals']);
        table = add_points(table, result['away_team'], result['away_goals'], result['home_goals']);
    }
    return Object.values(table).sort(function(a, b) {
      if (a.points === b.points) {
         return b.gd - a.gd;
      }
      return b.points > a.points ? 1 : -1;
    });
}

function render_table(table) {
    data = []
    for (const index in table) {
        team = table[index]
        position = parseInt(index) + 1
        data.push([
            position,
            team['team'],
            team['games'],
            team['wins'],
            team['draws'],
            team['losses'],
            team['for'],
            team['against'],
            team['points'],
            team['gd']
        ])
    }
    if ($.fn.dataTable.isDataTable('#table')) {
        var data_table = $('#table').DataTable();
        data_table.clear();
        data_table.rows.add(data);
        data_table.draw();
    }
    else {
        $('#table').DataTable( {
            data: data,
            columns: [
                { title: "Position" },
                { title: "Team" },
                { title: "P" },
                { title: "W" },
                { title: "D" },
                { title: "L" },
                { title: "F" },
                { title: "A" },
                { title: "Points"},
                { title: "GD" }
            ],
            "paging": false,
            "order": [],
            "ordering": false,
            "searching": false,
            'info': false
        });
    }
}

function get_url_parameters() {
    const query_string = window.location.href.split('#')
    if (query_string.length > 1) {
        query_parameters = query_string[1].split('/').filter(s => s.length > 0)
        if (query_parameters.length < 3) {
            return false;
        } else {
            parameters = {
               'country': query_parameters[0],
               'name':  query_parameters[1],
               'season':  query_parameters[2],
            }
            if (query_parameters.length > 3) {
                parameters['games_from'] = query_parameters[3]
            }
            if (query_parameters.length > 4) {
                parameters['games_to'] = query_parameters[4]
            }
            if (query_parameters.length > 5) {
                parameters['team'] = query_parameters[5]
            }
            return parameters;
        }
    } else {
        return false;
    }
}

function flatten(s) {
    return s.toLowerCase().replaceAll(" ", '-');
}

function load_season(season_string, from, to, data) {
    season = data.find(function(x){
        return flatten(x['country'] + ' ' + x['name'] + ' ' + x['season']) == flatten(season_string);
    });
    $.get('json/' + season['filename'], function(results){
        for (const index in results) {
            results[index]['js_date'] = new Date(results[index]['date'])
        }
        results = results.sort(function(a, b) { return a.date > b.date ? 1 : -1; })

        if (!to) {
            to = results.length;
        }

        window.location = '/#/' + flatten(season['country']) + '/' + flatten(season['name'])+ '/' + flatten(season['season']) + '/' + from + '/' + to;
        $("#season_title").html(season['country'] + ' ' + season['name'] + ', ' + season['season']);
        var table = calculate_league_table(results.slice(from, to));
        render_table(table);
        $("#slider_container").html("<div id='slider'></div>");
        var slider = document.getElementById('slider');

        noUiSlider.create(slider, {
            start: [from, to],
            connect: true,
            range: {
                'min': 0,
                'max': results.length
            },
            tooltips: true,
            format: {
                to : x => parseInt(x),
                from: x => parseInt(x)
            },
         });

        slider.noUiSlider.on('change', function () {
            let values = slider.noUiSlider.get();
            let table = calculate_league_table(results.slice(values[0], values[1]));
            window.location = '/#/' + flatten(season['country']) + '/' + flatten(season['name'])+ '/' + flatten(season['season']) + '/' +  values[0] + '/' + values[1];

            render_table(table);
        });
    });
}


$(document).ready(function() {
    $.get('json/index.json', function(data){
        populate_select(data);
        url_parameters = get_url_parameters();
        if (url_parameters) {
            let from = 'games_from' in url_parameters ? url_parameters['games_from'] : 0;
            let to = 'games_from' in url_parameters ? url_parameters['games_to'] : null;
            load_season(url_parameters['country'] + ' ' + url_parameters['name'] + ' ' + url_parameters['season'], from, to, data);
        }
    });

})