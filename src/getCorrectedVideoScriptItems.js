async function getCorrectedVideoScriptItems(videoScript, audioFile) {
    let timestamp = 0;
    let correctedVideoScriptItems = videoScript.slice(0, 2).map(x => {
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

    return {
        correctedVideoScriptItems, 
        audioLeft: audioFile
    };
}

module.exports = getCorrectedVideoScriptItems;
