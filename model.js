const pluralize = require('pluralize');
const {
    toUnderscore
} = require('./helper');
const Query = require('./query');

class Model {
    /**
     * Construct an instance of a record
     * @param {Object} attrs Attributes of the record
     */
    constructor(attrs = {}) {
        if (attrs && typeof attrs === 'object' && attrs.constructor === Object) {
            // Adds attrs to the instance
            Object.keys(attrs).forEach(key => this[key] = attrs[key]);
        }
    }

    /**
     * Returns the class name
     * @return {String} class name
     */
    static className() {
        return this.toString().split('(' || /s+/)[0].split(' ' || /s+/)[1];
    }

    /**
     * Returns the table name, +className()+ dash and plural, for example: User => users, UserPhoto => user_photos)
     * @return {String} table name, +className()+ dash and plural, for example: User => users, UserPhoto => user_photos)
     */
    static tableName() {
        let tableName = toUnderscore(this.className()).split('_');
        tableName[tableName.length - 1] = pluralize(tableName[tableName.length - 1]);

        return tableName.join('_');
    }

    /**
     * Add where to the query
     * @param {Object[]|Array[]} statements Array of the statements, can be the following type:
     * * `Object` - {key: value}
     * * `Array` - [{key: value}]
     * @returns {Query} this
     */
    static where(...statements) {
        let query = new Query(this);
        return query.where(statements);
    }

    /**
     * Add select to the query
     * @param {Object[]|Array[]} statements Array of the statements, can be the following type:
     * * `Object` - {key: value}
     * * `Array` - [{key: value}]
     * @returns {Query} this
     */
    static select(...statements) {
        let query = new Query(this);
        return query.select(statements);
    }
}

class User extends Model {
    static hasMany()
}

let b = User.where({
    id: 1
});

b.execute().then((rows) => console.log(rows[0]))