let child_process = require('child_process');
function convertAudioFileMp3(audioFile) {
    let audioFileMp3 = audioFile.replace('.aac', '.mp3');
    child_process.execFileSync('ffmpeg', [
        '-i', audioFile,
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-y',
        audioFileMp3,
    ], {
        stdio: 'ignore', // 'inherit' or 'pipe' or 'ignore'
    });
    return audioFileMp3;
}

module.exports = convertAudioFileMp3;

