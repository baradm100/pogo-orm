const pool = require('./db');
const DBType = {
    string: 'TEXT',
    date: 'DATE',
    timestamp: 'TIMESTAMP',
    bool: 'BOOLEAN',
    int: 'INTEGER'
}


/**
 * Build query statement for pg
 * @param {Object} obj
 * @param {Number} startValueClause optional, if user adds more value clause before
 * @return {Object} 
 * * attrs: obj keys, for exemple: 'a'
 * * valueClause: creates value cluase '$1'
 * * values: [1]
 */
function buildStatement(obj, startValueClause = 1) {
    var valueClause = [],
        values = Object.keys(obj).map(key => obj[key]);

    for (var i = startValueClause; i < Object.keys(obj).length + startValueClause; i++)
        valueClause.push('$' + i);

    return {
        attrs: Object.keys(obj).join(', '),
        valueClause: valueClause.join(', '),
        values: values
    };
};

/**
 * Execute query for Promise
 * @param {Object} model
 * @param {String} query
 * @param {Array} values
 * @param {Function} resolve
 * @param {Function} reject
 * @param {Boolean} withCasting
 */
function executeQuery(model, query, values, resolve, reject, withCasting = true) {
    pool.query(query, values, function (err, res) {
        if (err) // If there is a problem, reject and send error
            reject(err);

        // Everything is fine and dandy! calling relsove with the results (after casting into the model)
        let result = withCasting && res.rows ? res.rows.map(row => new model(row)) : res.rows;
        resolve(result);
    });
}

module.exports = {
    executeQuery,
    buildStatement,
    DBType
};


// Prototyping commenly use functions

/**
 * Returns the diffrence between 2 arrys
 * @param {Array} other
 * @return {Array} the diffrence between 2 arrys
 */
Array.prototype.difference = function (other) {
    return this.filter((cell) => other.indexOf(cell) < 0);
};


/**
 * Convert camelcase to Low dash
 * @returns {String}
 */
String.prototype.toLowDash = function () {
    return this.replace(/([A-Z])/g, char => "_" + char.toLowerCase()).substr(1);
};

/**
 * Pluralizing word, if the Sring is underscored replacing only the last part of the word (after the last '_')
 * @returns {String}
 */
String.prototype.plural = function () {
    let plural = {
        '(quiz)$': "$1zes",
        '^(ox)$': "$1en",
        '([m|l])ouse$': "$1ice",
        '(matr|vert|ind)ix|ex$': "$1ices",
        '(x|ch|ss|sh)$': "$1es",
        '([^aeiouy]|qu)y$': "$1ies",
        '(hive)$': "$1s",
        '(?:([^f])fe|([lr])f)$': "$1$2ves",
        '(shea|lea|loa|thie)f$': "$1ves",
        'sis$': "ses",
        '([ti])um$': "$1a",
        '(tomat|potat|ech|her|vet)o$': "$1oes",
        '(bu)s$': "$1ses",
        '(alias)$': "$1es",
        '(octop)us$': "$1i",
        '(ax|test)is$': "$1es",
        '(us)$': "$1es",
        '([^s]+)$': "$1s"
    },
        singular = {
            '(quiz)zes$': "$1",
            '(matr)ices$': "$1ix",
            '(vert|ind)ices$': "$1ex",
            '^(ox)en$': "$1",
            '(alias)es$': "$1",
            '(octop|vir)i$': "$1us",
            '(cris|ax|test)es$': "$1is",
            '(shoe)s$': "$1",
            '(o)es$': "$1",
            '(bus)es$': "$1",
            '([m|l])ice$': "$1ouse",
            '(x|ch|ss|sh)es$': "$1",
            '(m)ovies$': "$1ovie",
            '(s)eries$': "$1eries",
            '([^aeiouy]|qu)ies$': "$1y",
            '([lr])ves$': "$1f",
            '(tive)s$': "$1",
            '(hive)s$': "$1",
            '(li|wi|kni)ves$': "$1fe",
            '(shea|loa|lea|thie)ves$': "$1f",
            '(^analy)ses$': "$1sis",
            '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': "$1$2sis",
            '([ti])a$': "$1um",
            '(n)ews$': "$1ews",
            '(h|bl)ouses$': "$1ouse",
            '(corpse)s$': "$1",
            '(us)es$': "$1",
            's$': ""
        },
        irregular = {
            'move': 'moves',
            'foot': 'feet',
            'goose': 'geese',
            'sex': 'sexes',
            'child': 'children',
            'man': 'men',
            'tooth': 'teeth',
            'person': 'people'
        },
        uncountable = [
            'sheep',
            'fish',
            'deer',
            'moose',
            'series',
            'species',
            'money',
            'rice',
            'information',
            'equipment'
        ],
        lastPart = this.split('_').reverse()[0];

    // save some time in the case that singular and plural are the same
    if (uncountable.indexOf(lastPart.toLowerCase()) >= 0)
        return this;

    // check for irregular forms
    for (word in irregular) {
        var pattern = new RegExp(word + '$', 'i');
        var replace = irregular[word];

        if (pattern.test(lastPart)) {
            let newLastPart = lastPart.replace(pattern, replace); // pluralizing last part of the string
            // returns full string and newly plurized string concatanated be "_" if needed
            return (lastPart == this) ? newLastPart : this.split('_').slice(0, -1).join('_') + '_' + newLastPart;
        }

    }

    // check for matches using regular expressions
    for (reg in plural) {
        var pattern = new RegExp(reg, 'i');

        if (pattern.test(lastPart)) {
            let newLastPart = lastPart.replace(pattern, plural[reg]); // pluralizing last part of the string
            // returns full string and newly plurized string concatanated be "_" if needed
            return (lastPart == this) ? newLastPart : this.split('_').slice(0, -1).join('_') + '_' + newLastPart;
        }

    }

    return this;
};

Array.prototype.compact = function () {
    return this.filter(val => !!val);
}