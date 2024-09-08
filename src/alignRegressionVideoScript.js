let getAudioMp3Duration = require('./getAudioMp3Duration');
async function alignRegressionVideoScript(videoScript, audioFile) {
    let beforeCutAudioDuration = await getAudioMp3Duration(audioFile);
    

    return videoScript;
}

module.exports = alignRegressionVideoScript;
