let getAudioMp3Duration = require('./getAudioMp3Duration');
let fs = require('fs');
let path = require('path');
let alignInputDir = path.join(__dirname, '..', 'align-input');
let alignOutputDir = path.join(__dirname, '..', 'align-output');

async function alignRegressionVideoScript(videoScript, audioFile) {
    let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    let logsFile = path.join(alignInputDir, 'logs.txt');
    if (!fs.existsSync(logsFile)) {
        fs.writeFileSync(logsFile, '');
    }
    fs.appendFileSync(logsFile, " \n\n-> Align video script - Total sections: " + videoScript.length + "\n");
    fs.appendFileSync(logsFile, " \n" + videoScript.map(x => "| " + x.text.slice(0, 100).replace(/\n/g, ' ')).join('\n') + '\n');
    // 
    fs.appendFileSync(logsFile, "   - Before cut, audio mp3 duration: " + beforeCutAudioDuration + "s\n");
    
    return videoScript;
}

module.exports = alignRegressionVideoScript;
