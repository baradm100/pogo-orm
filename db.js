const {
    Pool,
    Client
} = require('pg');
// create a config to configure both pooling behavior and client options
const env = process.env.NODE_ENV || 'development';
const config = require('./config/db.json')[env];

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bar_development',
    password: 'Aa123456',
})

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
module.exports.queryWithoutConnect = function (text, values, callback) {
    if (env === 'development')
        console.log('query:', text, values);

    return pool.query(text, values, callback);
};

//export the query method for passing queries to the pool using new connection
module.exports.query = function (text, values, callback) {
    if (env === 'development')
        console.log('query:', text, values);

    pool.connect().then(client => {
        return client.query(text, values)
            .then(res => {
                client.release();
                callback(undefined, res);
            })
            .catch(e => {
                client.release();
                callback(e, undefined);
            });
    });
};

// the pool also supports checking out a client for
// multiple operations, such as a transaction
module.exports.connect = function (callback) {
    return pool.connect(callback);
};


function exitHandler(options, err) {
    if (options.cleanup) {
        pool.end();
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
    cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
    exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
    exit: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
    exit: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
    exit: true
}));