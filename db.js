const pg = require('pg');

// create a config to configure both pooling behavior and client options
const env = process.env.NODE_ENV || 'development';
const config = require('./config/db.json')[env];

//this initializes a connection pool
const pool = new pg.Pool(config);

pool.on('error', function (err, client) {
    // if an error is encountered by a client while it sits idle in the pool
    // the pool itself will emit an error event with both the error and
    // the client which emitted the original error
    // this is a rare occurrence but can happen if there is a network partition
    // between your application and the database, the database restarts, etc.
    // and so you might want to handle it and at least log it out
    if (env === 'development')
        console.error('idle client error', err.message, err.stack);
});

//export the query method for passing queries to the pool
module.exports.query = function (text, values, callback) {
    if (env == 'development')
        console.log('query:', text, values);

    return pool.query(text, values, callback);
};

//export the query method for passing queries to the pool using new connection
module.exports.queryWithConnect = function (text, values, callback) {
    if (env == 'development')
        console.log('query:', text, values);

    pool.connect(function (err, client, done) {
        if (err)
            return console.error('error fetching client from pool', err);

        //use the client for executing the query
        client.query(text, values, function (err, result) {
            //call `done(err)` to release the client back to the pool (or destroy it if there is an error)
            done(err);

            if (err) {
                console.error('error running query', err);
            }

            callback(err, result);
            client.end();
        });
    });
};

// the pool also supports checking out a client for
// multiple operations, such as a transaction
module.exports.connect = function (callback) {
    return pool.connect(callback);
};