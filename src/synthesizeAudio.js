async function synthesizeAudio(audioFile, videoScript) {
    // let outputFile = synthesizeAudio(audioFile, videoScript);
    // let alignedSubtitle = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    let segments = alignedSubtitle.segments;

    return segments;
}

module.exports = synthesizeAudio;