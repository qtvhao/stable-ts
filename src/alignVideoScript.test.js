let child_process = require('child_process');
let fs = require('fs');
let alignVideoScript = require('./alignVideoScript.js');
async function getAudioMp3Duration(audioMp3) {
    let stdout = await new Promise((resolve, reject) => {
        child_process.execFile('ffprobe', [
            audioMp3
        ], {
            encoding: 'utf8',
            // stdio: 'pipe'
        }, (err, stdout, stderr) => {
            // console.log('stdout', stdout);
            // console.log('stderr', stderr);
            // console.log('err', err);
            fs.writeFileSync('/align-input/ffprobe-stderr.txt', stderr.toString().trim());
            if (err) {
                reject(err);
            } else {
                resolve(stderr.toString().trim());
            }
        });
    });

    //   Duration: 00:03:20.76, start: 0.046042, bitrate: 160 kb/s
    let duration = stdout.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    let hours = parseInt(duration[1]);
    let minutes = parseInt(duration[2]);
    let seconds = parseInt(duration[3]);
    let milliseconds = parseInt(duration[4]);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

    return totalSeconds;
}
test('test alignment video script', async () => {
    let audioMp3 = '/align-input/synthesize-result-1790617115.mp3';
    let videoScript = require('/align-input/align-1790617115.json').data.videoScript;
    // 
    let audioMp3Duration = await getAudioMp3Duration(audioMp3);
    // console.log('audioMp3Duration', audioMp3Duration);
    // 00:03:20.76
    fs.writeFileSync('/align-input/logs.txt', "Quy trình lặp lại, ví dụ:\n\nTotal audio duration, Tổng cộng: " + audioMp3Duration + "s\n");
    let aligned = await alignVideoScript(
        videoScript,
        audioMp3
    );
    console.log('aligned', aligned);
});
