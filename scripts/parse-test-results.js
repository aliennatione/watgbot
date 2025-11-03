const fs = require('fs');
const xml2js = require('xml2js');

const parser = new xml2js.Parser();

fs.readFile('test-results/junit.xml', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  parser.parseString(data, (err, result) => {
    if (err) {
      console.error(err);
      return;
    }

    let md = '# Risultati dei Test\n\n';

    result.testsuites.testsuite.forEach(suite => {
      md += `## ${suite.$.name}\n\n`;
      md += '| Test | Risultato |\n';
      md += '| ---- | --------- |\n';

      suite.testcase.forEach(testcase => {
        const result = testcase.failure ? 'Fallito' : 'Superato';
        md += `| ${testcase.$.name} | ${result} |\n`;
      });

      md += '\n';
    });

    fs.writeFile('docs/test-results.md', md, err => {
      if (err) {
        console.error(err);
      }
    });
  });
});
