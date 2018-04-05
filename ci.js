#!/usr/bin/env node

const Migration = require('./migration');
const fs = require('fs');
const path = require('path');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
} else if (process.argv[2] === "migration") {
    if (process.argv[3] === "run") {
        Migration.init(runMigration);
    } else if (process.argv[3] === "new") {
        Migration.init(() => createMigration(process.argv[4]));
    } else if (!process.argv[3]) {
        // Defaults to run the migration
        Migration.init(runMigration);
    }
} else if (process.argv[2] === "model" && process.argv[3] === "new") {
    Migration.init(() => createModel(process.argv[4]));
} else {
    console.log("Wrong arguments, look at the help comment: -h/--help :) \n");
    printHelp();
}


/**
 * Creates new model file and create migrations
 * @param {String} modelName
 */
function createModel(modelName) {
    if (!modelName) {
        console.log("Model name is missing");
        return;
    }

    if (!fs.existsSync(path.resolve(__dirname, 'models')))
        fs.mkdirSync(path.resolve(__dirname, 'models'));

    // Creating model file
    let basicModelCode = "// Class that was auto created by the ORM";
    basicModelCode += "\n";
    basicModelCode += "const Model = require('orm').Model;";
    basicModelCode += "\n\n";
    basicModelCode += "module.exports = class " + modelName + " extends Model {";
    basicModelCode += "\n\n";
    basicModelCode += "}";

    fs.writeFileSync(path.resolve(__dirname, 'models', modelName + '.js'), basicModelCode);

    // Creating basic migration
    let migrationPath = Migration.newMigration('create_' + modelName);
    let basicMigrationCode = "// Migration that was auto created by the ORM";
    basicMigrationCode += "\n";
    basicMigrationCode += "const Model = require('orm').Model;";
    basicMigrationCode += "\n";
    basicMigrationCode += "const DBType = require('orm').DBType;";
    basicMigrationCode += "\n";
    basicMigrationCode += "const " + modelName + " = require('.models/" + modelName + "');";
    basicMigrationCode += "\n\n";
    basicMigrationCode += modelName + ".createTable({}); // TODO Add columns!";
    fs.writeFileSync(migrationPath, basicMigrationCode);

    console.log('The model was created!')
}

/**
 * Creates new migration
 * @param {String} migrationName
 */
function createMigration(migrationName) {
    if (!migrationName) {
        console.log("Migration name is missing");
        return;
    }
    console.log("Creating new migration: " + migrationName);
    Migration.newMigration(migrationName);
}

/**
 * Run migrations
 */
function runMigration() {
    console.log("Migration is running...");
    Migration.run();
}

/**
 * Print help
 */
function printHelp() {
    let printText = "Usage: orm <action> <params> [options]";
    printText += "\n";
    printText += "\n";
    printText += "Actions:";
    printText += "\n";
    printText += "\t migration \t run|new \t <migration name>";
    printText += "\n";
    printText += "\t model \t\t new \t\t <model name>";
    printText += "\n";
    printText += "\n";
    printText += "Options:";
    printText += "\n";
    printText += "  -h, --help  Print help";

    console.log(printText);
}