let getAlignedVideoScriptItem = require('./getAlignedVideoScriptItem.js');
function getCorrectedVideoScriptIndex(videoScript, segments) {
    let correctedVideoScript = [];
    let segmentIndex = 0;
    for (let i = 0; i < videoScript.length; i++) {
        if (i > 1) {
            break;
        }
        let slicedSegments = segments.slice(segmentIndex);
        if (slicedSegments.length === 0) {
            console.log('slicedSegments.length === 0', i, segmentIndex, segments);
            throw new Error('slicedSegments.length === 0');
            // break;
        }
        let alignedVideoScriptItem = getAlignedVideoScriptItem(
            videoScript,
            slicedSegments,
            i
        );
        segmentIndex += alignedVideoScriptItem.length;
        let alignedStart = alignedVideoScriptItem[0].start;
        let alignedEnd = alignedVideoScriptItem[alignedVideoScriptItem.length - 1].end;
        if (alignedStart === alignedEnd) {
            return correctedVideoScript;
        }
        correctedVideoScript.push({
            ...videoScript[i],
            start: alignedStart,
            end: alignedEnd,
            aligned: alignedVideoScriptItem,
        });
    }

    return correctedVideoScript;
}

module.exports = getCorrectedVideoScriptIndex;

