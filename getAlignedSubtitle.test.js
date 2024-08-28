let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let fs = require('fs');

function getInput(alignFile) {
    let alignFileContent = fs.readFileSync(alignFile, 'utf8');
    let alignFileParsed = JSON.parse(alignFileContent);
    let texts = alignFileParsed.data.videoScript.map(x => x.text).join('.\n');
    console.log('texts', texts);
    let alignFileTxt = '/tmp/align-1484178056.txt';
    fs.writeFileSync(alignFileTxt, texts);
    let outputFile = '/tmp/output-1484178056.json';

    return {
        alignFileTxt,
        outputFile,
        audio: alignFileParsed,
    };
}
let model = 'tiny';
let language = 'vi';
test('test alignment', () => {
    let {
        alignFileTxt,
        outputFile,
        audio,
    } = getInput('/align-input/align-1484178056.json');
    let audioFile = '/app/storage/audio/synthesize-result-1484178056.mp3';
    child_process.execFileSync('stable-ts', [
        audioFile, 
        '--model', model, 
        '--language', language, 
        '--align', alignFileTxt, 
        '--overwrite', 
        '--output', outputFile
    ], {
        stdio: 'inherit',
    });

    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    console.log('aligned', aligned);
    for (let i = 0; i < aligned.length; i++) {
        let alignedItem = aligned[i];
        expect(alignedItem.aligned).toBeDefined();
        // 
        // console.log('alignedItem', alignedItem.aligned);
        let firstAligned = alignedItem.aligned[0];
        let lastAligned = alignedItem.aligned[alignedItem.aligned.length - 1];
        console.log('firstAligned', firstAligned.start, 'lastAligned', lastAligned.end);
        let firstAlignedStart = firstAligned.start;
        let lastAlignedEnd = lastAligned.end;
        if (firstAlignedStart === lastAlignedEnd && i !== aligned.length - 1) {
            console.log('firstAlignedStart === lastAlignedEnd', firstAlignedStart, lastAlignedEnd);
            throw new Error('firstAlignedStart === lastAlignedEnd on ' + i + ' / ' + aligned.length);
        }
    }
    // expect(aligned).toBeDefined();
});
