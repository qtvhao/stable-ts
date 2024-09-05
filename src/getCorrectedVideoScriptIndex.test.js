let getCorrectedVideoScriptIndex = require('./getCorrectedVideoScriptIndex.js');
test('get corrected video script index', () => {
    let videoScript = require('/align-scripts/1725550846442.json')
    let segments = require('/align-segments/1725550846442.json')
    let correctedVideoScriptIndex = getCorrectedVideoScriptIndex(videoScript, segments)
    // console.log('correctedVideoScriptIndex', correctedVideoScriptIndex);
    // 
    let startedAt = correctedVideoScriptIndex[0].start;
    let endedAt = correctedVideoScriptIndex.slice(-1)[0].end;
    let videoDuration = endedAt - startedAt;
    if (videoDuration > 60) {
        throw new Error('videoDuration > 60');
    }
});
