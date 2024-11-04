let data = {
  jobData: {
    format: 'text-with-audio',
    text: ''
  },
};
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

(async function() {
    let tJson = 't.json'
    let job = fs.readFileSync(tJson, 'utf8');
    let job1 = JSON.parse(job)[1];
    let tokens = (JSON.parse(job1).result.tokens);
    tokens = nestedMapObjects(tokens);
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
