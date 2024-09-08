let child_process = require('child_process');

async function getAudioMp3Duration(audioMp3) {
    let stdout = await new Promise((resolve, reject) => {
        child_process.execFile('ffprobe', [
            audioMp3
        ], {
            encoding: 'utf8',
        }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stderr.toString().trim());
            }
        });
    });

    let duration = stdout.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    let hours = parseInt(duration[1]);
    let minutes = parseInt(duration[2]);
    let seconds = parseInt(duration[3]);
    let milliseconds = parseInt(duration[4]);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

    return totalSeconds;
}

module.exports = getAudioMp3Duration;
