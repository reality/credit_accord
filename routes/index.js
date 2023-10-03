var express = require('express');
var router = express.Router();
const fs = require('fs');
const _ = require('underscore');

function loadTSV(filePath) {
	return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, 'utf8');

    let leftover = '';
    let header = null;
    let parsedData = [];

    readStream.on('data', (chunk) => {
        const data = leftover + chunk;
        const lines = data.split('\n');

        if (!header) {
            header = lines.shift().split('\t');
        }

        leftover = lines.pop();

        for (const line of lines) {
            const values = line.split('\t');
            const obj = {};
            header.forEach((key, index) => {
                obj[key] = values[index];
            });
            if(obj.orcid == 'true') {
              parsedData.push(obj);
            }
        }
    });

    readStream.on('end', () => {
        if (leftover) {
            const values = leftover.split('\t');
            const obj = {};
            header.forEach((key, index) => {
                obj[key] = values[index];
            });
            if(obj.orcid == 'true') {
              parsedData.push(obj);
            }
        }
        resolve(parsedData);
    });

    readStream.on('error', (error) => {
        reject(error);
    });
	});
}
function groupBy(array, key) {
	return array.reduce((result, currentItem) => {
		(result[currentItem[key]] = result[currentItem[key]] || []).push(currentItem);
		return result;
	}, {});
}

var classCredit;
var ontologyCredit;
loadTSV('data/credit_annotations.tsv').then(data => { classCredit = data; });
loadTSV('data/ontology_credit_annotations.tsv').then(data => { ontologyCredit = data; });
const searchORCID = (objs, orcid) => {
  return objs.filter((item, index) => item.value.match(orcid)) 
}


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Credit Accord' });
});

router.get('/view', function(req, res, next) {
  console.log(req.user)

  /*if(req.params.orcid.match(/http/)) {
    return res.redirect('/view/' + req.params.orcid.split('/').last());
  }
  const classMatches = searchORCID(classCredit, req.params.orcid);
  const ontologyMatches = searchORCID(ontologyCredit, req.params.orcid);*/
  res.render('view', { title: 'Credit Accord', ontologyMatches: groupBy(ontologyMatches, 'oid'), classMatches: groupBy(classMatches, 'oid') })
});

module.exports = router;
