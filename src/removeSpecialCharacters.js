let removeMd = require('remove-markdown');
function removeSpecialCharacters(text) {
    return removeMd(text)
        .replace(/[:,\'\"\?\!\;\.\(\)\[\]\{\}\/\n]/g, ' ')
        .replace(/#+/g, ' ')
        .replace(/\*+/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
}

module.exports = removeSpecialCharacters;
