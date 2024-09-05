let alignVideoScript = require('./alignVideoScript.js');
test('test alignment video script', () => {
    alignVideoScript(
        require('/align-input/align-1790617115.json').data.videoScript,
        '/align-input/synthesize-result-1790617115.mp3'
    );
});
