const fs = require('fs');
const path = require('path');
const execFile = require('child_process').execFile;
const pool = require('./db');
const Model = require('./model');
const {
    buildStatement,
    DBType
} = require('./common');

module.exports = class Migration extends Model {
    /**
     * Initialling process of the Migration, creating table if not exists then calling callback
     * @param {Function} callback
     */
    static init(callback) {
        this.createTable({
            file_name: DBType.string
        }).then((res) => {
            // Creates migration folders
            if (!fs.existsSync(path.resolve(__dirname, 'migrations')))
                fs.mkdirSync(path.resolve(__dirname, 'migrations'));
            callback();
        }).catch((err) => {
            throw err
        });
    }

    /**
     * Run migrations one after another
     */
    static run() {
        let currentMigrations = fs.readdirSync(path.resolve(__dirname, 'migrations')),
            valueClause = [];

        if (currentMigrations.length === 0)
            valueClause.push('NULL'); // if there is no migrations in the project's folder
        else
            for (let i = 1; i <= currentMigrations.length; i++)
                valueClause.push('$' + i);

        pool.query('SELECT migrations.file_name FROM migrations WHERE migrations.file_name IN (' + valueClause.join(',') + ')', currentMigrations, function (err, res) {
            if (err)
                throw err;

            let pastMigrations = res.rows.map((row) => row.file_name),
                migrationsToRun = currentMigrations.difference(pastMigrations), // gets the migrations that need to run
                i = 0;

            // creates function that run on the current migration by +i+
            let runOneMigration = function () {
                if (i < migrationsToRun.length) {
                    let startTime = Date.now(),
                        migration = migrationsToRun[i],
                        migrationPath = path.resolve(__dirname, 'migrations', migration);

                    console.log('================ Starting: ' + migration + ' ================');

                    execFile('node', [migrationPath], (error, stdout, _) => {
                        if (error)
                            throw error;

                        console.log(stdout); // outputting migration output

                        console.log('================ Done: ' + migration + ' In ' + (Date.now() - startTime) / 1000 + ' sec. ================');

                        Migration.create({
                            file_name: migration
                        }).then(() => {
                            // only after running the migration and creating new record moving to the next migrations
                            i++;
                            runOneMigration();
                        }).catch((err) => {
                            throw err;
                        });
                    });
                }
            };

            runOneMigration(); // Start run recursive function
        });
    }

    /**
     * Initialling process of the Migration, creating table if not exists then calling callback
     * @param {String} migrationName
     * @returns {String} new migration path
     */
    static newMigration(migrationName) {
        if (!migrationName)
            throw 'Migration name is missing!';

        let dateByFormat = (new Date).toISOString().slice(0, 19).replace(/:/g, ""), // current date by the format yyyy-MM-ddTmilliseconds
            fullMigrationName = dateByFormat + '_' + migrationName + '.js',
            migrationPath = path.resolve(__dirname, 'migrations', fullMigrationName);

        let emptyFile = fs.openSync(migrationPath, 'w');
        fs.closeSync(emptyFile); // creating empty file

        console.log("The migration was created!");
        return migrationPath;
    }
}