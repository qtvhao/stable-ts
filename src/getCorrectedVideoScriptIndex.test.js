let getCorrectedVideoScriptIndex = require('./getCorrectedVideoScriptIndex.js');
test('get corrected video script index', () => {
    let videoScript = require('/align-input/align-1585795898.json')
    let segments = require('/align-intput/segments/1.json')
    getCorrectedVideoScriptIndex(videoScript, segments)
});
