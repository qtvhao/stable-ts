let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let removeMd = require('remove-markdown');
let fs = require('fs');
let path = require('path');
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
function alignVideoScript(videoScript, audioFile) {
    let outputFile = synthesizeAudio(audioFile, videoScript);

    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    // console.log('alignedSubtitle', alignedSubtitle);
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    // 
    let segments = alignedSubtitle.segments;
    for (let i = 0; i < segments.length; i++) {
        let segment = segments[i];
        let start = segment.start;
        let end = segment.end;
        // 
        console.log('start', start, 'end', end);
        let floatStart = parseFloat(start);
        let floatEnd = parseFloat(end);
        if (floatStart === floatEnd) {
            console.log('floatStart === floatEnd', floatStart, floatEnd);
            let correctedVideoScriptItems = getCorrectedVideoScriptIndex(videoScript, segments);
            let lastCorrectedVideoScriptItem = correctedVideoScriptItems[correctedVideoScriptItems.length - 1];
            let lastCorrectedVideoScriptItemEnd = lastCorrectedVideoScriptItem.end;
            let lastCorrectedVideoScriptItemStart = lastCorrectedVideoScriptItem.start;
            if (lastCorrectedVideoScriptItemStart === lastCorrectedVideoScriptItemEnd) {
                throw new Error('lastCorrectedVideoScriptItemStart === lastCorrectedVideoScriptItemEnd, segment');
            }
            let uncorrectedVideoScriptItems = videoScript.slice(correctedVideoScriptItems.length);
            return [
                ...correctedVideoScriptItems,
                ...alignVideoScript(uncorrectedVideoScriptItems, audioFile),
            ];
        }
    }
    // return alignedSubtitle;
}
function checkAligned(job, audioFile) {
    let videoScript = job.data.videoScript;

    videoScript = alignVideoScript(videoScript, audioFile);
    job.data.videoScript = videoScript;

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