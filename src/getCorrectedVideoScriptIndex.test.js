let getCorrectedVideoScriptIndex = require('./getCorrectedVideoScriptIndex.js');
test('get corrected video script index', () => {
    let videoScript = require('../align-scripts/1725613931535.json')
    let segments = require('../align-segments/1725613931535.json')
    let correctedVideoScriptIndex = getCorrectedVideoScriptIndex(videoScript, segments)
    console.log('correctedVideoScriptIndex', correctedVideoScriptIndex);
    // 
    let startedAt = correctedVideoScriptIndex[0].start;
    let endedAt = correctedVideoScriptIndex.slice(-1)[0].end;
    let videoDuration = endedAt - startedAt;
    // console.log('videoDuration', videoDuration);
    if (videoDuration > 100) {
        throw new Error('videoDuration > 100');
    }
});
