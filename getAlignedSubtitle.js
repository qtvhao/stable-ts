var levenshtein = require('fast-levenshtein');
let removeMd = require('remove-markdown');
let getAlignedSubtitle = function (audio, alignedSubtitle) {
    let videoScript = audio.data.videoScript;
    let segments = alignedSubtitle.segments;
    let currentSegment = 0;
    videoScript = videoScript.map(x => {
        x.translated = removeMd(x.text);
        return x;
    });
    for (let i = 0; i < videoScript.length; i++) {
        let translated = videoScript[i].translated;
        let bestMatch = 100000;
        let aligned
        let last200
        let alignedAt

        for (let j = currentSegment; j < segments.length; j++) {
            let segmentsFromCurrent = segments.slice(currentSegment, j);
            if (i === videoScript.length - 1) {
                segmentsFromCurrent = segments.slice(currentSegment);
            }
            let segmentsFromCurrentText = segmentsFromCurrent.map(x => x.text).join('');
            let translatedLast200 = translated.slice(-200);
            let segmentsFromCurrentLast200 = segmentsFromCurrentText.slice(-200);
            let distance = levenshtein.get(translatedLast200, segmentsFromCurrentLast200);
            if (distance < bestMatch) {
                bestMatch = distance;
                alignedAt = j;
                aligned = segmentsFromCurrent;
                last200 = segmentsFromCurrentLast200;
            } else {
                // break;
            }
        }
        aligned = aligned.map(x => {
            return {
                start: x.start,
                end: x.end,
                text: x.text,
                words: x.words.map(y => {
                    return {
                        word: y.word,
                        start: y.start,
                        end: y.end,
                    };
                }),
            };
        });
        currentSegment = alignedAt;
        aligned.sort((a, b) => a.start - b.start);
        let alignedStart = aligned[0].start;
        let alignedEnd = aligned[aligned.length - 1].end;
        if (alignedStart === alignedEnd) {
            console.log('alignedStart === alignedEnd', alignedStart, alignedEnd);
            throw new Error('alignedStart === alignedEnd');
        }
        videoScript[i].aligned = aligned;
        videoScript[i].segmentsFromCurrentLast200 = last200;
        // console.log('bestMatch', bestMatch);
        // console.log('-'.repeat(100));
        // console.log('aligned', aligned);
        // console.log('-'.repeat(100));
        // console.log('bestMatchIndex', bestMatchIndex);
        // console.log('segmentsFromCurrent', segmentsFromCurrent);
        // console.log('translated', translated);
        // break;
    }
    // console.log(videoScript);

    return videoScript;
}

module.exports = {
    getAlignedSubtitle,
};
