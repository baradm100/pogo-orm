ORM
=========================================
Basic ORM build for and around postgres.

Served with :heart: to the amazing community of node and pg.

## Table of Contents
* [Install](#install)
* [Features](#features)
    * [Models](#models)
        * [Creating new model](#creating-new-model)
    * [Query](#query)
        * [.where](#where)
        * [.whereNot](#wherenot)
        * [.gatherWhere](#gatherwhere)
        * [.gatherWhereNot](#gatherwherenot)
        * [.gatherSelect](#gatherselect)
        * [.execute](#execute)
    * [Migrations](#migrations)
    * [Envs](#envs)
* [TODOS](#todos)
* [How to Contribute](#how-to-contribute)
* [Authors](#authors)
* [License](#license)
## Install
With [npm](https://npmjs.org/) installed, run

```
$ npm install orm
```

## Features
* [Models](#Models).
* [Query](#Query): Basic query using objects instead of SQL.
* [Migrations](#Migrations): create and run migrations.
* [Envs](#Envs): Have different DB configs for every environment.

### Models
Models are representation of the data in the DB, you can add instance and class functions (```static```) to the model.
The ORM handles creating, finding, querying, creating table and creating the model itself.
After the query is done, the ORM will cast the result into the model's instance.
#### Creating new model
To create the new model, you need to run the following command:
```
$ orm model new model_name
```
The commend creates the new model and migration to create the new model's table.
#### Example
For the next examples we will be creating "User" model.
##### Creating the User model
Let's create "User" model, for doing that we need to run the following command:
```
$ orm model new User
```
##### The model itself
Let's look in the model's code:
```javascript
// Requiring the relevant packages
const bcrypt = require('bcryptjs'); // package that hashes passwords
const Model = require('orm').Model;

module.exports = class User extends Model {
    /**
     * Overwriting the Model#create function to hash the user's password (using bcryptjs) before creating the user and then calling the Model#create function
     * @param {Object} attrs
     * @return {Promise}
     */
    static create(attrs) {
        let superMe = super; // Saving the super because of the scope

        return new Promise(function (resolve, reject) {
            bcrypt.genSalt((saltError, salt) => {
                if (saltError)
                    reject(hashError);

                return bcrypt.hash(attrs.password, salt, (hashError, hashPassword) => {
                    if (hashError)
                        reject(hashError);

                    // replace a password string with hash value
                    attrs.password = hashPassword;
                    superMe.create(attrs).then(resolve).catch(reject); // calls the Model create
                });
            });
        });
    }
}
```

### Query
In the ORM there is a few types of built in queries:
* [where](#.where) - immediately executing basic where sql query
* [where not](#.whereNot) - immediately executing basic where sql query
* [where](#.gatherWhere) - gathers where (but not immediately executing)
* [where not](#.gatherWhereNot) - gathers where not (but not immediately executing)
* [select](#.gatherSelect) - set select (but not immediately executing)
* [execute](#.execute) - executing the gathered query (where, whereNot and select) 

#### Immediately excecated queries:
The ORM creates and executes the query by generating value clause (so no risk for SQL injection).

##### .where
Creates where query, can receive Object (best practice) and return ```Promise```, for example:
```javascript
User.where({name: 'Bar', is_awesome: true}).then((res) => {
    console.log(res);
}).catch((err)=> {
    throw err
});
```
The SQL that was generated:
```SQL
SELECT * FROM 'users' WHERE name="Bar" AND is_awesome="t"
```

#### .whereNot
Creates where not query, can receive Object (best practice) and return ```Promise```, for example:
```javascript
User.whereNot({name: 'Bar',is_awesome: true}).then((res) => {
    console.log(res);
}).catch((err)=> {
    throw err
});
```
The SQL that was generated:
```SQL
SELECT * FROM 'users' WHERE NOT name="Bar" AND NOT is_awesome="t"
```

#### Gather Query
You can gather query to allow you the create complex queries, to run the query you need to call ```.execute()```.
#### .gatherWhere
Adds to the class' gathered query where
```javascript
User.gatherWhere({name: 'Barrrr'});
User.gatherWhere({is_awesome: true});
User.gatherWhere({name: 'Bar'});
// The where QueryData is: {name: 'Bar', is_awesome: true}
```
#### .gatherWhereNot
Adds to the class' gathered query whereNot
```javascript
User.gatherWhereNot({name: 'Barrrr'});
User.gatherWhereNot({is_awesome: false});
User.gatherWhereNot({name: 'Aviv'});
// The whereNot QueryData is: {name: 'Aviv', is_awesome: false}
```
#### .gatherSelect
Adds to the class' gathered query select
```javascript
User.gatherSelect(['id']);
// The select QueryData is: ['id']
```

#### .execute
Executes the query, return ```Promise``` and clears the backed up queryData:
```javascript
User.execute().then((res) =>{
    console.log(res);
}).catch((err)=> {
    throw err
});
```
The SQL that was generated:
```SQL
SELECT id FROM 'users' WHERE Name="Bar" AND is_awesome="t" AND NOT name="Aviv" AND NOT is_awesome="f"
```
#### .clearQueryData
Manually clears the class backup queries.
>Best practice is not to use this. When running .execute the queryData is automatically cleared

### Migrations
Create new migration (will create new file with the time of creation and migration name):
```
$ orm migration new migration_name
```
Running migration (will run only the ones that haven't been executed before):
```
$ orm migration run
# OR
$ orm migration
```

## Envs
Setting up envs:
```JSON
{
  "development": {
    "username": "postgres",
    "password": "postgres",
    "database": "database_development",
    "host": "127.0.0.1"
  },
  "test": {
    "username": "postgres",
    "password": "postgres",
    "database": "database_test",
    "host": "127.0.0.1"
  }
}
```

## TODOS
* Example project.
* Tests.
* Joins.
* Left joins.
* WhereOr.
* Check and prevent SQL injection.

## How to Contribute
1. Fork
2. Commit to new branch (with well document commit messages)
3. Open PR
4. ?
5. Profit

## Authors
* [Bar Admoni](https://github.com/baradm100)

## License
Apache License 2.0, please see [LICENSE](./LICENSE) for details.

Copyright (c) 2017 Bar Admoni