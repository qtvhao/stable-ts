async function getCorrectedVideoScriptItems(videoScript, segments) {
    return videoScript.slice(0, 2).map(x => ({
        start: 1,
        end: 2,
        text: 'test',
        aligned: [
            {
                start: 1,
                end: 2,
                text: 'test',
            }
        ]
    }));
}

module.exports = getCorrectedVideoScriptItems;
