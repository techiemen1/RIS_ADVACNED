const bcrypt = require('bcrypt');

const password = process.argv[2]; // Pass password as command-line argument

if (!password) {
  console.error('Usage: node hash.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log(`Hashed password for "${password}":\n`);
  console.log(hash);
});
