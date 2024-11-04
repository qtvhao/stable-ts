let data = {
  jobData: {
    format: 'text-with-audio',
    text: ''
  },
};
const removeMd = require('remove-markdown');
let fs = require('fs');
function nestedMapObjects(tokens) {
    if (tokens.raw) {
        delete tokens.raw;
    }
    if (tokens.task) {
        delete tokens.task;
    }
    if (tokens.loose) {
        delete tokens.loose;
    }

    if (tokens.tokens) {
        tokens.tokens = tokens.tokens.map(nestedMapObjects);
    }
    if (tokens.items) {
        tokens.items = tokens.items.map(nestedMapObjects);
    }
    if (Array.isArray(tokens)) {
        tokens = tokens.map(nestedMapObjects);
    }

    return tokens;
}
function getTextFromListItem(list_item) {
    let text = list_item.text;
    return {
        text: removeMd(text),
    }
}
function getSegmentsOfList(token) {
    let items = token.items;
    items = items.map(getTextFromListItem);

    return items;
}

(async function() {
    let audioFile = 'synthesize-result-2532432836.aac';
    let tJson = 't.json'
    let job = fs.readFileSync(tJson, 'utf8');
    let job1 = JSON.parse(job)[1];
    let tokens = (JSON.parse(job1).result.tokens);
    tokens = nestedMapObjects(tokens);
    tokens = tokens.reduce((acc, token) => {
        if (token.type === 'space') {
            acc.push('='.repeat(251));
        }else{
            if ("list" === token.type) {
                acc = acc.concat(getSegmentsOfList(token));
            }else{
                acc.push({
                    type: (token.type),
                    text: (token.text),
                });
            }
        }
        return acc;
    }, []);

    console.log(JSON.stringify(tokens, null, 2));
    return;
    // let result =
    let response = await fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    let result = await response.json();
    console.log(result);
})();
