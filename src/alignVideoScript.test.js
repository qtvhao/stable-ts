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
    let audioMp3 = '/align-input/synthesize-result-404133988.mp3';
    let videoScript = require('/align-input/align-404133988.json').data.videoScript;
    // 
    let audioMp3Duration = await getAudioMp3Duration(audioMp3);
    fs.writeFileSync('/align-input/logs.txt', "Quy trình lặp lại, ví dụ:\n\nTotal audio duration, Tổng cộng: " + audioMp3Duration + "s\n");
    let aligned = await alignVideoScript(
        videoScript,
        audioMp3
    );
    fs.writeFileSync('/align-output/aligned.json', JSON.stringify(aligned, null, 2));
    // must be an array
    expect(Array.isArray(aligned)).toBe(true);
    //     Your test suite must contain at least one test.
    expect(aligned.length).toBe(videoScript.length);
    console.log('aligned', aligned);
}, 180_000);
