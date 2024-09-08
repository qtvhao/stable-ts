let path = require('path');
let fs = require('fs');
let child_process = require('child_process');

function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
let model = 'tiny';
let language = 'vi';
let alignOutputDir = path.join(__dirname, '..', 'align-output');

async function synthesizeAudio(audioFile, videoScript) {
    let alignTxtContent = videoScript.map(x => {
        let text = x.text.trim();
        text = text.replace(/\.$/, '') + '.';

        return text;
    }).join('\n\n');
    let djb2Hash = djb2(alignTxtContent + ' ' + model + ' ' + language);
    let outputFile = path.join(alignOutputDir, 'output-' + djb2Hash + '.json');
    if (fs.existsSync(outputFile)) {
        return outputFile;
    }
    let alignFileTxt = path.join(alignOutputDir, 'output-' + djb2Hash + '.txt');
    fs.writeFileSync(alignFileTxt, alignTxtContent);
    let stableTsArgs = [
        audioFile,
        '--model', model,
        '--language', language,
        '--align', alignFileTxt,
        '--overwrite',
        '--output', outputFile,
        '-fw',
    ];
    // console.log('stable-ts', stableTsArgs);

    child_process.execFileSync('stable-ts', stableTsArgs, {
        stdio: 'inherit',
    });
    let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    alignedSubtitle.segments = alignedSubtitle.segments.map(x => {
        delete x.words;
        delete x.tokens;
        delete x.avg_logprob;
        delete x.compression_ratio;
        delete x.no_speech_prob;
        delete x.seek;
        delete x.temperature;

        return x;
    });
    fs.writeFileSync(outputFile, JSON.stringify(alignedSubtitle, null, 2));

    return alignedSubtitle.segments;
}

module.exports = synthesizeAudio;
