let getCorrectedVideoScriptIndex = require('./getCorrectedVideoScriptIndex.js');
test('get corrected video script index', () => {
    let videoScript = require('/align-scripts/1725549160104.json')
    let segments = require('/align-segments/1725549160099.json')
    let correctedVideoScriptIndex = getCorrectedVideoScriptIndex(videoScript, segments)
    console.log('correctedVideoScriptIndex', correctedVideoScriptIndex);
});
