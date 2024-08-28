let { getAlignedSubtitle } = require('./getAlignedSubtitle.js');
let child_process = require('child_process');
let fs = require('fs');

test('test alignment', () => {
    let audioFile = '/app/storage/audio/synthesize-result-1484178056.mp3';
    let alignFile = '/align-input/align-1484178056.json';
    let alignFileContent = fs.readFileSync(alignFile, 'utf8');
    let alignFileParsed = JSON.parse(alignFileContent);
    let texts = alignFileParsed.data.videoScript.map(x => x.text).join('.\n');
    console.log('texts', texts);
    let alignFileTxt = '/tmp/align-1484178056.txt';
    fs.writeFileSync(alignFileTxt, texts);
    let outputFile = '/tmp/output-1484178056.json';
    let model = 'tiny';
    let language = 'vi';
    let executedFileSync = child_process.execFileSync('stable-ts', [
        audioFile, 
        '--model', model, 
        '--language', language, 
        '--align', alignFileTxt, 
        '--overwrite', 
        '--output', outputFile
    ]);
    console.log('executedFileSync', executedFileSync.toString());   
    let audio = require('./audio.json');
    let alignedSubtitle = require('./ni.json');
    let aligned = getAlignedSubtitle(audio, alignedSubtitle);
    console.log('aligned', aligned);
    expect(aligned).toBeDefined();
});
