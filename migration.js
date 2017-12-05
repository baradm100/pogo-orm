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
    // TODO comment
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

    // TODO comment
    static run() {
        let currentMigrations = fs.readdirSync(path.resolve(__dirname, 'migrations')),
            valueClause = [];

        if (currentMigrations.length === 0)
            valueClause.push('NULL');
        else
            for (let i = 1; i <= currentMigrations.length; i++) {
                valueClause.push('$' + i);
            }

        pool.query('SELECT migrations.file_name FROM migrations WHERE migrations.file_name IN (' + valueClause.join(',') + ')', currentMigrations, function (err, res) {
            if (err)
                throw err;

            let pastMigrations = res.rows.map((row) => {
                    return row.file_name;
                }),
                migrtionsToRun = currentMigrations.difference(pastMigrations),
                i = 0;

            let runOneMigration = function () {
                if (i < migrtionsToRun.length) {
                    let startTime = Date.now(),
                        migration = migrtionsToRun[i],
                        mirgrationPath = path.resolve(__dirname, 'migrations', migration);

                    console.log('================ Starting: ' + migration + ' ================');

                    execFile('node', [mirgrationPath], (error, stdout, stderr) => {
                        if (error)
                            throw error;

                        console.log(stdout); // outputing migration output

                        console.log('================ Done: ' + migration + ' In ' + (Date.now() - startTime) / 1000 + ' sec. ================');

                        Migration.create({
                            file_name: migration
                        }).then(() => {
                            i++;

                            runOneMigration();
                        }).catch((err) => {
                            throw err;
                        });
                    });
                }
            };

            runOneMigration(); // Strat run recureive function
        });
    }
    // TODO comment
    static newMigration(migrationName) {
        if (!migrationName)
            throw 'Migration name is missing!';

        let fullMigrationName = (new Date).toISOString().slice(0, 19).replace(/:/g, "") + '_' + migrationName + '.js',
            mirgrationPath = path.resolve(__dirname, 'migrations', fullMigrationName);

        var a = fs.openSync(mirgrationPath, 'w')
        fs.closeSync(a); // creating empty file

        console.log("The migration was created!");
        return mirgrationPath;
    }
}