let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let removeMd = require('remove-markdown');
let fs = require('fs');
let path = require('path');
var levenshtein = require('fast-levenshtein');
console.log('='.repeat(300));

function removePunctuation(text) {
    return text.replace(/[\.,\),\(),\",\/,-,\?,\!,\:,\;,\n*]/g, ' ').replace(/\s+/g, ' ');
}
function getInput(alignFile) {
    let alignFilename = path.basename(alignFile);
    let alignFileContent = fs.readFileSync(alignFile, 'utf8');
    let alignFileParsed = JSON.parse(alignFileContent);
    let texts = alignFileParsed.data.videoScript.map(x => removeMd(x.text)).join('\n');
    texts = removePunctuation(texts);
    let alignFileTxt = '/align-input/' + alignFilename + '.txt';
    fs.writeFileSync(alignFileTxt, texts);
    let outputFile = '/align-output/output-' + alignFilename + '.json';

    return {
        alignFileTxt,
        outputFile,
        audio: alignFileParsed,
    };
}
let model = process.env.STABLE_TS_MODEL;
let language = 'vi';
let alignOutputDir = '/align-output/';
function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
function synthesizeAudio(audioFile, videoScript) {
    let alignTxtContent = videoScript.map(x => x.text).join('\n');
    let djb2Hash = djb2(alignTxtContent);
    let outputFile = path.join(alignOutputDir, 'output-' + djb2Hash + '.json');
    if (fs.existsSync(outputFile)) {
        return outputFile;
    }
    let alignFileTxt = path.join(alignOutputDir, 'output-' + djb2Hash + '.txt');
    fs.writeFileSync(alignFileTxt, alignTxtContent);

    child_process.execFileSync('stable-ts', [
        audioFile,
        '--model', model,
        '--language', language,
        '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ], {
        stdio: 'inherit',
    });

    return outputFile;
}
function getCorrectedVideoScriptIndex(videoScript, segments) {
    let currentSegment = 0;
    let correctedVideoScript = [];
    for (let i = 0; i < videoScript.length; i++) {
        let bestMatch = 100000;
        let alignedVideoScriptItem;
        for (let j = currentSegment; j < segments.length; j++) {
            let segmentsFromCurrent = segments.slice(currentSegment, j);
            let segmentsFromCurrentText = segmentsFromCurrent.map(x => x.text).join(' ');
            let levenshteinDistance = levenshtein.get(segmentsFromCurrentText, videoScript[i].text);
            if (levenshteinDistance < bestMatch) {
                bestMatch = levenshteinDistance;
                alignedVideoScriptItem = segmentsFromCurrent;
            }
        }
        alignedVideoScriptItem = alignedVideoScriptItem.map(x => {
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
        }).reduce((acc, x) => {
            acc.push(x);
            return acc;
        }, []);
        let last200 = alignedVideoScriptItem.map(x => x.text).join(' ').slice(-200);
        let alignedStart = alignedVideoScriptItem[0].start;
        let alignedEnd = alignedVideoScriptItem[alignedVideoScriptItem.length - 1].end;
        if (alignedStart === alignedEnd) {
            console.log('last200', last200);
            return correctedVideoScript;
        }
        alignedVideoScriptItem.start = alignedStart;
        alignedVideoScriptItem.end = alignedEnd;
        correctedVideoScript.push(alignedVideoScriptItem);
        currentSegment = i;
    }
    console.log('all of correctedVideoScript has alignedStart !== alignedEnd');

    return correctedVideoScript;
}
function alignVideoScript(videoScript, audioFile) {
    let outputFile = synthesizeAudio(audioFile, videoScript);
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    // 
    let segments = alignedSubtitle.segments;

    let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);
    if (correctedVideoScriptItems.length === videoScript.length) {
        console.log('correctedVideoScriptItems.length === videoScript.length', correctedVideoScriptItems.length, videoScript.length);
        return correctedVideoScriptItems;
    }

    let uncorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);

    return [
        ...correctedVideoScriptItems,
        ...alignVideoScript(uncorrectedVideoScriptItems, audioFile),
    ];
}
function checkAligned(job, audioFile) {
    let videoScript = job.data.videoScript;

    videoScript = alignVideoScript(videoScript, audioFile);
    job.data.videoScript = videoScript;
    let lastVideoScriptItem = videoScript[videoScript.length - 1];
    let lastVideoScriptItemEnd = lastVideoScriptItem.end;
    let lastVideoScriptItemStart = lastVideoScriptItem.start;
    if (typeof lastVideoScriptItemStart === 'undefined' || typeof lastVideoScriptItemEnd === 'undefined') {
        throw new Error('lastVideoScriptItemStart or lastVideoScriptItemEnd is undefined');
    }

    if (lastVideoScriptItemStart === lastVideoScriptItemEnd) {
        throw new Error('lastVideoScriptItemStart === lastVideoScriptItemEnd ' + lastVideoScriptItemStart + ' === ' + lastVideoScriptItemEnd + ' , segment index: ' + (videoScript.length - 1));
    }

    return job;
    // let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    // let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    // // console.log('aligned', aligned);
    // for (let i = 0; i < aligned.length; i++) {
    //     let alignedItem = aligned[i];
    //     expect(alignedItem.aligned).toBeDefined();
    //     // 
    //     let firstAligned = alignedItem.aligned[0];
    //     let lastAligned = alignedItem.aligned[alignedItem.aligned.length - 1];
    //     console.log('firstAligned', firstAligned, 'lastAligned', lastAligned);
    //     let firstAlignedStart = firstAligned.start;
    //     let lastAlignedEnd = lastAligned.end;
    //     if (firstAlignedStart === lastAlignedEnd) {
    //         console.log('firstAlignedStart === lastAlignedEnd', firstAligned, lastAligned);
    //         throw new Error('firstAlignedStart === lastAlignedEnd on ' + i + ' / ' + aligned.length);
    //     }
    // }
}
test('test alignment', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-1484178056.json');
    let audioFile = '/align-input/synthesize-result-1484178056.mp3';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
    // expect(aligned).toBeDefined();
});
test('test alignment 2', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-2544651730.json');
    let audioFile = '/align-input/synthesize-result-2544651730.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});
test('test alignment 3', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-1925143408.json');
    let audioFile = '/align-input/synthesize-result-1925143408.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});

test('test alignment 4', () => {
    let {
        // alignFileTxt,
        // outputFile,
        audio,
    } = getInput('/align-input/align-2461984885.json');
    let audioFile = '/align-input/synthesize-result-2461984885.aac';
    checkAligned(audio, audioFile)
});