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
function checkAligned(alignFileTxt, outputFile, audio, audioFile) {
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

    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));
    let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    // console.log('aligned', aligned);
    for (let i = 0; i < aligned.length; i++) {
        let alignedItem = aligned[i];
        expect(alignedItem.aligned).toBeDefined();
        // 
        let firstAligned = alignedItem.aligned[0];
        let lastAligned = alignedItem.aligned[alignedItem.aligned.length - 1];
        console.log('firstAligned', firstAligned, 'lastAligned', lastAligned);
        let firstAlignedStart = firstAligned.start;
        let lastAlignedEnd = lastAligned.end;
        if (firstAlignedStart === lastAlignedEnd) {
            console.log('firstAlignedStart === lastAlignedEnd', firstAligned, lastAligned);
            throw new Error('firstAlignedStart === lastAlignedEnd on ' + i + ' / ' + aligned.length);
        }
    }
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
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-2639383328.json');
    let audioFile = '/align-input/synthesize-result-2639383328.aac';
    checkAligned(alignFileTxt, outputFile, audio, audioFile)
});