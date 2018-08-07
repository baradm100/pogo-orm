function toUnderscore(str) {
    return str.replace(/\s+/g, '_').toLowerCase();
}


module.exports = {
    toUnderscore
}