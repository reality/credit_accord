const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const disallowedAnnotationProperties = [ '<http://purl.obolibrary.org/obo/IAO_0000115>' ]
const WORK = require('../data/work.json');
const ONT = _.groupBy(require('../data/ontologies.json'), 'id');

function processLine(parsedData, header, line) {
  const values = line.toLowerCase().split('\t');
  const obj = {};
  header.forEach((key, index) => {
      obj[key] = values[index];
  });
  if(obj.value.match('k dilla')) { console.log('hi');}
  if(!_.include(disallowedAnnotationProperties, obj.property) || obj.orcid == 'true') {
    parsedData.push(obj);
  }
}
function loadTSV(filePath) {
	return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, 'utf8');

    let leftover = '';
    let header = null;
    let parsedData = [];

    readStream.on('data', (chunk) => {
        const data = leftover + chunk;
        const lines = data.split('\n');

        if(!header) {
          header = lines.shift().split('\t');
        }

        leftover = lines.pop();

        for(const line of lines) {
          processLine(parsedData, header, line) 
        }
    });

    readStream.on('end', () => {
        if(leftover) {
          processLine(parsedData, header, line) 
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


const getProfile = (user, cb) => {
  console.log(user)
	const worksApi = `https://api.sandbox.orcid.org/v3.0/${user.orcid}/works`;
	axios.get(worksApi, {
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
	})
	.then(response => {
		return cb(response.data);
	})
	.catch(error => {
			console.error('Error fetching ORCID works:', error);
			cb(false);
	});
}

// Load dataset
var classCredit;
var ontologyCredit;
loadTSV('data/credit_annotations.tsv').then(data => { classCredit = data; console.log('Loaded class credit'); });
loadTSV('data/ontology_credit_annotations.tsv').then(data => { ontologyCredit = data; console.log('Loaded ontology credit.'); });

// Functions for searching matches/db etc
const searchValue = (objs, orcid) => {
  return objs.filter((item, index) => item.value.match(orcid)) 
}
const getMatches = (user) => {
  const orcidClassMatches = searchValue(classCredit, user.orcid).filter((i) => i.class.split('/').slice(-1)[0].split('_')[0].match(i.oid));
  const orcidOntologyMatches = searchValue(ontologyCredit, user.orcid);
  const nameClassMatches = searchValue(classCredit, user.name.toLowerCase()).filter((i) => i.class.split('/').slice(-1)[0].split('_')[0].match(i.oid));
  const nameOntologyMatches = searchValue(ontologyCredit, user.name.toLowerCase());

  return {
    orcidOntologyMatches: groupBy(orcidOntologyMatches, 'oid'),
    orcidClassMatches: groupBy(orcidClassMatches, 'oid'),
    nameOntologyMatches: groupBy(nameOntologyMatches, 'oid'), 
    nameClassMatches: groupBy(nameClassMatches, 'oid')
  } 
}

// Routes

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Credit Accord' });
});

router.get('/view', function(req, res, next) {
  if(!req.isAuthenticated()) {
    return res.redirect('/'); 
  }

  getProfile(req.user, (rv) => {
    if(!rv) { return console.log('error'); }
    
    req.user.existingOrcidUrls = _.keys(_.groupBy(rv.group[0]['work-summary'], (v) => v.url.value))
    req.user.matchedOBOOntologies = getMatches(req.user);

    console.log(req.user.matchedOBOOntologies.orcidClassMatches.ecocore)

    res.render('view', { title: 'Credit Accord', 
      data: req.user.matchedOBOOntologies,
      orcid: req.user.orcid,
      name: req.user.name
    })
  })
});

router.post('/add_entries', function(req, res, next) {
  const work = { ...WORK };
    
  console.log(work);
});

module.exports = router;
