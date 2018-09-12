const Model = require('./model');

class User extends Model {
}

let b = User.where({
    id: 1
});

b.execute().then((rows) => console.log(rows[0]));