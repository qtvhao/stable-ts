let timestamp = 0;
async function getCorrectedVideoScriptItems(videoScript, segments) {
    return videoScript.slice(0, 2).map(x => {
        let start = timestamp;
        timestamp++;
        let end = timestamp;
        return {
            start,
            end,
            text: x.headings.join(' '),
            aligned: [
                {
                    start: 1,
                    end: 2,
                    text: x.headings.join(' '),
                }
            ]
        };
    });
}

module.exports = getCorrectedVideoScriptItems;
