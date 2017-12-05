const pool = require('./db');
const {
    executeQuery,
    buildStatement
} = require('./common');

// const pg = require('pg');  // TODO add agin
// const fs = require('fs'); // TODO add agin
// const copyFrom = require('pg-copy-streams').from; // TODO add agin

let queryData = {};

module.exports = class Model {
    /**
     * Creates instance of the class
     * @param {Object} attrs for exmple {first_name: DBType.text}
     */
    constructor(attrs) {
        Object.keys(attrs).forEach(key => this[key] = attrs[key]);
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
                query = 'UPDATE "' + constructor.tableName() + '" SET (' + statement.attrs + ') = (' + statement.valueClause + ') WHERE ID = $' + (statement.values.length + 1);

            // Adding id to the statement
            statement.values.push(me.id);
            statement.valueClause += ',$' + (statement.values.length + 1);

            executeQuery(constructor, query, statement.values, resolve, reject);
        });
    }

    /**
     * Creates new table for the model
     * @param {Object} cols for exmple {first_name: DBType.text}
     * @return {Promise}
     */
    static createTable(cols) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let fullCols = [];
            Object.keys(cols).forEach(function (key) {
                fullCols.push(key + ' ' + cols[key]);
            });

            let query = 'CREATE TABLE IF NOT EXISTS ' + me.tableName() + '(id SERIAL PRIMARY KEY, ' + fullCols.join(', ') + ')';
            executeQuery(me, query, '', resolve, reject);
        });
    }

    /**
     * Create new row with the relevent attrs
     * @param {Object} attrs
     * @return {Promise} .then(data_after_casing)/.catch(error)
     */
    static create(attrs) {
        let me = this;
        return new Promise(function (resolve, reject) {
            // Creating INSERT query
            let statement = buildStatement(attrs),
                query = 'INSERT INTO "' + me.tableName() + '" (' + statement.attrs + ') VALUES (' + statement.valueClause + ') RETURNING id';

            executeQuery(me, query, statement.values, resolve, reject);
        });
    }

    /**
     * Basic where with the relevent attrs
     * @param {Object} attrs
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static where(attrs) { // TODO updated comment
        let me = this;
        return new Promise(function (resolve, reject) {
            let query, statement;

            if (typeof attrs === 'object') {
                statement = buildStatement(attrs);
                query = 'SELECT * FROM ' + me.tableName() + ' WHERE (' + statement.attrs + ') = (' + statement.valueClause + ')';
            } else if (arguments.length == 2) { // programmer call function with value clause
                query = 'SELECT * FROM ' + me.tableName() + ' WHERE (' + arguments[0] + ') = (' + arguments[1] + ')';
            } else {
                let e = new Error();
                console.warn('ORM: SQL injection can accure, please send read more at the wiki.');
                console.warn(e.stack);

                query = 'SELECT * FROM ' + me.tableName() + ' WHERE (' + arguments[0] + ')';
            }

            executeQuery(me, query, (statement && statement.values) || '', resolve, reject);
        });
    }

    /**
     * Basic where not with the relevent attrs
     * @param {Object} attrs
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static whereNot(attrs) {
        let me = this;
        return new Promise(function (resolve, reject) {
            let statement = buildStatement(attrs),
                query = 'SELECT * FROM ' + me.tableName() + ' WHERE NOT (' + statement.attrs + ') = (' + statement.valueClause + ')';

            executeQuery(me, query, statement.values, resolve, reject);
        });
    }

    /**
     * Find one by id
     * @param {Number} id
     * @return {Promise} result .then(data_after_casing)/.catch(error)
     */
    static find(id) {
        return this.where({
            id
        });
    }

    /**
     * Add attrs to the where
     * @param {Object} attrs
     */
    static gatherWhere(attrs) {
        this.standertizeQueryData();

        queryData[this.className()].where = Object.assign(queryData[this.className()].where, attrs);
    }


    /**
     * Add attrs to the where not
     * @param {Object} attrs
     */
    static gatherWhereNot(attrs) {
        this.standertizeQueryData();

        queryData[this.className()].whereNot = Object.assign(queryData[this.className()].whereNot, attrs);
    }

    /**
     * Add attrs to the select
     * @param {Array} select
     */
    static gatherSelect(select) {
        this.standertizeQueryData();

        queryData[this.className()].select = select;
    }

    /**
     * Run the backed up +queryData+ (select, where, whereNot)
     * @return {Promise}
     */
    static execute() {
        let me = this;
        return new Promise(function (resolve, reject) {
            me.standertizeQueryData();

            let whereStatement = buildStatement(queryData[me.className()].where),
                whereNotStatement = buildStatement(queryData[me.className()].whereNot, whereStatement.values.length + 1),
                select = queryData[me.className()].select,
                selectStringStatement = select.length > 0 ? select.join('') : '*', // TODO WARNING!!!
                totalValues = whereStatement.values.concat(whereNotStatement.values),
                totalWhere = '';

            // Adding where to totalWhere
            whereStatement.attrs.split(', ').filter(function (el) {
                return el.length != 0
            }).forEach(function (attr, index) {


                if (totalWhere.length > 0)
                    totalWhere += ' AND ';

                totalWhere += ' ' + attr + ' = ' + whereStatement.valueClause.split(', ')[index];
            });

            // Adding where not to totalWhere
            whereNotStatement.attrs.split(', ').filter(function (el) {
                return el.length != 0
            }).forEach(function (attr, index) {
                if (totalWhere.length > 0)
                    totalWhere += ' AND ';

                totalWhere += ' NOT ' + attr + ' = ' + whereNotStatement.valueClause.split(', ')[index];
            });

            me.clearQueryData(); // remove backed up queryData

            // TODO CAN BE SQL INJECTION!!!
            let query = 'SELECT ' + selectStringStatement + ' FROM ' + me.tableName() + ' WHERE ' + totalWhere;
            executeQuery(me, query, totalValues, resolve, reject);
        });
    }

    /**
     * Clears the gevered query
     */
    static clearQueryData() {
        this.standertizeQueryData();
        queryData[this.className()] = {};
    }

    /**
     * Set empty object (where, whereNot, select) for the model if not set
     */
    static standertizeQueryData() {
        queryData[this.className()] = queryData[this.className()] || {};
        queryData[this.className()].where = queryData[this.className()].where || {};
        queryData[this.className()].whereNot = queryData[this.className()].whereNot || {};
        queryData[this.className()].select = queryData[this.className()].select || [];
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
     * Returns the table name, +className()+ dash and plural, for exemple: User => users, UserPhoto => user_photos)
     * @return {String} table name, +className()+ dash and plural, for exemple: User => users, UserPhoto => user_photos)
     */
    static tableName() {
        return this.className().toLowDash().plural();
    }
};