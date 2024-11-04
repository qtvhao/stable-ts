let data = {
  jobData: {
    format: 'text-with-audio',
    text: ''
  },
};
let fs = require('fs');

(async function() {
    let tJson = 't.json'
    let job = fs.readFileSync(tJson, 'utf8');
    let job1 = JSON.parse(job)[1];
    console.log(JSON.parse(job1));
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
