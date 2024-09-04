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
        let alignedVideoScriptItem = segments.slice(currentSegment, currentSegment + 1);
        if (typeof alignedVideoScriptItem[0] === 'undefined') {
            return correctedVideoScript;
        }
        let j = currentSegment + 1;
        for (; j < segments.length; j++) {
            let segmentsFromCurrent;
            segmentsFromCurrent = segments.slice(currentSegment, j);
            if (segmentsFromCurrent.length === 0) {
                throw new Error('segmentsFromCurrent.length === 0, i: ' + i + ', j: ' + j + ', segments: ' + segments.length);
            }
            let segmentsFromCurrentText = segmentsFromCurrent.map(x => x.text).join('').trim();
            let endsWithColonOrComma = segmentsFromCurrentText.endsWith(',') || segmentsFromCurrentText.endsWith(':');
            if (endsWithColonOrComma) {
                continue;
            }
            let lastSegmentFromCurrent = segmentsFromCurrent[segmentsFromCurrent.length - 1];
            let lastSegmentFromCurrentDuration = lastSegmentFromCurrent.end - lastSegmentFromCurrent.start;
            if (lastSegmentFromCurrentDuration < 0.5) {
                continue;
            }
            // 
            let levenshteinDistance = levenshtein.get(segmentsFromCurrentText, videoScript[i].text);
            if (levenshteinDistance < bestMatch) {
                bestMatch = levenshteinDistance;
                alignedVideoScriptItem = segmentsFromCurrent;
            }
        }
        if (typeof alignedVideoScriptItem[0] === 'undefined') {
            console.log('alignedVideoScriptItem is undefined', i);
            throw new Error('alignedVideoScriptItem is undefined');
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
        });
        let alignedStart = alignedVideoScriptItem[0].start;
        let alignedEnd = alignedVideoScriptItem[alignedVideoScriptItem.length - 1].end;
        if (alignedStart === alignedEnd) {
            return correctedVideoScript;
        }
        correctedVideoScript.push(alignedVideoScriptItem);
        currentSegment = j;
    }
    console.log('all of correctedVideoScript has alignedStart !== alignedEnd');

    return correctedVideoScript;
}
function getTimestampForFFMpeg(seconds) {
    // let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let seconds1 = Math.floor(seconds % 60);
    let miliseconds = Math.floor((seconds % 1) * 1000);
    // pad it
    minutes = minutes.toString().padStart(2, '0');
    seconds1 = seconds1.toString().padStart(2, '0');
    miliseconds = miliseconds.toString().padStart(3, '0');
    return `${minutes}:${seconds1}.${miliseconds}`;
}
function alignVideoScript(videoScript, audioFile) {
    let outputFile = synthesizeAudio(audioFile, videoScript);
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    // 
    let segments = alignedSubtitle.segments;

    let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);
    if (correctedVideoScriptItems.length === videoScript.length) {
        return correctedVideoScriptItems;
    }

    let uncorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);

    if (uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length) {
        throw new Error('uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');
    }
    // 
    let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1];
    let lastCorrectedSegment = lastCorrectedVideoScriptItem[lastCorrectedVideoScriptItem.length - 1];
    let lastCorrectedSegmentEnd = lastCorrectedSegment.end;
    let cutAudioFile = '/align-output/cut-audio-' + lastCorrectedSegmentEnd + '.mp3';
    let timestamp = getTimestampForFFMpeg(lastCorrectedSegmentEnd);
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-ss', timestamp,
        '-c', 'copy',
        '-y',
        cutAudioFile,
    ]);
    console.log('timestamp', timestamp);
    process.exit(0);
    throw new Error('uncorrectedVideoScriptItems.length + correctedVideoScriptItems.length !== videoScript.length');

    return [
        ...correctedVideoScriptItems,
        ...alignVideoScript(uncorrectedVideoScriptItems, audioFile),
    ];
}
function checkAligned(job, audioFile) {
    let videoScript = job.data.videoScript;
    // convert to mp3
    let audioFileMp3 = audioFile.replace('.aac', '.mp3');
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-y',
        audioFileMp3,
    ]);
    audioFile = audioFileMp3;

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
    } else {
        console.log('All aligned');
        console.log('videoScript', videoScript.map(x => {
            return x.map(x => x.text).join('');
        })[0])
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