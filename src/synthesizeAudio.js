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
let language = 'en';
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
    let alignedSubtitle = {
        segments: []
    }
    // let outputFile = synthesizeAudio(audioFile, videoScript);
    // let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    let segments = alignedSubtitle.segments;

    return segments;
}

module.exports = synthesizeAudio;