let levenshtein = require('fast-levenshtein');
let removeSpecialCharacters = require('./removeSpecialCharacters.js');
function getLevenshteinDistance(text1, text2) {
    return levenshtein.get(text1, text2);
}

function getSegmentsForVideoScriptItem(videoScriptItem, segments) {
    segments = segments.slice();
    segments = segments
        .map(x => {
            x.text = removeSpecialCharacters(x.text).trim();
            return x;
        });
    let bestMatchSegment = segments
        .map((_segment, i) => {
            let segmentsFromStart = segments.slice(0, i);
            let segmentsFromStartText = segmentsFromStart.map(x => x.text).join(' ');
            let videoScriptItemTextSliced = videoScriptItem.text.slice(-100).replace(/\.$/, ' ').trim() + '.';
            let segmentsFromStartTextSliced = segmentsFromStartText.slice(-100).replace(/\.$/, ' ').trim() + '.';

            let levenshteinDistance = getLevenshteinDistance(videoScriptItemTextSliced, segmentsFromStartTextSliced);
            return {
                levenshteinDistance,
                segmentsFromStart,
                videoScriptItemTextSliced,
                segmentsFromStartTextSliced,
            };
        })
        .filter(x => {
            return x.segmentsFromStart.length > 0;
        })
        .reduce((best, current) => {
            let currentIsBetter = current.levenshteinDistance < best.levenshteinDistance;
            if (currentIsBetter) {
                console.log(
                    current.videoScriptItemTextSliced, '='.repeat(10),
                    current.segmentsFromStartTextSliced, '='.repeat(10), 
                    current.levenshteinDistance);
            }

            return currentIsBetter ? current : best;
        }, {
            levenshteinDistance: Infinity,
            segmentsFromStart: [],
        });
    // if (0 === bestMatchSegment.segmentsFromStart.length) {
    //     throw new Error('No aligned segments for video script item.');
    // }

    return bestMatchSegment.segmentsFromStart;
}

module.exports = getSegmentsForVideoScriptItem;
