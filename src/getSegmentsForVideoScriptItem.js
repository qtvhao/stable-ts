let levenshtein = require('fast-levenshtein');
let removeSpecialCharacters = require('./removeSpecialCharacters.js');
function getLevenshteinDistance(text1, text2) {
    let slicedText1 = text1.slice(-100);
    let slicedText2 = text2.slice(-100);
    return levenshtein.get(slicedText1, slicedText2);
}

function getSegmentsForVideoScriptItem(videoScriptItem, segments) {
    let bestMatchSegment = segments
        .map(x => {
            x.text = removeSpecialCharacters(x.text).trim();
            return x;
        })
        .map((_segment, i) => {
            let segmentsFromStart = segments.slice(0, i);
            let segmentsFromStartText = segmentsFromStart.map(x => x.text).join(' ');

            let levenshteinDistance = getLevenshteinDistance(videoScriptItem.text, segmentsFromStartText);
            return {
                levenshteinDistance,
                segmentsFromStart,
            };
        })
        .reduce((best, current) => {
            return best.levenshteinDistance < current.levenshteinDistance ? best : current;
        }, {
            levenshteinDistance: Infinity,
            segmentsFromStart: [],
        });
    if (0 === bestMatchSegment.segmentsFromStart.length) {
        throw new Error('No aligned segments for video script item.');
    }

    return bestMatchSegment.segmentsFromStart;
}

module.exports = getSegmentsForVideoScriptItem;
