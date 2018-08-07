const pool = require('./db');

module.exports = class Query {
    constructor(model) {
        this.model = model;
        this.querySegments = {
            where: [],
            select: []
        }
    }

    /**
     * Add where to the query
     * @param {Object[]|Array[]} statements Array of the statements, can be the following type:
     * * `Object` - {key: value}
     * * `Array` - [{key: value}]
     * @returns {Query} this
     */
    where(...statements) {
        this._standardizeQueryStatements('where', statements);
        return this;
    }

    /**
     * Add select to the query
     * @param {Object[]|Array[]} statements Array of the statements, can be the following type:
     * * `Object` - {key: value}
     * * `Array` - [{key: value}]
     * @returns {Query} this
     */
    select(...statements) {
        this._standardizeQueryStatements('select', statements);
        return this;
    }

    execute(withCasting = true) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let query;
            let select = me.querySegments.select.join(',');
            let values = [];
            let totalWhere = '';

            // If `select` is empty
            if (!select)
                select = '*';

            me.querySegments.where.forEach((statement) => {
                if (typeof statement === 'object' && statement.constructor === Object) {
                    for (let key in statement) {
                        if (totalWhere.length > 0)
                            totalWhere += ' AND ';

                        totalWhere += key + ' = $' + (values.length + 1);
                        values.push(statement[key]);
                    }
                } else if (typeof statement === 'string') {
                    if (totalWhere.length > 0)
                        totalWhere += ' AND ';

                    totalWhere += ' ' + statement;
                } else {
                    reject(new Error('Invalid query statement type.'));
                }
            });

            query = `SELECT ${select} FROM ${me.model.tableName()} WHERE ${totalWhere}`;

            pool.query(query, values, function (err, res) {
                if (err) // If there is a problem, reject and send error
                    reject(err);

                // Everything is fine and dandy! calling resole with the results (after casting into the model)
                let result = withCasting && res.rows ? res.rows.map(row => new me.model(row)) : res.rows;
                resolve(result);
            });
        });
    }

    /**
     * Private function - Standardize the query statements to fit to the relevant type to create coherent `querySegments`
     * @param {String} type of the query segment
     * @param {Object[]|Array[]} statements Array of the statements, can be the following type:
     * * `Object` - {key: value}
     * * `Array` - [{key: value}]
     */
    _standardizeQueryStatements(type, statements) {
        statements.forEach((statement) => {
            if (Array.isArray(statement)) {
                this.querySegments[type] = this.querySegments.where.concat(statement);
            } else if (typeof statement === 'object' && statement.constructor === Object) {
                this.querySegments[type].push(statement);
            } else {
                throw new Error('Invalid query statement type.');
            }
        });
    }
}