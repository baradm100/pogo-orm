const {
    executeQuery,
    buildStatement
} = require('./common');

let queryData = {};

module.exports = class Model {
    /**
     * Creates instance of the class
     * @param {Object} attrs for example {first_name: DBType.text}
     */
    constructor(attrs) {
        // Adds attrs to the instance
        Object.keys(attrs).forEach(key => this[key] = attrs[key]);

        // Adds relations function to the instance
        this.addRelationFunctions();
    }

    /**
     * Adds relations function to the instance, the function names are the same as the class name (if the relation is hasMany so the name of the class is in plural)
     */
    addRelationFunctions() {
        let me = this,
            meConstructor = me.constructor;

        const hasMany = meConstructor.hasMany ? meConstructor.hasMany() : [],
            hasOne = meConstructor.hasOne ? meConstructor.hasOne() : [],
            belongsTo = meConstructor.belongsTo ? meConstructor.belongsTo() : [],
            hasAndBelongsToMany = meConstructor.hasAndBelongsToMany ? meConstructor.hasAndBelongsToMany() : [];

        if (meConstructor.hasMany) {
            // Adds function to represent the hasMany relation
            meConstructor.hasMany().forEach((relation) => {
                me[relation.className().plural()] = function () {
                    let q = {};
                    q[meConstructor.className().toLowDash() + '_id'] = me.id;
                    return relation.where(q);
                };
            });
        }

        if (meConstructor.hasOne) {
            // Adds function to represent the hasOne relation
            meConstructor.hasOne().forEach((relation) => {
                me[relation.className()] = function () {
                    let q = {};
                    q[meConstructor.className().toLowDash() + '_id'] = me.id;
                    return relation.where(q);
                };
            });
        }

        if (meConstructor.belongsTo) {
            // Adds function to represent the belongsTo relation
            meConstructor.belongsTo().forEach((relation) => {
                me[relation.className()] = function () {
                    let q = {};
                    q.id = me[`${relation.className().toLowDash()}_id`];
                    return relation.where(q);
                };
            });
        }

        if (meConstructor.hasAndBelongsToMany) {
            meConstructor.hasAndBelongsToMany().forEach((relation) => {
                me[relation.className().plural()] = function () {
                    let joinedTable = [table.tableName(), meConstructor.tableName()].sort().join('_'),
                        q = {};
                    q[`${meConstructor.className().toLowDash()}_id`] = me.id;
                    let statement = buildStatement(q),
                        query = `SELECT * FROM ${joinedTable} WHERE (${statement.attrs}) = (${statement.valueClause})`;

                    return new Promise(function (resolve, reject) {
                        executeQuery(meConstructor, query, statement.values, resolve, reject);
                    });
                };
            });
        }
    }

    /**
     * Update the record
     * @param {Object} newAttrs
     * @return {Promise}
     */
    updateAttributes(newAttrs) {
        let constructor = this.constructor,
            me = this;
        return new Promise(function (resolve, reject) {
            if (!me.id)
                reject(new Error("updateAttributes Must Have ID"));

            let statement = buildStatement(newAttrs),
                query = `UPDATE "${constructor.tableName()}" SET (${statement.attrs}) = (${statement.valueClause}) WHERE ID = $${statement.values.length + 1}`;

            // Adding id to the statement
            statement.values.push(me.id);
            statement.valueClause += ',$' + (statement.values.length + 1);

            executeQuery(constructor, query, statement.values, resolve, reject);
        });
    }

    /**
     * Creates new table for the model
     * @param {Object} cols for example {first_name: DBType.text}
     * @return {Promise}
     */
    static createTable(cols) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let fullCols = [];
            Object.keys(cols).forEach(function (key) {
                fullCols.push(key + ' ' + cols[key]);
            });

            let query = `CREATE TABLE IF NOT EXISTS  ${me.tableName()} (id SERIAL PRIMARY KEY, ${fullCols.join(', ')})`
            executeQuery(me, query, '', resolve, reject);
        });
    }

    /**
     * Create new row with the relevant attrs
     * @param {Object} attrs
     * @return {Promise} .then(data_after_casing)/.catch(error)
     */
    static create(attrs) {
        let me = this;
        return new Promise(function (resolve, reject) {
            // Creating INSERT query
            let statement = buildStatement(attrs),
                query = `INSERT INTO "${me.tableName()}" (${statement.attrs}) VALUES (${statement.valueClause}) RETURNING id`;

            executeQuery(me, query, statement.values, resolve, reject);
        });
    }

    /**
     * Basic where with the relevant attrs
     * @param {Object} attrs
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static where(attrs) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let query, statement;

            if (typeof attrs === 'object') {
                // attrs are Object, best practice
                statement = buildStatement(attrs);
                query = `SELECT * FROM ${me.tableName()} WHERE (${statement.attrs}) = (${statement.valueClause})`;
            } else if (arguments.length == 2) {
                // calling the function with values (as String) and value clause
                query = `SELECT * FROM ${me.tableName()} WHERE (${arguments[0]}) = (${arguments[1]})`;
            } else {
                // calling the function with SQL code in String, not recommended at all!
                let e = new Error();
                console.warn('ORM: SQL injection can occur, please send read more at the README.md file.');
                console.warn(e.stack);

                query = `SELECT * FROM ${me.tableName()} WHERE (${arguments[0]})`;
            }

            executeQuery(me, query, (statement && statement.values) || '', resolve, reject);
        });
    }

    /**
     * Basic where not with the relevant attrs
     * @param {Object} attrs
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static whereNot(attrs) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let statement = buildStatement(attrs),
                query = `SELECT * FROM ${me.tableName()} WHERE NOT (${statement.attrs}) = (${statement.valueClause})`;

            executeQuery(me, query, statement.values, resolve, reject);
        });
    }

    /**
     * Find one by id
     * @param {Number} id
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static find(id) {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.where({
                id
            }).then((data) => resolve(data[0])).catch((err) => reject(err));
        });
    }

    // Gather Query:
    /**
     * Add attrs to the where
     * @param {Object} attrs
     */
    static gatherWhere(attrs) {
        this.standardizeQueryData();

        queryData[this.className()].where = Object.assign(queryData[this.className()].where, attrs);
    }


    /**
     * Add attrs to the where not
     * @param {Object} attrs
     */
    static gatherWhereNot(attrs) {
        this.standardizeQueryData();

        queryData[this.className()].whereNot = Object.assign(queryData[this.className()].whereNot, attrs);
    }

    /**
     * Add attrs to the select
     * @param {Array} select
     */
    static gatherSelect(select) {
        this.standardizeQueryData();

        queryData[this.className()].select = select;
    }

    /**
     * Adds (inner right) joins for the tables using relation between models (hasOne, hasMany, belongsTo, hasAndBelongsToMany)
     * @param {Model|String} tables - can be sub-class of model or 'join' String
     */
    static joins(...tables) {
        this.standardizeQueryData();

        const hasMany = this.hasMany ? this.hasMany() : [],
            hasOne = this.hasOne ? this.hasOne() : [],
            belongsTo = this.belongsTo ? this.belongsTo() : [],
            hasAndBelongsToMany = this.hasAndBelongsToMany ? this.hasAndBelongsToMany() : [];
        let me = this;

        tables.forEach((table) => {
            let joinQuery;
            if (typeof table === 'string')
                joinQuery = table;
            else if (hasOne.includes(table) || hasMany.includes(table))
                joinQuery = `JOIN ON ${me.tableName()}.id = ${table.tableName()}.${me.className().toLowDash()}_id`;
            else if (belongsTo.includes(table))
                joinQuery = `JOIN ON ${table.tableName()}.id = ${me.tableName()}.${table.className().toLowDash()}_id`;
            else if (hasAndBelongsToMany.includes(table)) {
                let joinedTable = [table.tableName(), me.tableName()].sort().join('_');
                joinQuery = `JOIN ON ${me.tableName()}.id = ${joinedTable}.${me.className().toLowDash()}_id`;
            }

            queryData[this.className()].joins.push(joinQuery);
        });
    }

    /**
     * Run the backed up +queryData+ (select, where, whereNot)
     * @return {Promise}
     */
    static execute() {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.standardizeQueryData();

            let whereStatement = buildStatement(queryData[me.className()].where),
                whereNotStatement = buildStatement(queryData[me.className()].whereNot, whereStatement.values.length + 1),
                select = queryData[me.className()].select,
                selectStringStatement = select.length > 0 ? select.join('') : '*',
                totalValues = whereStatement.values.concat(whereNotStatement.values),
                joins = queryData[me.className()].joins.compact().joins(' AND '),
                totalWhere = '';

            // Adding where to totalWhere
            whereStatement.attrs.split(', ').filter((el) => el.length != 0).forEach(function (attr, index) {
                if (totalWhere.length > 0)
                    totalWhere += ' AND ';

                totalWhere += ' ' + attr + ' = ' + whereStatement.valueClause.split(', ')[index];
            });

            // Adding where not to totalWhere
            whereNotStatement.attrs.split(', ').filter((el) => el.length != 0).forEach(function (attr, index) {
                if (totalWhere.length > 0)
                    totalWhere += ' AND ';

                totalWhere += ' NOT ' + attr + ' = ' + whereNotStatement.valueClause.split(', ')[index];
            });

            // if the +totalWhere+ is empty then get all the data!!
            if (totalWhere.length == 0)
                totalWhere = '1 = 1';

            me.clearQueryData(); // remove backed up queryData

            let query = `SELECT ${selectStringStatement} ${joins} FROM ${me.tableName()} WHERE ${totalWhere}`;
            executeQuery(me, query, totalValues, resolve, reject);
        });
    }

    /**
     * Clears the gathered query
     */
    static clearQueryData() {
        this.standardizeQueryData();
        queryData[this.className()] = {};
    }

    /**
     * Set empty object (where, whereNot, select) for the model if not set
     */
    static standardizeQueryData() {
        queryData[this.className()] = queryData[this.className()] || {};
        queryData[this.className()].where = queryData[this.className()].where || {};
        queryData[this.className()].whereNot = queryData[this.className()].whereNot || {};
        queryData[this.className()].select = queryData[this.className()].select || [];
        queryData[this.className()].joins = queryData[this.className()].joins || [];
    }

    /**
     * Returns the class name
     * @return {String} class name
     */
    static className() {
        let className = this.toString().split('(' || /s+/)[0].split(' ' || /s+/)[1];
        return className;
    }

    /**
     * Returns the table name, +className()+ dash and plural, for example: User => users, UserPhoto => user_photos)
     * @return {String} table name, +className()+ dash and plural, for example: User => users, UserPhoto => user_photos)
     */
    static tableName() {
        return this.className().toLowDash().plural();
    }
};